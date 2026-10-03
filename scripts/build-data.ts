// Join raw sources into /public/data. Quran, translation and tafsir text is copied unchanged.
// Fails loudly when Tanzil and Corpus word counts disagree.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_DIR, RAW_DIR, SCOPED_SURAHS, pad3 } from './config';
import { baseLetterCount, toArabic } from './buckwalter';
import { ayahPron, wordPron } from './bangla-pron';
import type {
  Ayah,
  Pattern,
  RootEntry,
  Segment,
  SourceRecord,
  SurahFile,
  SurahMeta,
  TafsirRecord,
  Translation,
  Word,
  WordRef,
} from '../lib/types';

const raw = (p: string) => readFileSync(join(RAW_DIR, p), 'utf8');
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p: string, data: unknown) => {
  const full = join(OUT_DIR, p);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, JSON.stringify(data));
};

const errors: string[] = [];
const warnings: string[] = [];

// ---------- Tanzil Quran text ----------

type TanzilAyah = { text: string; bismillah?: string };
function parseTanzil(): { suras: Map<number, { name: string; ayahs: TanzilAyah[] }>; notice: string } {
  const xml = raw('tanzil-uthmani.xml');
  const suras = new Map<number, { name: string; ayahs: TanzilAyah[] }>();
  const suraRe = /<sura index="(\d+)" name="([^"]*)">([\s\S]*?)<\/sura>/g;
  const ayaRe = /<aya index="(\d+)" text="([^"]*)"(?: bismillah="([^"]*)")?\s*\/>/g;
  for (const m of xml.matchAll(suraRe)) {
    const ayahs: TanzilAyah[] = [];
    for (const a of m[3].matchAll(ayaRe)) ayahs[Number(a[1]) - 1] = { text: a[2], bismillah: a[3] };
    suras.set(Number(m[1]), { name: m[2], ayahs });
  }
  const notice = (xml.match(/<!--([\s\S]*?)-->/g) ?? []).map((c) => c.slice(4, -3).trim()).join('\n');
  return { suras, notice };
}

// Pause marks and other standalone symbols are space separated in Tanzil text. They are not words.
const isMarkToken = (t: string) => /^[ۖ-ۭ۞۩]+$/u.test(t);

function tokenize(text: string): { word: string; after?: string }[] {
  const out: { word: string; after?: string }[] = [];
  for (const tok of text.split(' ')) {
    if (!tok) continue;
    if (isMarkToken(tok) && out.length) {
      const last = out[out.length - 1];
      last.after = last.after ? `${last.after} ${tok}` : tok;
    } else out.push({ word: tok });
  }
  return out;
}

// ---------- Corpus morphology ----------

type CorpusSeg = { form: string; tag: string; features: string[] };
function parseCorpus(): { words: Map<string, CorpusSeg[]>; notice: string } {
  const text = raw('quranic-corpus-morphology-0.4.txt');
  const words = new Map<string, CorpusSeg[]>();
  const noticeLines: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('#')) {
      noticeLines.push(line.replace(/^#\s?/, ''));
      continue;
    }
    const m = line.match(/^\((\d+):(\d+):(\d+):(\d+)\)\t([^\t]*)\t([^\t]*)\t(.*)$/);
    if (!m) continue;
    const key = `${m[1]}:${m[2]}:${m[3]}`;
    const list = words.get(key) ?? [];
    list[Number(m[4]) - 1] = { form: m[5], tag: m[6], features: m[7].split('|') };
    words.set(key, list);
  }
  return { words, notice: noticeLines.join('\n').trim() };
}

const feature = (seg: CorpusSeg, name: string) =>
  seg.features.find((f) => f.startsWith(`${name}:`))?.slice(name.length + 1);
const verbForm = (seg: CorpusSeg) => seg.features.find((f) => /^\([IVX]+\)$/.test(f))?.slice(1, -1);

// ---------- Segments: split the Tanzil word by corpus segment, then mark root letters ----------

function clusters(word: string): string[] {
  const out: string[] = [];
  for (const ch of word) {
    if (/\p{Lo}/u.test(ch) || out.length === 0) out.push(ch);
    else out[out.length - 1] += ch;
  }
  return out;
}

const HAMZA_ALIF = 'ءأإؤئآٱا';
function norm(ch: string): string {
  const base = [...ch].find((c) => /\p{Lo}/u.test(c)) ?? ch;
  if (HAMZA_ALIF.includes(base)) return 'ء';
  if (base === 'ى') return 'ي';
  return base;
}

function buildSegments(ar: string, segs: CorpusSeg[], rootBw?: string): Segment[] | null {
  const cl = clusters(ar);
  const counts = segs.map((s) => baseLetterCount(toArabic(s.form)));
  const total = counts.reduce((a, b) => a + b, 0);
  if (total !== cl.length) return null;

  const rootLetters = rootBw ? [...toArabic(rootBw)].map(norm) : [];
  const roles: Segment['role'][] = [];
  let i = 0;
  segs.forEach((seg, si) => {
    const kind = seg.features[0];
    const n = counts[si];
    if (kind === 'PREFIX' || kind === 'SUFFIX') {
      for (let k = 0; k < n; k++) roles.push(kind === 'PREFIX' ? 'prefix' : 'suffix');
    } else {
      const stemRoles: Segment['role'][] = Array(n).fill('pattern');
      let from = 0;
      for (const r of rootLetters) {
        for (let k = from; k < n; k++) {
          if (norm(cl[i + k]) === r) {
            stemRoles[k] = 'root';
            from = k + 1;
            break;
          }
        }
      }
      roles.push(...stemRoles);
    }
    i += n;
  });

  const out: Segment[] = [];
  cl.forEach((c, k) => {
    const last = out[out.length - 1];
    if (last && last.role === roles[k]) last.text += c;
    else out.push({ text: c, role: roles[k] });
  });
  return out;
}

// ---------- Patterns ----------

function patternFor(stem: CorpusSeg): string | undefined {
  const f = stem.features;
  const form = verbForm(stem);
  const has = (x: string) => f.includes(x);
  if (stem.tag === 'V') {
    if (has('PASS')) return undefined;
    if (!form && has('PERF')) return 'f1_perf';
    if (!form && has('IMPF')) return 'f1_impf';
    if (form === 'II') return 'f2';
    if (form === 'IV') return 'f4';
    if (form === 'X') return 'f10';
    return undefined;
  }
  if (has('PCPL') && !form) {
    if (has('ACT')) return 'f1_active';
    if (has('PASS')) return 'f1_passive';
  }
  const lemma = feature(stem, 'LEM');
  const root = feature(stem, 'ROOT');
  if (stem.tag === 'ADJ' && lemma && root && root.length === 3) {
    const [a, b, c] = root.replace(/A/g, '[>A<\']').match(/\[[^\]]+\]|./g)!;
    const faeel = new RegExp(`^${a}~?a${b}iy${c}$`);
    const faaal = new RegExp(`^${a}~?a${b}~aA${c}$`);
    if (faeel.test(lemma) || faaal.test(lemma)) return 'intensive';
  }
  return undefined;
}

// ---------- Translations and tafsir ----------

function parseTanzilTranslation(id: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of raw(`tanzil-trans/${id}.txt`).split(/\r?\n/)) {
    const m = line.match(/^(\d+)\|(\d+)\|(.*)$/);
    if (m) map.set(`${m[1]}:${m[2]}`, m[3]);
  }
  return map;
}

type QeRow = { sura: string; aya: string; translation: string; footnotes: string | null };
const quranEnc = (key: string, s: number) =>
  readJson<{ result: QeRow[] }>(join(RAW_DIR, `quranenc/${key}/${pad3(s)}.json`)).result;

type QcWord = { char_type_name: string; translation: { text: string } };
type QcVerse = { verse_number: number; words: QcWord[] };
const quranComWords = (lang: 'bn' | 'en', s: number) =>
  readJson<{ verses: QcVerse[] }>(join(RAW_DIR, `quran-com-wbw/${lang}/${pad3(s)}.json`)).verses;

// ---------- Download dates ----------

const downloadLog: { file: string; downloaded: string }[] = existsSync(join(RAW_DIR, 'download-log.json'))
  ? readJson(join(RAW_DIR, 'download-log.json'))
  : [];
function downloadedOn(file: string): string {
  const entry = downloadLog.find((e) => e.file === file || e.file.startsWith(file));
  const iso = entry?.downloaded ?? statSync(join(RAW_DIR, file)).mtime.toISOString();
  return iso.slice(0, 10);
}

// ---------- Main ----------

const QE_META = {
  bengali_zakaria: { id: 'bn_zakaria', author: 'ড. আবু বকর মুহাম্মাদ যাকারিয়া', source: 'QuranEnc.com' },
  bengali_rwwad: { id: 'bn_rwwad', author: 'রুওয়াদ অনুবাদ কেন্দ্র', source: 'QuranEnc.com' },
} as const;
const TANZIL_TR_META = {
  'bn.bengali': { id: 'bn_muhiuddin', author: 'মুহিউদ্দীন খান', source: 'Tanzil.net' },
  'bn.hoque': { id: 'bn_hoque', author: 'জহুরুল হক', source: 'Tanzil.net' },
} as const;

function main() {
  const { suras, notice: tanzilNotice } = parseTanzil();
  const { words: corpus, notice: corpusNotice } = parseCorpus();
  const namesBn = readJson<Record<string, string>>('data/surah-names-bn.json');
  const chapters = readJson<{ chapters: { id: number; name_simple: string; translated_name: { name: string } }[] }>(
    join(RAW_DIR, 'quran-com-chapters-bn.json'),
  ).chapters;
  const tanzilTr = Object.fromEntries(
    Object.keys(TANZIL_TR_META).map((id) => [id, parseTanzilTranslation(id)]),
  );
  const patternDefs = readJson<{ patterns: Omit<Pattern, 'examples'>[] }>('data/patterns.json').patterns;
  const patternExamples = new Map<string, Map<string, WordRef>>(patternDefs.map((p) => [p.id, new Map()]));
  const roots = new Map<string, RootEntry['words']>();

  const surahList: SurahMeta[] = [];
  const notice =
    'Quran text: Tanzil Project (tanzil.net), CC BY 3.0, unchanged. Morphology: Quranic Arabic Corpus (corpus.quran.com), GNU GPL. See /about for all sources.';

  for (const s of SCOPED_SURAHS) {
    const tz = suras.get(s);
    if (!tz) throw new Error(`Tanzil surah ${s} missing`);
    const qe = Object.fromEntries(
      (['bengali_zakaria', 'bengali_rwwad', 'bengali_mokhtasar'] as const).map((k) => [k, quranEnc(k, s)]),
    );
    const wbwBn = quranComWords('bn', s);
    const wbwEn = quranComWords('en', s);
    const chapter = chapters.find((c) => c.id === s)!;
    const tafsirRecords: TafsirRecord[] = [];
    let wordCount = 0;

    const ayahs: Ayah[] = tz.ayahs.map((ta, idx) => {
      const n = idx + 1;
      const tokens = tokenize(ta.text);
      const corpusCount = [...corpus.keys()].filter((k) => k.startsWith(`${s}:${n}:`)).length;
      if (corpusCount !== tokens.length) {
        errors.push(`Word count mismatch ${s}:${n}: Tanzil ${tokens.length}, Corpus ${corpusCount}`);
      }
      const bnWords = wbwBn.find((v) => v.verse_number === n)?.words.filter((w) => w.char_type_name === 'word') ?? [];
      const enWords = wbwEn.find((v) => v.verse_number === n)?.words.filter((w) => w.char_type_name === 'word') ?? [];
      if (bnWords.length !== tokens.length) {
        warnings.push(`Word-by-word count differs at ${s}:${n} (${bnWords.length} vs ${tokens.length}); meanings skipped`);
      }

      const sameCountBn = bnWords.length === tokens.length;
      const words: Word[] = tokens.map((tok, wi) => {
        const pos = wi + 1;
        const segs = corpus.get(`${s}:${n}:${pos}`) ?? [];
        const stem = segs.find((g) => g.features[0] === 'STEM') ?? segs[0];
        const rootBw = stem ? feature(stem, 'ROOT') : undefined;
        const lemmaBw = stem ? feature(stem, 'LEM') : undefined;
        const root = rootBw ? [...toArabic(rootBw)].join(' ') : undefined;
        const pattern_id = stem ? patternFor(stem) : undefined;
        const aligned = segs.length ? buildSegments(tok.word, segs, rootBw) : null;
        if (!aligned) warnings.push(`Segment alignment fallback at ${s}:${n}:${pos}`);
        const segments: Segment[] = aligned ?? [{ text: tok.word, role: 'pattern' }];
        if (root) {
          const list = roots.get(root) ?? [];
          list.push({ surah: s, ayah: n, pos, ar: tok.word, meaning_bn: sameCountBn ? bnWords[wi]?.translation.text : undefined });
          roots.set(root, list);
        }
        const ex = pattern_id ? patternExamples.get(pattern_id) : undefined;
        if (ex && !ex.has(tok.word)) {
          ex.set(tok.word, { surah: s, ayah: n, pos, ar: tok.word, meaning_bn: sameCountBn ? bnWords[wi]?.translation.text : undefined });
        }
        const w: Word = {
          pos,
          ar: tok.word,
          tag: stem?.tag ?? '',
          pron_bn: wordPron(tok.word, wi === tokens.length - 1),
          segments,
        };
        if (tok.after) w.after = tok.after;
        if (root) w.root = root;
        if (lemmaBw) w.lemma = toArabic(lemmaBw);
        if (pattern_id) w.pattern_id = pattern_id;
        if (sameCountBn && bnWords[wi]?.translation.text) w.meaning_bn = bnWords[wi].translation.text;
        if (enWords.length === tokens.length && enWords[wi]?.translation.text) w.gloss_en = enWords[wi].translation.text;
        return w;
      });
      wordCount += words.length;

      const translations: Translation[] = [];
      for (const key of ['bengali_zakaria', 'bengali_rwwad'] as const) {
        const row = qe[key].find((r) => Number(r.aya) === n);
        if (!row) {
          errors.push(`${key} missing ${s}:${n}`);
          continue;
        }
        const t: Translation = { ...QE_META[key], text: row.translation };
        if (row.footnotes) t.footnotes = row.footnotes;
        translations.push(t);
      }
      for (const [id, meta] of Object.entries(TANZIL_TR_META)) {
        const text = tanzilTr[id].get(`${s}:${n}`);
        if (text === undefined) errors.push(`${id} missing ${s}:${n}`);
        else translations.push({ ...meta, text });
      }

      const tafsirIds: string[] = [];
      const mk = qe.bengali_mokhtasar.find((r) => Number(r.aya) === n);
      if (mk) {
        const id = `bn_mokhtasar_${s}_${n}`;
        tafsirRecords.push({
          id,
          source: 'আল-মুখতাসার ফী তাফসীরিল কুরআনিল কারীম (বাংলা)',
          author: 'তাফসীর বিষয়ক গবেষণা কেন্দ্র',
          lang: 'bn',
          from_ayah: n,
          to_ayah: n,
          text: mk.footnotes ? `${mk.translation}\n\n${mk.footnotes}` : mk.translation,
          license_note: 'QuranEnc.com: পরিবর্তন ছাড়া প্রকাশের অনুমতি, উৎস ও সংস্করণ উল্লেখ বাধ্যতামূলক।',
        });
        tafsirIds.push(id);
      } else errors.push(`bengali_mokhtasar missing ${s}:${n}`);

      const pron_bn = ayahPron(tokens.map((t) => t.word));
      return { n, text: ta.text, pron_bn, words, translations, tafsir: tafsirIds };
    });

    const file: SurahFile & { notice: string } = {
      notice,
      surah: s,
      name_ar: tz.name,
      name_bn: namesBn[String(s)] ?? chapter.name_simple,
      name_en: chapter.name_simple,
      ...(tz.ayahs[0].bismillah
        ? { bismillah: tz.ayahs[0].bismillah, bismillah_pron_bn: ayahPron(tokenize(tz.ayahs[0].bismillah).map((t) => t.word)) }
        : {}),
      ayahs,
      tafsir_records: tafsirRecords,
    };
    writeJson(`surah/${pad3(s)}.json`, file);
    if (!existsSync(join(OUT_DIR, `summaries/${pad3(s)}.json`))) writeJson(`summaries/${pad3(s)}.json`, []);

    surahList.push({
      surah: s,
      name_ar: tz.name,
      name_bn: file.name_bn,
      name_en: chapter.name_simple,
      meaning_bn: chapter.translated_name.name,
      ayah_count: ayahs.length,
      word_count: wordCount,
    });
  }

  // Root meanings are filled by the user in data/root-meanings.json. Keep existing values, add new roots.
  const rootMeaningsPath = 'data/root-meanings.json';
  const rootMeanings: Record<string, string> = existsSync(rootMeaningsPath) ? readJson(rootMeaningsPath) : {};
  for (const r of [...roots.keys()].sort()) if (!(r in rootMeanings)) rootMeanings[r] = '';
  writeFileSync(rootMeaningsPath, JSON.stringify(rootMeanings, null, 2) + '\n');

  const rootsOut: RootEntry[] = [...roots.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([root, words]) => ({ root, meaning_bn: rootMeanings[root] ?? '', words }));

  const patternsOut: Pattern[] = patternDefs.map((p) => {
    const ex = [...(patternExamples.get(p.id)?.values() ?? [])].slice(0, 8);
    return { ...p, examples: ex.map((w) => w.ar), example_words: ex };
  });

  writeJson('surahs.json', surahList);
  writeJson('roots.json', rootsOut);
  writeJson('patterns.json', patternsOut);
  writeJson('sources.json', buildSources(tanzilNotice, corpusNotice));

  for (const w of warnings) console.warn(`warn  ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`ERROR ${e}`);
    throw new Error(`${errors.length} data error(s). Output is not trustworthy.`);
  }
  const words = surahList.reduce((a, b) => a + b.word_count, 0);
  console.log(`ok    ${surahList.length} surahs, ${words} words, ${rootsOut.length} roots`);
}

function buildSources(tanzilNotice: string, corpusNotice: string): SourceRecord[] {
  const qeNote =
    'Republishing allowed without any change to the text. Attribution and version must be kept. Notes go to QuranEnc.com.';
  return [
    {
      id: 'tanzil_uthmani',
      name: 'Tanzil Quran Text (Uthmani)',
      author: 'Tanzil Project',
      content: 'আরবি কুরআনের পাঠ',
      version: tanzilNotice.match(/Version [\d.]+/)?.[0] ?? 'unknown',
      downloaded: downloadedOn('tanzil-uthmani.xml'),
      license: 'Creative Commons Attribution 3.0',
      license_note: tanzilNotice,
      source_url: 'https://tanzil.net/download/',
      required_link: 'https://tanzil.net',
    },
    {
      id: 'quranic_corpus',
      name: 'Quranic Arabic Corpus (morphology)',
      author: 'Kais Dukes',
      content: 'শব্দের মূল (root), লেমা, পদ ও রূপ',
      version: '0.4',
      downloaded: downloadedOn('quranic-corpus-morphology-0.4.txt'),
      license: 'GNU General Public License',
      license_note: corpusNotice,
      source_url: 'https://corpus.quran.com/download/',
      required_link: 'https://corpus.quran.com',
      notes:
        'Downloaded from the verbatim CLTK mirror (github.com/cltk/arabic_morphology_quranic-corpus) because the official page asks for an e-mail address. File not changed.',
    },
    {
      id: 'bn_zakaria',
      name: 'Bengali Translation: Dr. Abu Bakr Muhammad Zakaria',
      author: 'ড. আবু বকর মুহাম্মাদ যাকারিয়া',
      content: 'বাংলা অনুবাদ ও টীকা',
      version: 'not published by the QuranEnc API (key bengali_zakaria)',
      downloaded: downloadedOn('quranenc/bengali_zakaria'),
      license: 'QuranEnc terms',
      license_note: qeNote,
      source_url: 'https://quranenc.com/en/browse/bengali_zakaria',
      required_link: 'https://quranenc.com',
    },
    {
      id: 'bn_rwwad',
      name: 'Bengali Translation: Rowwad Translation Center',
      author: 'রুওয়াদ অনুবাদ কেন্দ্র',
      content: 'বাংলা অনুবাদ',
      version: 'not published by the QuranEnc API (key bengali_rwwad)',
      downloaded: downloadedOn('quranenc/bengali_rwwad'),
      license: 'QuranEnc terms',
      license_note: qeNote,
      source_url: 'https://quranenc.com/en/browse/bengali_rwwad',
      required_link: 'https://quranenc.com',
    },
    {
      id: 'bn_mokhtasar',
      name: 'Al-Mukhtasar in Interpreting the Noble Quran (Bengali)',
      author: 'তাফসীর বিষয়ক গবেষণা কেন্দ্র',
      content: 'সংক্ষিপ্ত তাফসীর',
      version: 'not published by the QuranEnc API (key bengali_mokhtasar)',
      downloaded: downloadedOn('quranenc/bengali_mokhtasar'),
      license: 'QuranEnc terms',
      license_note: qeNote,
      source_url: 'https://quranenc.com/en/browse/bengali_mokhtasar',
      required_link: 'https://quranenc.com',
    },
    {
      id: 'bn_muhiuddin',
      name: 'Bengali Translation: Muhiuddin Khan (bn.bengali)',
      author: 'মুহিউদ্দীন খান',
      content: 'বাংলা অনুবাদ',
      version: 'Last Update: April 30, 2011',
      downloaded: downloadedOn('tanzil-trans/bn.bengali.txt'),
      license: 'Tanzil translations: non-commercial use only',
      license_note: 'Non-commercial use only. Link back to tanzil.net/trans/.',
      source_url: 'https://tanzil.net/trans/',
      required_link: 'https://tanzil.net/trans/',
    },
    {
      id: 'bn_hoque',
      name: 'Bengali Translation: Zohurul Hoque (bn.hoque)',
      author: 'জহুরুল হক',
      content: 'বাংলা অনুবাদ',
      version: 'Last Update: July 19, 2013',
      downloaded: downloadedOn('tanzil-trans/bn.hoque.txt'),
      license: 'Tanzil translations: non-commercial use only',
      license_note: 'Non-commercial use only. Link back to tanzil.net/trans/.',
      source_url: 'https://tanzil.net/trans/',
      required_link: 'https://tanzil.net/trans/',
    },
    {
      id: 'quran_com_wbw',
      name: 'Word by word meanings (Bengali and English)',
      author: 'Quran.com / Quran Foundation',
      content: 'শব্দে শব্দে অর্থ',
      version: 'API v4',
      downloaded: downloadedOn('quran-com-wbw'),
      license: 'Free for personal, non-commercial use',
      license_note:
        'Same word-by-word data family as QUL "Bengali wbw translation" (QUL downloads need a login). Personal use only.',
      source_url: 'https://api.quran.com/api/v4',
      required_link: 'https://quran.com',
    },
    {
      id: 'bn_pronunciation',
      name: 'Bangla pronunciation (উচ্চারণ)',
      author: 'এই অ্যাপ (নিয়মভিত্তিক স্বয়ংক্রিয় রূপান্তর)',
      content: 'বাংলা উচ্চারণ',
      version: 'scripts/bangla-pron.ts',
      downloaded: 'generated at build',
      license: 'Generated from Tanzil text; no Quran text is changed',
      license_note:
        'No free Bangla transliteration source was found (QUL and Quran.com offer English only). Pronunciation is generated by rules from the Arabic text. It is approximate and not a tajweed guide. Needs review.',
      source_url: 'https://tanzil.net',
    },
    {
      id: 'audio_alafasy',
      name: 'Recitation: Mishary Rashid Alafasy (128 kbps)',
      author: 'মিশারি রাশিদ আল-আফাসি',
      content: 'আয়াত ভিত্তিক তিলাওয়াত (অনলাইন থেকে চালানো হয়, একবার শুনলে অফলাইনে থাকে)',
      version: 'Alafasy_128kbps',
      downloaded: 'streamed at runtime',
      license: 'Free for non-commercial use; reciter keeps rights',
      license_note: 'Audio files are not bundled. They are streamed from EveryAyah and cached after first play.',
      source_url: 'https://everyayah.com/data/Alafasy_128kbps/',
      required_link: 'https://everyayah.com',
    },
  ];
}

main();
