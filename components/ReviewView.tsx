'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ColoredWord } from './ColoredWord';
import { db, type ReviewCard } from '@/lib/db';
import { addManyToReview, grade, previewDue, Rating } from '@/lib/fsrs';
import { L, bn } from '@/lib/bangla-labels';
import type { Grade } from 'ts-fsrs';
import type { Pattern, RootEntry, SurahMeta, WordIndexEntry } from '@/lib/types';

type Props = { words: WordIndexEntry[]; roots: RootEntry[]; patterns: Pattern[]; surahs: SurahMeta[] };

const GRADES: { r: Grade; label: string; cls: string }[] = [
  { r: Rating.Again, label: L.again, cls: 'bg-root text-paper' },
  { r: Rating.Hard, label: L.hard, cls: 'bg-line text-ink' },
  { r: Rating.Good, label: L.good, cls: 'bg-accent text-paper' },
  { r: Rating.Easy, label: L.easy, cls: 'bg-affix text-paper' },
];

function interval(due: Date): string {
  const min = Math.max(1, Math.round((due.getTime() - Date.now()) / 60000));
  if (min < 60) return `${bn(min)} ${L.minute}`;
  const h = Math.round(min / 60);
  if (h < 24) return `${bn(h)} ${L.hour}`;
  const d = Math.round(h / 24);
  if (d < 31) return `${bn(d)} ${L.day}`;
  return `${bn(Math.round(d / 30))} ${L.month}`;
}

export function ReviewView({ words, roots, patterns, surahs }: Props) {
  const byAr = useMemo(() => new Map(words.map((w) => [w.ar, w])), [words]);
  // Read the whole (small) table: a range query on 'due' would not notice cards added later.
  const cards = useLiveQuery(() => db.cards.orderBy('due').toArray(), []);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);
  const due = useMemo(() => cards?.filter((c) => c.due <= now), [cards, now]);
  const total = cards?.length ?? 0;
  const next = cards?.[0];
  const [revealed, setRevealed] = useState(false);

  const current: ReviewCard | undefined = due?.[0];
  const entry = current ? byAr.get(current.ar) : undefined;

  const onGrade = async (r: Grade) => {
    if (!current) return;
    await grade(current, r);
    setRevealed(false);
    setNow(Date.now());
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-4 pb-40 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L.review}</h1>
        <Link href="/" className="min-h-11 rounded-2xl border border-line px-4 py-2 text-sm">
          {L.home}
        </Link>
      </header>
      <p className="text-sm text-muted">
        {L.cardsLeft}: {bn(due?.length ?? 0)} · {L.inReviewTotal}: {bn(total)}
      </p>

      {due === undefined ? null : current && entry ? (
        <>
          <section className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl bg-card p-6 text-center ring-1 ring-line">
            <p lang="ar" dir="rtl" className={`quran pb-3 text-6xl ${revealed ? '' : 'no-color'}`}>
              <ColoredWord segments={entry.segments} />
            </p>
            <p lang="ar" dir="rtl" className="quran text-xl text-muted">
              {entry.context.map((w, i) => (
                <span key={i} className={i + 1 === entry.pos ? 'text-ink underline decoration-accent underline-offset-8' : ''}>
                  {w}{' '}
                </span>
              ))}
            </p>
            <p className="text-xs text-muted">
              {L.context}: {surahs.find((s) => s.surah === entry.surah)?.name_bn} {bn(entry.surah)}:{bn(entry.ayah)}
            </p>

            {revealed && <Answer entry={entry} roots={roots} patterns={patterns} />}
          </section>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            <div className="mx-auto max-w-2xl px-3 py-3">
              {revealed ? (
                <div className="grid grid-cols-4 gap-2">
                  {GRADES.map((g) => {
                    const at = previewDue(current.card)[g.r];
                    return (
                      <button
                        key={g.r}
                        type="button"
                        onClick={() => onGrade(g.r)}
                        className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 font-medium ${g.cls}`}
                      >
                        <span>{g.label}</span>
                        <span className="text-xs opacity-90">{interval(at)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="min-h-14 w-full rounded-2xl bg-accent text-lg font-semibold text-paper"
                >
                  {L.showAnswer}
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <EmptyState total={total} nextDue={next?.due} words={words} surahs={surahs} onAdded={() => setNow(Date.now())} />
      )}
    </main>
  );
}

function Answer({ entry, roots, patterns }: { entry: WordIndexEntry; roots: RootEntry[]; patterns: Pattern[] }) {
  const root = roots.find((r) => r.root === entry.root);
  const pattern = patterns.find((p) => p.id === entry.pattern_id);
  return (
    <div className="mt-2 flex w-full flex-col gap-3 border-t border-line pt-4">
      <p className="text-accent">{entry.pron_bn}</p>
      <p className="text-2xl font-medium">{entry.meaning_bn ?? entry.gloss_en ?? L.bnMissing}</p>
      <dl className="grid grid-cols-2 gap-3 text-start">
        <div className="rounded-2xl border border-line p-3">
          <dt className="text-xs text-muted">{L.root}</dt>
          <dd lang="ar" dir="rtl" className="quran seg-root text-2xl">
            {entry.root ?? '-'}
          </dd>
          {entry.root && <dd className="text-xs text-muted">{root?.meaning_bn || L.rootMeaningMissing}</dd>}
        </div>
        <div className="rounded-2xl border border-line p-3">
          <dt className="text-xs text-muted">{L.pattern}</dt>
          {pattern ? (
            <>
              <dd lang="ar" dir="rtl" className="quran text-2xl">
                {pattern.shape_ar}
              </dd>
              <dd className="text-xs">{pattern.meaning_bn}</dd>
            </>
          ) : (
            <dd className="text-xs text-muted">{L.noPattern}</dd>
          )}
        </div>
      </dl>
    </div>
  );
}

function EmptyState({
  total,
  nextDue,
  words,
  surahs,
  onAdded,
}: {
  onAdded: () => void;
  total: number;
  nextDue?: number;
  words: WordIndexEntry[];
  surahs: SurahMeta[];
}) {
  const [added, setAdded] = useState<Record<number, number>>({});
  const addSurah = async (s: number) => {
    const n = await addManyToReview(words.filter((w) => w.surah === s));
    setAdded((a) => ({ ...a, [s]: n }));
    onAdded();
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-3xl bg-accent-soft p-5">
        {total > 0 ? (
          <>
            <p className="text-lg font-semibold">{L.reviewDoneTitle}</p>
            <p className="mt-1 text-sm">{L.reviewDoneBody}</p>
            {nextDue && (
              <p className="mt-2 text-sm text-muted">
                {L.nextDue}: {interval(new Date(nextDue))} পরে
              </p>
            )}
          </>
        ) : (
          <p>{L.reviewEmpty}</p>
        )}
      </div>
      <ul className="grid gap-2">
        {surahs.map((s) => (
          <li key={s.surah} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
            <span>
              <span className="block font-medium">{s.name_bn}</span>
              <span className="text-xs text-muted">
                {bn(words.filter((w) => w.surah === s.surah).length)} {L.words}
              </span>
            </span>
            <button
              type="button"
              onClick={() => addSurah(s.surah)}
              disabled={added[s.surah] !== undefined}
              className="min-h-11 rounded-2xl border border-accent px-3 text-sm text-accent disabled:opacity-60"
            >
              {added[s.surah] !== undefined ? `✓ ${bn(added[s.surah])} ${L.added}` : L.addSurahWords}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
