# Build Spec: Quran Understanding App (Bangla)

> Hand this file to Claude Code (or put it in the repo as `CLAUDE.md`) and say:
> "Read this spec and build Phase 1. Ask me before anything that costs money or changes the license plan."

---

## 1. What we are building

A free, personal, offline-first PWA that helps a Bangla-speaking Muslim **understand the Quran while reciting it**.

- User: Bangladeshi, reads Bangla, can recite the Quran with some mistakes, no formal Arabic.
- Core idea: learn Arabic through **Root → Pattern → Word → Ayah**, starting from surahs recited in salah.
- Show several **Bangla translations** side by side and **tafsir in short layers**, always with the source name.
- **Zero cost:** free data, free hosting, no paid APIs, no database server.

### Non-goals
- Conversational / modern Arabic.
- Issuing rulings or original interpretations. The app never invents meaning.
- Public launch in v1 (personal use first).

---

## 2. Hard rules for the builder (Claude)

1. **Never modify Quran text, translations, or tafsir text.** Store exactly as downloaded. Tanzil, Corpus and QuranEnc terms forbid changes.
2. **Every translation/tafsir record stores `source`, `author`, `version`, `license_note`, `source_url`** and the UI shows source + author.
3. **Summaries are separate records**, never mixed into original text, and always labeled with a review status.
4. **No paid services.** If something would cost money, stop and ask.
5. **No network calls at runtime for Quran content.** All content is bundled as static JSON produced by the build script.
6. **Bangla UI.** All labels in Bangla. Arabic only for Quran text and examples.
7. **Attribution page** (`/about`) listing every source, its license, and required links (Tanzil, corpus.quran.com, QuranEnc).
8. Write no em dashes in UI copy.

---

## 3. Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) with `output: 'export'` (static) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| PWA | `next-pwa` or a hand-written service worker; cache all JSON for offline |
| Local storage | IndexedDB via Dexie (progress, review cards, notes, settings) |
| Spaced repetition | `ts-fsrs` (open-source FSRS) |
| Hosting | Vercel Hobby (free) or GitHub Pages |
| Fonts | Arabic: KFGQPC Uthmanic Hafs or Amiri Quran (open license). Bangla: Hind Siliguri or Noto Sans Bengali (Google Fonts) |
| Build scripts | Node (TypeScript via `tsx`) in `/scripts` |

Optional later: Supabase free tier for cross-device sync. Not in MVP.

---

## 4. Data sources (all free)

| Content | Source | How to get | Terms |
| --- | --- | --- | --- |
| Arabic Quran text | Tanzil | https://tanzil.net/download/ (Uthmani, txt or xml) | CC BY 3.0, no changes, credit + link tanzil.net |
| Word morphology (root, lemma, POS, verb form) | Quranic Arabic Corpus v0.4 | https://corpus.quran.com/download/ (`quranic-corpus-morphology-0.4.txt`) | GNU GPL, file not changed, credit + link corpus.quran.com |
| Bangla translation: Abu Bakr Zakaria | QuranEnc | key `bengali_zakaria` | Republish allowed, no edits, keep attribution + version |
| Bangla translation: Rowwad Center | QuranEnc | key `bengali_rwwad` | Same |
| Bangla simple tafsir: Al-Mukhtasar | QuranEnc | key `bengali_mokhtasar` | Same |
| Bangla translations: Muhiuddin Khan, Zohurul Hoque | Tanzil translations | https://tanzil.net/trans/ | Non-commercial only; link back to tanzil.net/trans/ |
| Arabic classical tafsirs (Ibn Kathir, Tabari, Qurtubi, As-Sa'di, Ibn al-Qayyim, Muyassar) | QUL by Tarteel | https://qul.tarteel.ai/resources/tafsir (json/sqlite) | Free download; personal use |
| Bangla tafsirs (Ibn Kathir, Ahsanul Bayaan, Fathul Majid, Abu Bakr Zakaria) | QUL by Tarteel | same page | Personal use only; publisher permission needed to publish |
| Recitation audio | Al Quran Cloud CDN / EveryAyah | per-ayah mp3 URLs | Free non-commercial; reciters keep rights |

**Notes for the builder**
- QuranEnc offers per-translation downloads (CSV, XML, SQLite) and an API. Verify the current API URL format on quranenc.com ("Developers' Services") before coding against it. Prefer downloading files once in the build script.
- **Open item:** a downloadable **Bangla word-by-word** meaning source. Check QUL "Word by word translation" resources for Bengali first. If none is found, fall back to the Corpus English gloss and mark Bangla word meanings as "to be filled", then ask the user.
- Record the downloaded version/date of every source in `data/sources.json`.

---

## 5. Repo structure

```
/app                  Next.js routes
  /page.tsx           Home
  /recite/[surah]     Recite Mode
  /review             Spaced repetition
  /patterns           Pattern families
  /about              Sources & licenses
/components           WordCard, AyahSheet, BottomSheet, TafsirLayers, etc.
/lib                  db.ts (Dexie), fsrs.ts, types.ts, bangla-labels.ts
/scripts
  download.ts         fetch raw sources into /raw (git-ignored)
  build-data.ts       join + transform into /public/data
  summaries/          prompt + import tool for tafsir summaries
/raw                  original downloads (not committed)
/public/data
  sources.json
  surahs.json         list of surahs (name ar/bn, ayah count)
  surah/001.json      one file per surah (see schema)
  roots.json
  patterns.json
  summaries/001.json  summaries per surah (may be empty)
```

---

## 6. Data schema (`/public/data/surah/NNN.json`)

```ts
type SurahFile = {
  surah: number;
  name_ar: string;
  name_bn: string;
  ayahs: Ayah[];
};

type Ayah = {
  n: number;                 // ayah number
  text: string;              // Tanzil Uthmani, unchanged
  words: Word[];
  translations: Translation[];
  tafsir: TafsirRef[];       // ids into tafsir records (can be ayah ranges)
};

type Word = {
  pos: number;               // position in ayah
  ar: string;                // surface form
  root?: string;             // e.g. "ع ل م"
  lemma?: string;
  tag: string;               // corpus POS tag
  pattern_id?: string;       // links to patterns.json
  meaning_bn?: string;       // Bangla word meaning (may be missing)
  gloss_en?: string;         // fallback
  segments: { text: string; role: 'root' | 'prefix' | 'suffix' | 'pattern' }[]; // for color coding
};

type Translation = {
  id: string;                // e.g. "bn_zakaria"
  author: string;
  text: string;
  source: string;
};

type TafsirRecord = {
  id: string;
  source: string;            // e.g. "Al-Mukhtasar (Bangla)"
  lang: 'bn' | 'ar' | 'en';
  from_ayah: number;
  to_ayah: number;
  text: string;              // original, unchanged
  license_note: string;
};

type Summary = {
  ayah: number;
  tafsir_source: string;     // ONE source per summary
  layer: 'essence' | 'summary' | 'lessons' | 'heart';
  text_bn: string;
  status: 'unreviewed' | 'reviewed';
  created: string;           // ISO date
};
```

`roots.json`: `{ root, meaning_bn, words: [{surah, ayah, pos, ar}] }[]`
`patterns.json`: `{ id, shape_ar, name_bn, meaning_bn, examples: string[] }[]`

### Deriving patterns from the Corpus
The Corpus gives root, lemma, POS and features such as verb form (`VF:` I to X), active participle, passive participle and verbal noun. Map these to a small starter set of patterns:

| Corpus features | Pattern | Bangla meaning |
| --- | --- | --- |
| Verb form I, perfect | فَعَلَ | সে করেছে |
| Verb form I, imperfect | يَفْعَلُ | সে করে / করবে |
| Active participle, form I | فَاعِل | যে করে (কর্তা) |
| Passive participle, form I | مَفْعُول | যার উপর করা হয়েছে |
| Verb form II | فَعَّلَ | জোর দিয়ে / বারবার করা |
| Verb form IV | أَفْعَلَ | করানো |
| Verb form X | اسْتَفْعَلَ | চাওয়া / প্রার্থনা করা |
| Adjective of intensity | فَعِيل / فَعَّال | অনেক বেশি ... (যেমন رَحِيم، غَفَّار) |

Start with these; add more later. Words with no clear pattern get no `pattern_id`. Bangla pattern names must be reviewed by the user before release.

---

## 7. Screens (Phase 1 + 2)

### Home `/`
- Today's passage card with a big **"চালিয়ে যান"** (Continue) button.
- Reviews due count.
- Progress ring: % of words in his salah surahs marked known.

### Recite Mode `/recite/[surah]`
- Arabic ayahs, large font, right-to-left.
- Bangla meaning under each word. **Support level toggle:** সব / শুধু নতুন শব্দ / কিছুই না (All / New only / None).
- Root letters colored, pattern letters muted (from `segments`).
- Play button per ayah (audio).
- Tap a word → **Word card** (bottom sheet).
- Tap ayah number → **Ayah sheet** (bottom sheet).

### Word card (bottom sheet)
- Word, Bangla meaning, root (with core meaning), pattern (with meaning).
- 3 to 5 sibling words: same root or same pattern, each with meaning.
- "রিভিউতে যোগ করুন" (Add to review).

### Ayah sheet (bottom sheet), tabs
1. **অনুবাদ (Translations):** all Bangla translations stacked, each labeled with translator. Toggle which ones show.
2. **তাফসীর (Tafsir):** layers, each with source + badge:
   - সারকথা (essence, 1 line)
   - সংক্ষেপ (summary, 3 to 5 lines)
   - শিক্ষা (lessons, 2 to 3 points)
   - অন্তরের অর্থ (heart meaning)
   - পূর্ণ তাফসীর (full original text)
   - Default layer in Phase 1 = Bangla Al-Mukhtasar shown as-is (badge: মূল উৎস).
3. **আমার নোট (My note):** text area, saved to IndexedDB.

### Review `/review` (Phase 2)
- FSRS cards. Front: Arabic word (with ayah context line). Back: meaning, root, pattern.
- Buttons: আবার / কঠিন / ভালো / সহজ (Again / Hard / Good / Easy).

### Patterns `/patterns` (Phase 2)
- List of pattern families, each with color-coded examples from the user's surahs and a 5-question quiz.

### About `/about`
- Every source, license, required links, data version dates.

---

## 8. UX rules
- Quran page is home; everything opens from a tap. Bottom sheets, not new pages.
- One-thumb use: main actions at the bottom.
- Adjustable Arabic font size; light and dark mode.
- Works fully offline after first load.
- Sessions of 10 to 15 minutes with a clear "আজকের জন্য শেষ" (done for today) state.
- Gentle streaks, no punishing resets. No ads.

---

## 9. Tafsir summaries (Phase 3)

Summaries are generated **offline in batches**, not inside the app, using AI tools the user already has. The app only reads the resulting JSON.

`/scripts/summaries/prompt.md` should contain:

```
You will receive ONE tafsir text for ONE ayah (or ayah range), with its source name.
Write in plain Bangla:
1. essence: one line
2. summary: 3 to 5 lines
3. lessons: 2 to 3 short points
4. heart: the spiritual/reflective meaning, only if the source discusses it

Rules:
- Use ONLY the provided text. Add nothing from outside it.
- Keep names of hadith narrators and scholars as the source gives them.
- Keep Quranic terms in Arabic where the source does.
- If the source does not cover a layer, return an empty string for it.
- Output JSON: {"essence":"","summary":"","lessons":[],"heart":""}
```

`/scripts/summaries/import.ts` validates the JSON and writes `public/data/summaries/NNN.json` with `status: "unreviewed"`.

Priority of sources to summarize: As-Sa'di (concise), Ibn Kathir (narration-based), Ibn al-Qayyim (heart meaning), all from Arabic originals.

Later: an "agreement view" note per ayah that cites which source says what.

In the app, a reviewed toggle lets the user mark a summary যাচাইকৃত after checking it against the original (stored locally).

---

## 10. Phases and acceptance criteria

### Phase 1: Recite with meaning (MVP)
Scope: Surah 1 (Al-Fatiha) and Surahs 105 to 114.
- [ ] `download.ts` fetches Tanzil text, Corpus morphology, QuranEnc `bengali_zakaria`, `bengali_rwwad`, `bengali_mokhtasar`
- [ ] `build-data.ts` outputs `surahs.json`, `surah/NNN.json`, `roots.json`, `patterns.json`, `sources.json` for the scoped surahs
- [ ] Word counts per ayah match between Tanzil and Corpus; script fails loudly on mismatch
- [ ] Home, Recite Mode, Word card, Ayah sheet (Translations + Al-Mukhtasar tafsir + My note) work
- [ ] Root color coding visible
- [ ] Installs as PWA and works in airplane mode
- [ ] `/about` lists all sources with links
- [ ] Lighthouse PWA and accessibility checks pass on mobile

### Phase 2: Memory engine
- [ ] Review screen with FSRS, cards created from Word card
- [ ] Patterns screen with quizzes
- [ ] Support level toggle (All / New only / None) driven by review state

### Phase 3: Deeper meaning
- [ ] Classical tafsir records loaded for scoped surahs
- [ ] Summary prompt + import script; summaries shown in layers with badges
- [ ] Reflection notes resurface in Recite Mode

### Phase 4: Recitation help
- [ ] Record an ayah, compare to qari audio
- [ ] Flag missing/wrong words where browser speech recognition supports Arabic (best effort; not a tajweed judge)

### Phase 5: Expand
- [ ] All of Juz Amma, then user-chosen surahs

### Success measures
- User can give the Bangla meaning of every ayah of Al-Fatiha and his usual salah surahs without looking.
- 80%+ of words in those surahs marked known.
- Used 5+ days a week for a month.

---

## 11. Open questions (ask the user when reached)
1. Bangla word-by-word source (see section 4).
2. Script style: Uthmani or Indopak? Indopak is more familiar in Bangladesh.
3. Which reciter for audio?
4. Who reviews summaries: the user alone, or also a local alim?

---

## 12. How to work
- Build Phase 1 first and stop for the user's feedback before Phase 2.
- Commit after each working step with clear messages.
- Keep components small and typed. No external UI kit needed beyond Tailwind.
- When a source's format or API differs from this spec, adapt the script, note it in `data/sources.json`, and tell the user.
