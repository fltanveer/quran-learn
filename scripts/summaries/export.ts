// Writes one input file per tafsir record, ready to paste into an AI tool together with prompt.md.
// Usage: npm run summaries:export -- <source-slug> <surah> [<surah> ...]
//   e.g. npm run summaries:export -- ar_saadi 1 112
// Save each answer (the JSON only) next to its .md file with the same name and a .json extension,
// then run npm run summaries:import.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TafsirRecord } from '../../lib/types';

const [slug, ...surahArgs] = process.argv.slice(2);
if (!slug || !surahArgs.length) {
  console.error('Usage: npm run summaries:export -- <source-slug> <surah> [<surah> ...]');
  process.exit(1);
}
const pad3 = (n: number) => String(n).padStart(3, '0');
const prompt = readFileSync('scripts/summaries/prompt.md', 'utf8').trim();

// Plain text for the AI tool. The stored tafsir text itself is not changed.
const toPlain = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h\d|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

let count = 0;
for (const arg of surahArgs) {
  const s = Number(arg);
  const file =
    slug === 'bn_mokhtasar'
      ? JSON.parse(readFileSync(`public/data/surah/${pad3(s)}.json`, 'utf8')).tafsir_records
      : JSON.parse(readFileSync(`public/data/tafsir/${slug}/${pad3(s)}.json`, 'utf8'));
  const records = file as TafsirRecord[];
  const dir = join('summaries-work', slug, pad3(s));
  mkdirSync(dir, { recursive: true });
  for (const r of records) {
    const name = r.from_ayah === r.to_ayah ? `${r.from_ayah}` : `${r.from_ayah}-${r.to_ayah}`;
    const body = [
      prompt,
      '',
      '---',
      `Source: ${r.source} (${r.author})`,
      `Surah ${s}, ayah ${name}`,
      '',
      toPlain(r.text),
    ].join('\n');
    writeFileSync(join(dir, `${name}.md`), body + '\n');
    count++;
  }
}
console.log(`wrote ${count} file(s) under summaries-work/${slug}/`);
