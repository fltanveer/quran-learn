# কুরআন বুঝে পড়ি (Quran Learn)

A personal, offline-first PWA that helps a Bangla speaker understand the Quran while reciting it.
The full spec is in [quran-app-build-spec.md](quran-app-build-spec.md). Phase 1 covers Al-Fatiha and Surahs 105 to 114.

## Commands

```bash
npm install
npm run download      # fetch raw sources into /raw (skips files that exist; add -- --force to refetch)
npm run build-data    # build /public/data from /raw; fails on Tanzil/Corpus word-count mismatch
npm run dev           # local dev server (service worker is off in dev)
npm run build         # static export to /out, then flattens Next segment files and writes out/sw.js
npm start             # serve /out locally
```

Deploy `/out` to any static host (Vercel Hobby or GitHub Pages).

## Data sources

All sources, licenses, versions and download dates are listed in `public/data/sources.json` and on `/about`.
Quran, translation and tafsir text is stored exactly as downloaded.

| Content | Source |
| --- | --- |
| Arabic text | Tanzil Uthmani 1.1 (XML, bismillah kept as a separate attribute) |
| Morphology | Quranic Arabic Corpus 0.4, from the verbatim CLTK mirror (the official page asks for an e-mail address) |
| Translations | QuranEnc `bengali_zakaria`, `bengali_rwwad`; Tanzil `bn.bengali`, `bn.hoque` |
| Tafsir | QuranEnc `bengali_mokhtasar` (Al-Mukhtasar) |
| Word by word | Quran.com API v4 (Bangla and English). QUL downloads need a login |
| Audio | EveryAyah, Mishary Alafasy 128 kbps, streamed |

## Files to review by hand

- `data/root-meanings.json`: Bangla core meaning per root. Empty until filled; the build copies values into `roots.json`.
- `data/patterns.json`: Bangla pattern names. Set `reviewed: true` after checking each one.
- `data/surah-names-bn.json`: Bangla transliterated surah names (not from a downloaded source).

## Local data

Progress, known words, review cards, notes and settings live in IndexedDB (Dexie) on the device only.
