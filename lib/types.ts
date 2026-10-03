// Data shapes for /public/data. Produced by scripts/build-data.ts.

export type SegmentRole = 'root' | 'prefix' | 'suffix' | 'pattern';

export type Segment = { text: string; role: SegmentRole };

export type Word = {
  pos: number; // position in ayah, 1-based
  ar: string; // Tanzil surface form, unchanged
  after?: string; // pause marks that follow this word in Tanzil text
  root?: string; // spaced Arabic letters, e.g. "ع ل م"
  lemma?: string;
  tag: string; // corpus POS tag of the stem
  pattern_id?: string; // links to patterns.json
  meaning_bn?: string; // Bangla word meaning (quran.com word-by-word)
  gloss_en?: string; // English word meaning, fallback
  segments: Segment[]; // concatenation always equals `ar`
};

export type Translation = {
  id: string; // e.g. "bn_zakaria"
  author: string;
  text: string;
  footnotes?: string; // as provided by the source, may contain simple HTML
  source: string;
};

export type TafsirRecord = {
  id: string;
  source: string;
  author: string;
  lang: 'bn' | 'ar' | 'en';
  from_ayah: number;
  to_ayah: number;
  text: string; // original, unchanged
  license_note: string;
};

export type Ayah = {
  n: number;
  text: string; // Tanzil Uthmani, unchanged
  words: Word[];
  translations: Translation[];
  tafsir: string[]; // ids into SurahFile.tafsir_records
};

export type SurahFile = {
  surah: number;
  name_ar: string;
  name_bn: string;
  name_en: string;
  bismillah?: string; // Tanzil bismillah attribute, shown above ayah 1
  ayahs: Ayah[];
  tafsir_records: TafsirRecord[];
};

export type SurahMeta = {
  surah: number;
  name_ar: string;
  name_bn: string;
  name_en: string;
  meaning_bn: string;
  ayah_count: number;
  word_count: number;
};

export type WordRef = { surah: number; ayah: number; pos: number; ar: string; meaning_bn?: string };

export type RootEntry = {
  root: string;
  meaning_bn: string; // empty until the user fills data/root-meanings.json
  words: WordRef[];
};

export type Pattern = {
  id: string;
  shape_ar: string;
  name_bn: string;
  meaning_bn: string;
  examples: string[];
  example_words: WordRef[]; // first occurrence of each example, with meaning
  reviewed: boolean; // Bangla names need user review before release
};

export type SourceRecord = {
  id: string;
  name: string;
  author: string;
  content: string;
  version: string;
  downloaded: string;
  license: string;
  license_note: string;
  source_url: string;
  required_link?: string;
  notes?: string;
};

export type Summary = {
  ayah: number;
  tafsir_source: string;
  layer: 'essence' | 'summary' | 'lessons' | 'heart';
  text_bn: string;
  status: 'unreviewed' | 'reviewed';
  created: string;
};
