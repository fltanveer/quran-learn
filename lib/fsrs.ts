// Spaced repetition with ts-fsrs. Phase 1 only creates cards; the review screen comes in Phase 2.
import { createEmptyCard, fsrs, Rating, type Grade } from 'ts-fsrs';
import { db, type ReviewCard } from './db';
import type { Word } from './types';

export const scheduler = fsrs();

export async function addToReview(word: Word, surah: number, ayah: number) {
  const existing = await db.cards.get(word.ar);
  if (existing) return existing;
  const card = createEmptyCard(new Date());
  const row: ReviewCard = { ar: word.ar, surah, ayah, pos: word.pos, due: card.due.getTime(), card };
  await db.cards.put(row);
  return row;
}

export async function grade(row: ReviewCard, rating: Grade) {
  const { card } = scheduler.next(row.card, new Date(), rating);
  await db.cards.put({ ...row, card, due: card.due.getTime() });
}

export const dueCount = () => db.cards.where('due').belowOrEqual(Date.now()).count();

export { Rating };
