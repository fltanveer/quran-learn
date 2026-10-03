'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { BottomSheet } from './BottomSheet';
import { ColoredWord } from './ColoredWord';
import { db } from '@/lib/db';
import { addToReview } from '@/lib/fsrs';
import { L, bn } from '@/lib/bangla-labels';
import type { Pattern, RootEntry, Word, WordRef } from '@/lib/types';

export type WordContext = { word: Word; surah: number; ayah: number };

type Props = {
  ctx: WordContext | null;
  onClose: () => void;
  roots: RootEntry[];
  patterns: Pattern[];
};

function siblings(word: Word, roots: RootEntry[], pattern?: Pattern) {
  const seen = new Set([word.ar]);
  const out: (WordRef & { via: 'root' | 'pattern' })[] = [];
  const add = (w: WordRef, via: 'root' | 'pattern') => {
    if (out.length >= 5 || seen.has(w.ar)) return;
    seen.add(w.ar);
    out.push({ ...w, via });
  };
  const root = roots.find((r) => r.root === word.root);
  root?.words.forEach((w) => add(w, 'root'));
  if (out.length < 3) pattern?.example_words.forEach((w) => add(w, 'pattern'));
  return out;
}

export function WordCard({ ctx, onClose, roots, patterns }: Props) {
  const word = ctx?.word;
  const inReview = useLiveQuery(() => (word ? db.cards.get(word.ar) : undefined), [word?.ar]);
  const known = useLiveQuery(() => (word ? db.known.get(word.ar) : undefined), [word?.ar]);

  if (!ctx || !word) return null;

  const root = roots.find((r) => r.root === word.root);
  const pattern = patterns.find((p) => p.id === word.pattern_id);
  const sibs = siblings(word, roots, pattern);

  const toggleKnown = async () => {
    if (known) await db.known.delete(word.ar);
    else await db.known.put({ ar: word.ar, known: 1, updated: Date.now() });
  };

  return (
    <BottomSheet open onClose={onClose} title={`${L.surah} ${bn(ctx.surah)}, ${L.ayahNo} ${bn(ctx.ayah)}`}>
      <div className="flex flex-col gap-5">
        <div className="text-center">
          <p lang="ar" dir="rtl" className="quran pb-3 text-6xl">
            <ColoredWord segments={word.segments} />
          </p>
          {word.meaning_bn ? (
            <p className="mt-2 text-xl font-medium">{word.meaning_bn}</p>
          ) : (
            <p className="mt-2 text-sm text-muted">{L.bnMissing}</p>
          )}
          {word.gloss_en && (
            <p className="mt-1 text-sm text-muted" lang="en">
              {L.englishMeaning}: {word.gloss_en}
            </p>
          )}
        </div>

        <dl className="grid gap-3">
          <div className="rounded-2xl border border-line p-4">
            <dt className="text-sm text-muted">{L.root}</dt>
            {word.root ? (
              <dd className="mt-1">
                <span lang="ar" dir="rtl" className="quran seg-root text-3xl">
                  {word.root}
                </span>
                <p className={root?.meaning_bn ? 'mt-1' : 'mt-1 text-sm text-muted'}>
                  {root?.meaning_bn || L.rootMeaningMissing}
                </p>
                {word.lemma && (
                  <p className="mt-1 text-sm text-muted">
                    {L.lemma}:{' '}
                    <span lang="ar" dir="rtl" className="quran text-xl text-ink">
                      {word.lemma}
                    </span>
                  </p>
                )}
              </dd>
            ) : (
              <dd className="mt-1 text-sm text-muted">{L.noRoot}</dd>
            )}
          </div>

          <div className="rounded-2xl border border-line p-4">
            <dt className="text-sm text-muted">{L.pattern}</dt>
            {pattern ? (
              <dd className="mt-1">
                <span lang="ar" dir="rtl" className="quran text-3xl">
                  {pattern.shape_ar}
                </span>
                <span className="ms-3">{pattern.name_bn}</span>
                <p className="mt-1">{pattern.meaning_bn}</p>
                {!pattern.reviewed && (
                  <span className="mt-2 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs">
                    {L.needsReview}
                  </span>
                )}
              </dd>
            ) : (
              <dd className="mt-1 text-sm text-muted">{L.noPattern}</dd>
            )}
          </div>
        </dl>

        {sibs.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm text-muted">{L.siblings}</h3>
            <ul className="grid gap-2">
              {sibs.map((s) => (
                <li key={s.ar} className="flex items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-2">
                  <span className="text-sm">
                    {s.meaning_bn ?? L.bnMissing}
                    <span className="ms-2 text-xs text-muted">
                      ({s.via === 'root' ? L.sameRoot : L.samePattern}, {bn(s.surah)}:{bn(s.ayah)})
                    </span>
                  </span>
                  <span lang="ar" dir="rtl" className="quran text-2xl">
                    {s.ar}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={toggleKnown}
            aria-pressed={!!known}
            className={`min-h-12 rounded-2xl border px-4 py-3 font-medium ${
              known ? 'border-accent bg-accent-soft text-accent' : 'border-line'
            }`}
          >
            {known ? `✓ ${L.known}` : L.markKnown}
          </button>
          <button
            type="button"
            onClick={() => addToReview(word, ctx.surah, ctx.ayah)}
            disabled={!!inReview}
            className="min-h-12 rounded-2xl bg-accent px-4 py-3 font-medium text-paper disabled:opacity-60"
          >
            {inReview ? `✓ ${L.addedToReview}` : L.addToReview}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
