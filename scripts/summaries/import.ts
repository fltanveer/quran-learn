// Reads AI answers saved as summaries-work/<slug>/<NNN>/<ayah or from-to>.json,
// validates them, and merges them into public/data/summaries/NNN.json with status "unreviewed".
// Usage: npm run summaries:import
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Summary, TafsirSource } from '../../lib/types';

type Answer = { essence: string; summary: string; lessons: string[]; heart: string };
const ROOT = 'summaries-work';
const pad3 = (n: number) => String(n).padStart(3, '0');

function validate(x: unknown, where: string): Answer {
  const o = x as Record<string, unknown>;
  const fail = (m: string) => {
    throw new Error(`${where}: ${m}`);
  };
  if (!o || typeof o !== 'object' || Array.isArray(o)) fail('not a JSON object');
  for (const k of ['essence', 'summary', 'heart']) if (typeof o[k] !== 'string') fail(`"${k}" must be a string`);
  if (!Array.isArray(o.lessons) || !o.lessons.every((l) => typeof l === 'string')) fail('"lessons" must be an array of strings');
  const extra = Object.keys(o).filter((k) => !['essence', 'summary', 'lessons', 'heart'].includes(k));
  if (extra.length) fail(`unexpected keys: ${extra.join(', ')}`);
  return o as unknown as Answer;
}

/** Accepts a bare JSON answer or one wrapped in a ```json fence. */
const parse = (text: string) => JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''));

if (!existsSync(ROOT)) {
  console.error(`No ${ROOT}/ folder. Run npm run summaries:export first.`);
  process.exit(1);
}
const names = new Map<string, string>([['bn_mokhtasar', 'আল-মুখতাসার (বাংলা)']]);
for (const t of JSON.parse(readFileSync('public/data/tafsirs.json', 'utf8')) as TafsirSource[]) names.set(t.slug, t.name);

const created = new Date().toISOString();
const bySurah = new Map<number, Summary[]>();
let files = 0;
for (const slug of readdirSync(ROOT)) {
  const sourceName = names.get(slug);
  if (!sourceName) {
    console.warn(`skip ${slug}: unknown tafsir source`);
    continue;
  }
  for (const surahDir of readdirSync(join(ROOT, slug))) {
    const s = Number(surahDir);
    for (const f of readdirSync(join(ROOT, slug, surahDir)).filter((x) => x.endsWith('.json'))) {
      const where = join(ROOT, slug, surahDir, f);
      const m = f.match(/^(\d+)(?:-(\d+))?\.json$/);
      if (!m) throw new Error(`${where}: file name must be <ayah>.json or <from>-<to>.json`);
      const a = validate(parse(readFileSync(where, 'utf8')), where);
      const from = Number(m[1]);
      const to = Number(m[2] ?? m[1]);
      const layers: [Summary['layer'], string][] = [
        ['essence', a.essence.trim()],
        ['summary', a.summary.trim()],
        ['lessons', a.lessons.map((l) => l.trim()).filter(Boolean).map((l) => `• ${l}`).join('\n')],
        ['heart', a.heart.trim()],
      ];
      const list = bySurah.get(s) ?? [];
      for (let ayah = from; ayah <= to; ayah++)
        for (const [layer, text_bn] of layers)
          if (text_bn) list.push({ ayah, tafsir_source: sourceName, layer, text_bn, status: 'unreviewed', created });
      bySurah.set(s, list);
      files++;
    }
  }
}

for (const [s, incoming] of bySurah) {
  const path = `public/data/summaries/${pad3(s)}.json`;
  const existing: Summary[] = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
  const key = (x: Summary) => `${x.ayah}|${x.tafsir_source}|${x.layer}`;
  const merged = new Map(existing.map((x) => [key(x), x]));
  // A re-import replaces text but keeps a summary marked reviewed only if its text did not change.
  for (const x of incoming) {
    const old = merged.get(key(x));
    merged.set(key(x), old && old.text_bn === x.text_bn ? old : x);
  }
  const out = [...merged.values()].sort((a, b) => a.ayah - b.ayah);
  writeFileSync(path, JSON.stringify(out, null, 1));
  console.log(`ok    ${path}: ${out.length} summaries`);
}
console.log(`imported ${files} answer file(s)`);
