// Build-time data access. Used only by server components during `next build` (static export).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Pattern, RootEntry, SourceRecord, Summary, SurahFile, SurahMeta, WordIndexEntry } from './types';

const dataDir = join(process.cwd(), 'public', 'data');
const read = <T>(p: string): T => JSON.parse(readFileSync(join(dataDir, p), 'utf8'));
const pad3 = (n: number) => String(n).padStart(3, '0');

export const getSurahList = () => read<SurahMeta[]>('surahs.json');
export const getSurah = (n: number) => read<SurahFile>(`surah/${pad3(n)}.json`);
export const getRoots = () => read<RootEntry[]>('roots.json');
export const getPatterns = () => read<Pattern[]>('patterns.json');
export const getSources = () => read<SourceRecord[]>('sources.json');
export const getSummaries = (n: number) => read<Summary[]>(`summaries/${pad3(n)}.json`);

/** Every word occurrence in scope, for the home progress ring. */
export const getAllWordForms = () =>
  getSurahList().flatMap((s) => getSurah(s.surah).ayahs.flatMap((a) => a.words.map((w) => w.ar)));

/** First occurrence of every distinct word form, with its ayah as context. */
export function getWordIndex(): WordIndexEntry[] {
  const seen = new Map<string, WordIndexEntry>();
  for (const s of getSurahList()) {
    for (const a of getSurah(s.surah).ayahs) {
      for (const w of a.words) {
        if (seen.has(w.ar)) continue;
        seen.set(w.ar, {
          ar: w.ar,
          surah: s.surah,
          ayah: a.n,
          pos: w.pos,
          meaning_bn: w.meaning_bn,
          gloss_en: w.gloss_en,
          pron_bn: w.pron_bn,
          root: w.root,
          pattern_id: w.pattern_id,
          segments: w.segments,
          context: a.words.map((x) => x.ar),
        });
      }
    }
  }
  return [...seen.values()];
}
