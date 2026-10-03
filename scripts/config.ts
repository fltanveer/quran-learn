// Shared build-script settings.
import { readFileSync } from 'node:fs';

/** Phase 5 scope: Al-Fatiha, all of Juz Amma, plus user-chosen surahs from data/scope.json. */
function loadScope(): number[] {
  const scope = JSON.parse(readFileSync('data/scope.json', 'utf8')) as { juz_amma: boolean; extra_surahs: number[] };
  const set = new Set<number>([1]);
  if (scope.juz_amma) for (let s = 78; s <= 114; s++) set.add(s);
  for (const s of scope.extra_surahs) {
    if (!Number.isInteger(s) || s < 1 || s > 114) throw new Error(`data/scope.json: bad surah number ${s}`);
    set.add(s);
  }
  return [...set].sort((a, b) => a - b);
}

export const SCOPED_SURAHS = loadScope();

/** Surahs most often recited in salah. Home progress ring defaults to these. */
export const SALAH_SURAHS = [1, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];

export const RAW_DIR = 'raw';
export const OUT_DIR = 'public/data';

export const QURANENC_KEYS = ['bengali_zakaria', 'bengali_rwwad', 'bengali_mokhtasar'] as const;
export const TANZIL_TRANSLATIONS = ['bn.bengali', 'bn.hoque'] as const;

/** Classical tafsirs from the Quran.com API (same data as QUL). Personal use. */
export const CLASSICAL_TAFSIRS = [
  { id: 91, slug: 'ar_saadi', lang: 'ar', name: 'তাফসীর আস-সা‘দী (আরবি)', author: 'আব্দুর রহমান আস-সা‘দী' },
  { id: 14, slug: 'ar_ibn_kathir', lang: 'ar', name: 'তাফসীর ইবনে কাসীর (আরবি)', author: 'হাফিয ইবনে কাসীর' },
  { id: 16, slug: 'ar_muyassar', lang: 'ar', name: 'আত-তাফসীর আল-মুয়াসসার (আরবি)', author: 'বাদশাহ ফাহাদ কুরআন মুদ্রণ কমপ্লেক্স' },
  { id: 15, slug: 'ar_tabari', lang: 'ar', name: 'তাফসীর আত-তাবারী (আরবি)', author: 'ইবনে জারীর আত-তাবারী' },
  { id: 90, slug: 'ar_qurtubi', lang: 'ar', name: 'তাফসীর আল-কুরতুবী (আরবি)', author: 'আল-কুরতুবী' },
  { id: 94, slug: 'ar_baghawi', lang: 'ar', name: 'তাফসীর আল-বাগাভী (আরবি)', author: 'আল-বাগাভী' },
  { id: 164, slug: 'bn_ibn_kathir', lang: 'bn', name: 'তাফসীর ইবনে কাসীর (বাংলা)', author: 'তাওহীদ পাবলিকেশন্স' },
  { id: 165, slug: 'bn_ahsanul_bayaan', lang: 'bn', name: 'তাফসীর আহসানুল বায়ান (বাংলা)', author: 'বায়ান ফাউন্ডেশন' },
  { id: 166, slug: 'bn_zakaria', lang: 'bn', name: 'তাফসীর আবু বকর যাকারিয়া (বাংলা)', author: 'বাদশাহ ফাহাদ কুরআন মুদ্রণ কমপ্লেক্স' },
  { id: 381, slug: 'bn_fathul_majid', lang: 'bn', name: 'তাফসীর ফাতহুল মাজীদ (বাংলা)', author: 'আব্দুর রহমান ইবনে হাসান আলুশ শাইখ' },
] as const;

export const URLS = {
  tanzilXml:
    'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=xml&marks=true&sajdah=true&alef=true&tatweel=true&agree=true',
  // Verbatim mirror of corpus.quran.com/download (the official page asks for an e-mail address).
  corpus:
    'https://raw.githubusercontent.com/cltk/arabic_morphology_quranic-corpus/master/quranic-corpus-morphology-0.4.txt',
  tanzilTranslation: (id: string) => `https://tanzil.net/trans/?transID=${id}&type=txt-2`,
  quranEncSura: (key: string, sura: number) =>
    `https://quranenc.com/api/v1/translation/sura/${key}/${sura}`,
  quranComWords: (sura: number, lang: 'bn' | 'en') =>
    `https://api.quran.com/api/v4/verses/by_chapter/${sura}?words=true&language=${lang}&word_fields=text_uthmani&per_page=50`,
  quranComChapters: 'https://api.quran.com/api/v4/chapters?language=bn',
  quranComTafsir: (id: number, sura: number, page: number) =>
    `https://api.quran.com/api/v4/tafsirs/${id}/by_chapter/${sura}?per_page=50&page=${page}`,
};

export const pad3 = (n: number) => String(n).padStart(3, '0');
