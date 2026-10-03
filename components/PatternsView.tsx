'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomSheet } from './BottomSheet';
import { ColoredWord } from './ColoredWord';
import { db } from '@/lib/db';
import { L, bn } from '@/lib/bangla-labels';
import type { Pattern, WordIndexEntry } from '@/lib/types';

type Props = { patterns: Pattern[]; words: WordIndexEntry[] };

export function PatternsView({ patterns, words }: Props) {
  const scores = useLiveQuery(() => db.patternScores.toArray(), []) ?? [];
  const [quizFor, setQuizFor] = useState<Pattern | null>(null);
  const close = useCallback(() => setQuizFor(null), []);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pb-16 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L.patterns}</h1>
        <Link href="/" className="min-h-11 rounded-2xl border border-line px-4 py-2 text-sm">
          {L.home}
        </Link>
      </header>
      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          <span lang="ar" className="quran seg-root text-xl">ع</span> {L.legendRoot}
        </span>
        <span>
          <span lang="ar" className="quran seg-pattern text-xl">ع</span> {L.legendPattern}
        </span>
        <span>
          <span lang="ar" className="quran seg-affix text-xl">ع</span> {L.legendAffix}
        </span>
      </div>

      <ul className="flex flex-col gap-4">
        {patterns.map((p) => {
          const examples = words.filter((w) => w.pattern_id === p.id);
          const score = scores.find((s) => s.id === p.id);
          return (
            <li key={p.id} className="rounded-3xl bg-card p-5 ring-1 ring-line">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{p.name_bn}</h2>
                  <p>{p.meaning_bn}</p>
                  {!p.reviewed && (
                    <span className="mt-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs">{L.needsReview}</span>
                  )}
                </div>
                <p lang="ar" dir="rtl" className="quran shrink-0 text-4xl">
                  {p.shape_ar}
                </p>
              </div>

              <h3 className="mb-2 mt-4 text-sm text-muted">
                {L.examples} ({bn(examples.length)})
              </h3>
              <ul className="flex flex-wrap gap-2" dir="rtl">
                {examples.map((w) => (
                  <li key={w.ar} className="rounded-2xl bg-accent-soft px-3 py-1 text-center">
                    <span lang="ar" className="quran block text-2xl">
                      <ColoredWord segments={w.segments} />
                    </span>
                    <span dir="ltr" className="block text-xs text-muted">
                      {w.meaning_bn ?? w.gloss_en}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm text-muted">
                  {score ? `${L.best}: ${bn(score.best)}/৫ · ${L.score}: ${bn(score.last)}/৫` : ''}
                </span>
                <button
                  type="button"
                  disabled={examples.length === 0}
                  onClick={() => setQuizFor(p)}
                  className="min-h-11 rounded-2xl bg-accent px-4 font-medium text-paper disabled:opacity-50"
                >
                  {L.startQuiz}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {quizFor && <Quiz key={quizFor.id} pattern={quizFor} words={words} onClose={close} />}
    </main>
  );
}

type Question = {
  type: 'word' | 'meaning';
  prompt?: WordIndexEntry; // the word asked about (meaning questions)
  options: { key: string; label: string; ar?: WordIndexEntry }[];
  answer: string;
};

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const meaningOf = (w: WordIndexEntry) => w.meaning_bn ?? w.gloss_en ?? '';

function makeQuiz(pattern: Pattern, words: WordIndexEntry[]): Question[] {
  const own = words.filter((w) => w.pattern_id === pattern.id && meaningOf(w));
  const others = words.filter((w) => w.pattern_id !== pattern.id && meaningOf(w));
  return Array.from({ length: 5 }, (_, i) => {
    const target = pick(own);
    if (i % 2 === 0) {
      const distractors = shuffle(others.filter((w) => w.pattern_id)).slice(0, 3);
      const opts = shuffle([target, ...distractors]);
      return { type: 'word', options: opts.map((w) => ({ key: w.ar, label: meaningOf(w), ar: w })), answer: target.ar };
    }
    const wrong = shuffle([...new Set(others.map(meaningOf))].filter((m) => m !== meaningOf(target))).slice(0, 3);
    const opts = shuffle([meaningOf(target), ...wrong]);
    return { type: 'meaning', prompt: target, options: opts.map((m) => ({ key: m, label: m })), answer: meaningOf(target) };
  });
}

function Quiz({ pattern, words, onClose }: { pattern: Pattern; words: WordIndexEntry[]; onClose: () => void }) {
  const [questions, setQuestions] = useState(() => makeQuiz(pattern, words));
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const done = i >= questions.length;
  const q = questions[i];

  const choose = (key: string) => {
    if (chosen) return;
    setChosen(key);
    if (key === q.answer) setCorrect((c) => c + 1);
  };

  const next = async () => {
    const last = i + 1 >= questions.length;
    if (last) {
      const prev = await db.patternScores.get(pattern.id);
      await db.patternScores.put({
        id: pattern.id,
        best: Math.max(prev?.best ?? 0, correct),
        last: correct,
        updated: Date.now(),
      });
    }
    setChosen(null);
    setI(i + 1);
  };

  const restart = () => {
    setQuestions(makeQuiz(pattern, words));
    setI(0);
    setCorrect(0);
    setChosen(null);
  };

  const title = useMemo(() => `${L.quiz}: ${pattern.name_bn}`, [pattern]);

  return (
    <BottomSheet open onClose={onClose} title={title}>
      {done ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <p className="text-4xl font-semibold">
            {bn(correct)}/{bn(questions.length)}
          </p>
          <p className="text-muted">{L.score}</p>
          <div className="grid w-full grid-cols-2 gap-3">
            <button type="button" onClick={restart} className="min-h-12 rounded-2xl border border-line">
              {L.tryAgain}
            </button>
            <button type="button" onClick={onClose} className="min-h-12 rounded-2xl bg-accent text-paper">
              {L.finish}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {bn(i + 1)}/{bn(questions.length)}
          </p>
          {q.type === 'word' ? (
            <p className="text-lg font-medium">
              {L.quizWhichWord}{' '}
              <span lang="ar" className="quran text-2xl">
                {pattern.shape_ar}
              </span>
            </p>
          ) : (
            <div className="text-center">
              <p className="text-lg font-medium">{L.quizWhichMeaning}</p>
              <p lang="ar" dir="rtl" className="quran pb-2 text-5xl">
                <ColoredWord segments={q.prompt!.segments} />
              </p>
              <p className="text-accent">{q.prompt!.pron_bn}</p>
            </div>
          )}
          <ul className="grid gap-2">
            {q.options.map((o) => {
              const state = !chosen
                ? 'ring-1 ring-line'
                : o.key === q.answer
                  ? 'ring-2 ring-accent bg-accent-soft'
                  : o.key === chosen
                    ? 'ring-2 ring-root'
                    : 'ring-1 ring-line opacity-60';
              return (
                <li key={o.key}>
                  <button
                    type="button"
                    onClick={() => choose(o.key)}
                    aria-pressed={chosen === o.key}
                    className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-4 py-2 text-start ${chosen && o.key === q.answer ? '' : 'bg-card'} ${state}`}
                  >
                    {o.ar ? (
                      <>
                        <span className="text-sm text-muted">{chosen ? o.label : ''}</span>
                        <span lang="ar" dir="rtl" className="quran text-3xl">
                          {o.ar.ar}
                        </span>
                      </>
                    ) : (
                      <span>{o.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p aria-live="polite" className="h-6 text-center font-medium">
            {chosen ? (chosen === q.answer ? `✓ ${L.correct}` : `✗ ${L.wrong}`) : ''}
          </p>
          <button
            type="button"
            disabled={!chosen}
            onClick={next}
            className="min-h-12 rounded-2xl bg-accent font-medium text-paper disabled:opacity-50"
          >
            {i + 1 >= questions.length ? L.finish : L.nextQuestion}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
