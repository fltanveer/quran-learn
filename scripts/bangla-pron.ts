// Rule-based Bangla pronunciation (উচ্চারণ) from Tanzil Uthmani text.
// It is an approximation for reading help, not a tajweed guide. Output is labeled as auto-generated.

type Vowel = '' | 'a' | 'i' | 'u';
type Unit = {
  kind: 'cons' | 'hamza' | 'ain' | 'wasl' | 'diph';
  c: string; // Bangla consonant (cons) or text (diph)
  v: Vowel;
  long: boolean;
  dbl: boolean;
  tan: '' | 'an' | 'in' | 'un';
  iqlab: boolean; // nun / tanween read as meem
  bare: boolean; // no mark at all (may assimilate into the next letter)
  taMarbuta: boolean;
  silent: boolean;
};

const CONS: Record<string, string> = {
  'ب': 'ব', 'ت': 'ত', 'ث': 'ছ', 'ج': 'জ', 'ح': 'হ', 'خ': 'খ', 'د': 'দ', 'ذ': 'য', 'ر': 'র',
  'ز': 'য', 'س': 'স', 'ش': 'শ', 'ص': 'স', 'ض': 'দ', 'ط': 'ত', 'ظ': 'য', 'غ': 'গ', 'ف': 'ফ',
  'ق': 'ক্ব', 'ك': 'ক', 'ل': 'ল', 'م': 'ম', 'ن': 'ন', 'ه': 'হ', 'و': 'ওয়', 'ي': 'য়', 'ى': 'য়',
  'ة': 'ত',
};
const HAMZA = 'ءأإؤئآ';
const FATHA = 'َ', KASRA = 'ِ', DAMMA = 'ُ';
const FATHATAN = 'ً', KASRATAN = 'ٍ', DAMMATAN = 'ٌ';
const SUKUN = /[ْۡ]/;
const SHADDA = 'ّ';
const DAGGER_ALIF = 'ٰ';
const SMALL_WAW = 'ۥ', SMALL_YA = 'ۦ';
const SILENT_MARK = /[۟۠]/;
const IQLAB = /[ۭۢ]/;

const SIGN: Record<Vowel, [string, string]> = { '': ['', ''], a: ['া', 'া'], i: ['ি', 'ী'], u: ['ু', 'ূ'] };
const INDEP: Record<Vowel, [string, string]> = { '': ['', ''], a: ['আ', 'আ'], i: ['ই', 'ঈ'], u: ['উ', 'ঊ'] };

function clusters(word: string): { base: string; marks: string }[] {
  const out: { base: string; marks: string }[] = [];
  for (const ch of word) {
    if (/\p{Lo}/u.test(ch) || out.length === 0) out.push({ base: ch, marks: '' });
    else out[out.length - 1].marks += ch;
  }
  return out;
}

function vowelOf(marks: string): { v: Vowel; tan: Unit['tan'] } {
  if (marks.includes(FATHATAN)) return { v: 'a', tan: 'an' };
  if (marks.includes(KASRATAN)) return { v: 'i', tan: 'in' };
  if (marks.includes(DAMMATAN)) return { v: 'u', tan: 'un' };
  if (marks.includes(FATHA)) return { v: 'a', tan: '' };
  if (marks.includes(KASRA)) return { v: 'i', tan: '' };
  if (marks.includes(DAMMA)) return { v: 'u', tan: '' };
  return { v: '', tan: '' };
}

const unit = (p: Partial<Unit>): Unit => ({
  kind: 'cons', c: '', v: '', long: false, dbl: false, tan: '', iqlab: false, bare: false,
  taMarbuta: false, silent: false, ...p,
});

/** Split one Arabic word into pronounceable units. */
export function wordUnits(word: string): Unit[] {
  const cl = clusters(word);
  const units: Unit[] = [];
  const lastSpoken = () => [...units].reverse().find((u) => !u.silent);

  cl.forEach((k, idx) => {
    const { base, marks } = k;
    if (!/\p{Lo}/u.test(base)) return;
    if (SILENT_MARK.test(marks)) return units.push(unit({ silent: true }));
    const { v, tan } = vowelOf(marks);
    const hasVowel = v !== '';
    const sukun = SUKUN.test(marks);
    const dbl = marks.includes(SHADDA);
    const long = marks.includes(DAGGER_ALIF) || marks.includes(SMALL_WAW) || marks.includes(SMALL_YA);
    const nextHasShadda = cl[idx + 1]?.marks.includes(SHADDA) ?? false;
    const prev = lastSpoken();

    if (base === 'ٱ') {
      const next = cl[idx + 1];
      let wv: Vowel = 'i';
      if (next?.base === 'ل') wv = 'a';
      else if (vowelOf(cl[idx + 2]?.marks ?? '').v === 'u') wv = 'u';
      return units.push(unit({ kind: 'wasl', v: wv }));
    }
    if (base === 'ا' && !hasVowel) {
      if (prev && prev.v === 'a' && !prev.tan) prev.long = true;
      return units.push(unit({ silent: true }));
    }
    if ((base === 'ى' || base === 'و' || base === 'ي') && !hasVowel && !dbl) {
      if (prev && !prev.tan) {
        if (base === 'ى' && prev.v) {
          prev.long = true;
          return units.push(unit({ silent: true }));
        }
        if (base === 'و' && prev.v === 'u') {
          prev.long = true;
          return units.push(unit({ silent: true }));
        }
        if (base === 'ي' && prev.v === 'i') {
          prev.long = true;
          return units.push(unit({ silent: true }));
        }
        if (prev.v === 'a' && base !== 'ى') {
          return units.push(unit({ kind: 'diph', c: base === 'و' ? 'ও' : 'ই' }));
        }
      }
      if (!sukun) return units.push(unit({ silent: true }));
    }

    const p: Partial<Unit> = { v, tan, dbl, long: long || base === 'آ', iqlab: IQLAB.test(marks) };
    if (base === 'آ') p.v = 'a';
    if (HAMZA.includes(base)) return units.push(unit({ ...p, kind: 'hamza' }));
    if (base === 'ع') return units.push(unit({ ...p, kind: 'ain' }));
    const c = CONS[base];
    if (!c) return units.push(unit({ silent: true }));
    const bare = !hasVowel && !sukun && !dbl;
    if (bare && nextHasShadda) return units.push(unit({ silent: true })); // ال + sun letter, idgham
    units.push(unit({ ...p, c, bare, taMarbuta: base === 'ة' }));
  });
  return units;
}

function doubled(c: string): string {
  if (c === 'য়') return 'য়্য';
  if (c === 'ওয়') return 'ওয়';
  return [...c][0] + '্' + c;
}

/** Render units to Bangla. `start`: the word begins an utterance. `waqf`: stop after this word. */
function render(units: Unit[], start: boolean, waqf: boolean, isAllah: boolean, carry = false): string {
  const us = units.map((u) => ({ ...u }));
  if (waqf) {
    const last = [...us].reverse().find((u) => !u.silent && u.kind !== 'wasl');
    if (last) {
      if (last.tan === 'an') {
        last.tan = '';
        last.long = true;
      } else if (last.tan) {
        last.tan = '';
        last.v = '';
      } else if (!last.long) last.v = '';
      if (last.taMarbuta) {
        last.c = 'হ';
        last.v = '';
      }
    }
  }

  let out = '';
  let prevKind: Unit['kind'] | 'none' = 'none';
  let prevVowel: Vowel = '';
  for (const u of us) {
    if (u.silent) continue;
    if (u.kind === 'wasl') {
      if (start && !out) {
        out += INDEP[u.v][0];
        prevKind = 'wasl';
        prevVowel = u.v;
      }
      continue;
    }
    const L = u.long ? 1 : 0;
    const nasal = u.tan ? (u.iqlab ? 'ম' : 'ন') : '';
    if (u.kind === 'diph') {
      out += u.c;
    } else if (u.kind === 'hamza' || u.kind === 'ain') {
      const mark = out && !out.endsWith('-') && (u.kind === 'ain' || !prevVowel) ? '’' : '';
      out += u.v ? mark + INDEP[u.v][L] + nasal : out ? '’' : '';
    } else {
      let c = u.c;
      if (u.iqlab && !u.tan && c === 'ন') c = 'ম';
      const canDouble = u.dbl && (out.length > 0 || carry);
      let body = canDouble ? doubled(c) : c;
      if (canDouble && prevKind === 'wasl' && !isAllah && c !== 'ল') body = c + '-' + c;
      if (c === 'য়' && !out) body = 'ই' + body;
      out += body + SIGN[u.v][L] + nasal;
      if (prevKind === 'wasl' && c === 'ল' && !u.v && !u.dbl) out += '-'; // আল-আলামীন
    }
    prevKind = u.kind;
    prevVowel = u.kind === 'diph' ? 'a' : u.v;
  }
  return out;
}

const isAllahWord = (w: string) => /^[ٱا]?لل[َ-ْٰ]*ه/.test(w.replace(/[ـ]/g, '')) && w.includes('ٱ');
const shortenEnd = (t: string) => t.replace(/ী$/, 'ি').replace(/ূ$/, 'ু');

/** Pronunciation of one word read on its own. */
export function wordPron(word: string, waqf: boolean): string {
  return render(wordUnits(word), true, waqf, isAllahWord(word));
}

/** Connected pronunciation of a whole ayah, with wasl and assimilation between words. */
export function ayahPron(words: string[]): string {
  const parts: string[] = [];
  const unitsList = words.map(wordUnits);
  words.forEach((w, i) => {
    const units = unitsList[i].map((u) => ({ ...u }));
    const waqf = i === words.length - 1;
    const allah = isAllahWord(w);
    if (i === 0) {
      parts.push(render(units, true, waqf, allah));
      return;
    }
    const spoken = units.filter((u) => !u.silent);
    const startsWasl = spoken[0]?.kind === 'wasl';
    const first = spoken.find((u) => u.kind !== 'wasl');
    if (startsWasl && first?.kind === 'cons' && first.c === 'ল' && first.dbl) {
      // بِسْمِ ٱللَّهِ, صِرَٰطَ ٱلَّذِينَ: join without a space, as Bangla readers expect.
      parts[parts.length - 1] = shortenEnd(parts[parts.length - 1]) + render(units, false, waqf, true, true);
      return;
    }
    if (first && first.kind === 'cons' && (first.dbl || (startsWasl && !first.v))) {
      // Sun letter, moon lam, or idgham: the first consonant closes the previous word.
      let prev = startsWasl ? shortenEnd(parts[parts.length - 1]) : parts[parts.length - 1];
      const prevUnits = unitsList[i - 1].filter((u) => !u.silent);
      const prevLast = prevUnits[prevUnits.length - 1];
      if (first.dbl && prevLast?.bare && !startsWasl) prev = prev.slice(0, -[...prevLast.c].length);
      if (first.dbl && prevLast?.tan && !startsWasl) prev = prev.replace(/[নম]$/, '');
      parts[parts.length - 1] = prev + first.c;
      if (first.dbl) first.dbl = false;
      else first.silent = true;
      const rest = render(units, false, waqf, allah);
      parts.push(rest);
      return;
    }
    parts.push(render(units, !startsWasl, waqf, allah));
  });
  // Hyphenated article (আল-) helps in word view only; in a flowing line write আলহামদু.
  return parts.filter(Boolean).join(' ').replace(/(^| )আল-/g, '$1আল');
}
