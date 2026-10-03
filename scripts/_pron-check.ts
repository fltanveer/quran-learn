// Dev aid: print generated pronunciation for review.
import { readFileSync } from 'node:fs';
import { ayahPron, wordPron } from './bangla-pron';

const list = process.argv.slice(2).length ? process.argv.slice(2) : ['001', '112', '113', '114', '105', '108'];
for (const s of list) {
  const f = JSON.parse(readFileSync(`public/data/surah/${s}.json`, 'utf8'));
  if (f.bismillah) console.log('B  ', ayahPron(f.bismillah.split(' ')));
  for (const a of f.ayahs) {
    const ws: string[] = a.words.map((w: { ar: string }) => w.ar);
    console.log(`${s}:${a.n}`, ayahPron(ws), ' || ', ws.map((w, i) => wordPron(w, i === ws.length - 1)).join(' · '));
  }
}
