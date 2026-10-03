// Extended Buckwalter transliteration used by the Quranic Arabic Corpus.
// Used only to show corpus roots and lemmas in Arabic script.
const MAP: Record<string, string> = {
  "'": 'ء', '>': 'أ', '&': 'ؤ', '<': 'إ', '}': 'ئ', A: 'ا',
  b: 'ب', p: 'ة', t: 'ت', v: 'ث', j: 'ج', H: 'ح', x: 'خ',
  d: 'د', '*': 'ذ', r: 'ر', z: 'ز', s: 'س', $: 'ش', S: 'ص',
  D: 'ض', T: 'ط', Z: 'ظ', E: 'ع', g: 'غ', _: 'ـ', f: 'ف',
  q: 'ق', k: 'ك', l: 'ل', m: 'م', n: 'ن', h: 'ه', w: 'و',
  Y: 'ى', y: 'ي', F: 'ً', N: 'ٌ', K: 'ٍ', a: 'َ', u: 'ُ',
  i: 'ِ', '~': 'ّ', o: 'ْ', '^': 'ٓ', '#': 'ٔ', '`': 'ٰ',
  '{': 'ٱ', ':': 'ۜ', '@': '۟', '"': '۠', '[': 'ۢ', ';': 'ۣ',
  ',': 'ۥ', '.': 'ۦ', '!': 'ۨ', '-': '۪', '+': '۫', '%': '۬',
  ']': 'ۭ', '|': 'آ',
};

export function toArabic(bw: string): string {
  return [...bw].map((c) => MAP[c] ?? c).join('');
}

/** Count base letters (Lo) in an Arabic string. Marks, tatweel and small letters (Lm, Mn) are skipped. */
export function baseLetterCount(ar: string): number {
  return [...ar].filter((c) => /\p{Lo}/u.test(c)).length;
}
