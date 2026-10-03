// Compare a speech-recognition transcript with the ayah words. Best effort only.

/** Strip diacritics, Quranic marks and letter variants so recognizer output can match Uthmani text. */
export function normalizeArabic(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/[^ء-ي\s]/g, '')
    .trim();
}

// Uthmani spelling drops some alifs the recognizer writes (e.g. ٱلرَّحْمَٰن vs الرحمان). Ignore alif for matching.
const skeleton = (w: string) => normalizeArabic(w).replace(/ا/g, '').replace(/ء/g, '');

export type WordResult = { pos: number; status: 'ok' | 'missing' };

/** Align heard words to ayah words (longest common subsequence on letter skeletons). */
export function matchWords(ayahWords: string[], heard: string): { words: WordResult[]; extra: string[] } {
  const a = ayahWords.map(skeleton);
  const h = normalizeArabic(heard).split(/\s+/).filter(Boolean);
  const hs = h.map(skeleton);
  const close = (x: string, y: string) => x === y || (x.length > 3 && y.length > 3 && (x.includes(y) || y.includes(x)));

  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(hs.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = hs.length - 1; j >= 0; j--)
      dp[i][j] = close(a[i], hs[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const words: WordResult[] = ayahWords.map((_, i) => ({ pos: i + 1, status: 'missing' }));
  const used = new Set<number>();
  for (let i = 0, j = 0; i < a.length && j < hs.length; ) {
    if (close(a[i], hs[j])) {
      words[i].status = 'ok';
      used.add(j);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return { words, extra: h.filter((_, j) => !used.has(j)) };
}
