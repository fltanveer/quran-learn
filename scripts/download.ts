// Fetch raw sources into /raw. Files are saved exactly as served.
// Re-run with --force to download again.
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  RAW_DIR,
  SCOPED_SURAHS,
  QURANENC_KEYS,
  TANZIL_TRANSLATIONS,
  URLS,
  pad3,
} from './config';

const force = process.argv.includes('--force');
const log: { file: string; url: string; downloaded: string }[] = [];

async function fetchTo(file: string, url: string) {
  const path = join(RAW_DIR, file);
  mkdirSync(join(path, '..'), { recursive: true });
  if (existsSync(path) && !force) {
    console.log(`skip  ${file}`);
    return;
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'quran-learn-build/0.1 (personal)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = Buffer.from(await res.arrayBuffer());
      if (body.length === 0) throw new Error('empty body');
      writeFileSync(path, body);
      log.push({ file, url, downloaded: new Date().toISOString() });
      console.log(`ok    ${file} (${body.length} bytes)`);
      return;
    } catch (err) {
      console.warn(`retry ${file}: ${(err as Error).message}`);
      if (attempt === 3) throw new Error(`Failed to download ${url}: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });

  await fetchTo('tanzil-uthmani.xml', URLS.tanzilXml);
  await fetchTo('quranic-corpus-morphology-0.4.txt', URLS.corpus);
  await fetchTo('quran-com-chapters-bn.json', URLS.quranComChapters);

  for (const id of TANZIL_TRANSLATIONS) {
    await fetchTo(`tanzil-trans/${id}.txt`, URLS.tanzilTranslation(id));
  }

  for (const s of SCOPED_SURAHS) {
    for (const key of QURANENC_KEYS) {
      await fetchTo(`quranenc/${key}/${pad3(s)}.json`, URLS.quranEncSura(key, s));
    }
    for (const lang of ['bn', 'en'] as const) {
      await fetchTo(`quran-com-wbw/${lang}/${pad3(s)}.json`, URLS.quranComWords(s, lang));
    }
  }

  // Keep a log of download dates so build-data can record them in sources.json.
  const logPath = join(RAW_DIR, 'download-log.json');
  const previous: typeof log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : [];
  const merged = new Map(previous.map((e) => [e.file, e]));
  for (const e of log) merged.set(e.file, e);
  writeFileSync(logPath, JSON.stringify([...merged.values()], null, 2));
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
