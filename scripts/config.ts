// Shared build-script settings.

/** Phase 1 scope: Al-Fatiha and Surahs 105 to 114. */
export const SCOPED_SURAHS = [1, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];

export const RAW_DIR = 'raw';
export const OUT_DIR = 'public/data';

export const QURANENC_KEYS = ['bengali_zakaria', 'bengali_rwwad', 'bengali_mokhtasar'] as const;
export const TANZIL_TRANSLATIONS = ['bn.bengali', 'bn.hoque'] as const;

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
    `https://api.quran.com/api/v4/verses/by_chapter/${sura}?words=true&language=${lang}&word_fields=text_uthmani&per_page=300`,
  quranComChapters: 'https://api.quran.com/api/v4/chapters?language=bn',
};

export const pad3 = (n: number) => String(n).padStart(3, '0');
