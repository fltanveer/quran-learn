// Local-only storage in IndexedDB. Nothing leaves the device.
import Dexie, { type EntityTable } from 'dexie';
import type { Card } from 'ts-fsrs';

export type SupportLevel = 'all' | 'new' | 'none';
export type Theme = 'light' | 'dark' | 'system';
export type PronLevel = 'none' | 'ayah' | 'word' | 'both';

export type Settings = {
  id: 'settings';
  fontSize: number; // Arabic font size in px
  support: SupportLevel;
  pron: PronLevel;
  theme: Theme;
  hiddenTranslations: string[];
  tafsirSource: string;
  salahSurahs: number[] | null; // null: use the default list
};

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  fontSize: 34,
  support: 'all',
  pron: 'ayah',
  theme: 'system',
  hiddenTranslations: [],
  tafsirSource: 'bn_mokhtasar',
  salahSurahs: null,
};

export type Note = { id: string; surah: number; ayah: number; text: string; updated: number };
export type KnownWord = { ar: string; known: 1; updated: number };
export type ReviewCard = {
  ar: string;
  surah: number;
  ayah: number;
  pos: number;
  due: number; // epoch ms, indexed for "due" counts
  card: Card;
};
export type Progress = { id: 'last'; surah: number; ayah: number; updated: number };
export type StudyDay = { date: string; seconds: number };
export type ReviewedSummary = { id: string; reviewed: 1; updated: number };
export type PatternScore = { id: string; best: number; last: number; updated: number };

export const db = new Dexie('quran-learn') as Dexie & {
  settings: EntityTable<Settings, 'id'>;
  notes: EntityTable<Note, 'id'>;
  known: EntityTable<KnownWord, 'ar'>;
  cards: EntityTable<ReviewCard, 'ar'>;
  progress: EntityTable<Progress, 'id'>;
  days: EntityTable<StudyDay, 'date'>;
  reviewedSummaries: EntityTable<ReviewedSummary, 'id'>;
  patternScores: EntityTable<PatternScore, 'id'>;
};

db.version(1).stores({
  settings: 'id',
  notes: 'id, surah',
  known: 'ar',
  cards: 'ar, due',
  progress: 'id',
  days: 'date',
  reviewedSummaries: 'id',
});

db.version(2).stores({ patternScores: 'id' });

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await db.settings.get('settings')) ?? {}) };
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>) {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch });
}

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function addStudySeconds(seconds: number) {
  const date = todayKey();
  await db.transaction('rw', db.days, async () => {
    const row = await db.days.get(date);
    await db.days.put({ date, seconds: (row?.seconds ?? 0) + seconds });
  });
}
