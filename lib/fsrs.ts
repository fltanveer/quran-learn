// Spaced repetition with ts-fsrs. Cards live in IndexedDB, one per word form.
import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';
import { db, type ReviewCard } from './db';

export const scheduler = fsrs();

/** A word counts as known once FSRS expects to remember it for a week or more. */
export const KNOWN_STABILITY_DAYS = 7;
export const isKnownCard = (card: Card) => card.state === State.Review && card.stability >= KNOWN_STABILITY_DAYS;

type WordLike = { ar: string; pos: number };

export async function addToReview(word: WordLike, surah: number, ayah: number) {
  const existing = await db.cards.get(word.ar);
  if (existing) return existing;
  const card = createEmptyCard(new Date());
  const row: ReviewCard = { ar: word.ar, surah, ayah, pos: word.pos, due: card.due.getTime(), card };
  await db.cards.put(row);
  return row;
}

/** Adds many words at once, skipping words that already have a card. Returns how many were added. */
export async function addManyToReview(words: (WordLike & { surah: number; ayah: number })[]) {
  const existing = new Set(await db.cards.toCollection().primaryKeys());
  const now = new Date();
  const rows: ReviewCard[] = words
    .filter((w) => !existing.has(w.ar))
    .map((w) => {
      const card = createEmptyCard(now);
      return { ar: w.ar, surah: w.surah, ayah: w.ayah, pos: w.pos, due: card.due.getTime(), card };
    });
  await db.cards.bulkPut(rows);
  return rows.length;
}

export async function grade(row: ReviewCard, rating: Grade) {
  const { card } = scheduler.next(row.card, new Date(), rating);
  await db.cards.put({ ...row, card, due: card.due.getTime() });
}

/** Next due date for each rating, for labels on the grade buttons. */
export function previewDue(card: Card): Record<Grade, Date> {
  const p = scheduler.repeat(card, new Date());
  return {
    [Rating.Again]: p[Rating.Again].card.due,
    [Rating.Hard]: p[Rating.Hard].card.due,
    [Rating.Good]: p[Rating.Good].card.due,
    [Rating.Easy]: p[Rating.Easy].card.due,
  } as Record<Grade, Date>;
}

export const dueCount = () => db.cards.where('due').belowOrEqual(Date.now()).count();

export { Rating };
