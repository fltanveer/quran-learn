// Build-time data access. Used only by server components during `next build` (static export).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Pattern, RootEntry, SourceRecord, Summary, SurahFile, SurahMeta } from './types';

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
