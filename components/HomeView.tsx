'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayKey } from '@/lib/db';
import { L, bn } from '@/lib/bangla-labels';
import { SettingsSheet } from './SettingsSheet';
import { useKnown } from './useKnown';
import type { SurahMeta } from '@/lib/types';

type Props = { surahs: SurahMeta[]; wordForms: string[] };

export function HomeView({ surahs, wordForms }: Props) {
  const last = useLiveQuery(() => db.progress.get('last'), []);
  const known = useKnown();
  const due = useLiveQuery(() => db.cards.where('due').belowOrEqual(Date.now()).count(), []) ?? 0;
  const days = useLiveQuery(() => db.days.toArray(), []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const pct = useMemo(() => {
    if (!wordForms.length) return 0;
    return Math.round((wordForms.filter((w) => known.has(w)).length / wordForms.length) * 100);
  }, [known, wordForms]);

  const { streak, minutesToday } = useMemo(() => studyStats(days ?? []), [days]);

  const current = surahs.find((s) => s.surah === last?.surah) ?? surahs[0];
  const ayah = last?.surah === current.surah ? last.ayah : 1;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-5 px-4 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L.appName}</h1>
        <Link href="/about/" className="text-sm text-accent underline-offset-4 hover:underline">
          {L.about}
        </Link>
      </header>

      <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-line" aria-labelledby="today">
        <h2 id="today" className="text-sm text-muted">
          {L.todayPassage}
        </h2>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="text-2xl font-semibold">
            {current.name_bn}
            <span className="ms-2 text-base font-normal text-muted">
              {L.ayahNo} {bn(ayah)}
            </span>
          </p>
          <p lang="ar" dir="rtl" className="quran text-3xl">
            {current.name_ar}
          </p>
        </div>
        <Link
          href={`/recite/${current.surah}/#a-${ayah}`}
          className="mt-4 flex min-h-14 items-center justify-center rounded-2xl bg-accent text-xl font-semibold text-paper"
        >
          {L.continue}
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center justify-center rounded-3xl bg-card p-4 ring-1 ring-line">
          <ProgressRing pct={pct} />
          <p className="mt-2 text-center text-sm text-muted">{L.progress}</p>
        </div>
        <div className="flex flex-col gap-4">
          <Link href="/review/" className="flex-1 rounded-3xl bg-card p-4 ring-1 ring-line hover:ring-accent">
            <p className="text-3xl font-semibold">{bn(due)}</p>
            <p className="text-sm text-muted">
              {L.reviewsDue} <span className="text-accent">›</span>
            </p>
          </Link>
          <div className="flex-1 rounded-3xl bg-card p-4 ring-1 ring-line">
            <p className="text-3xl font-semibold">
              {bn(streak)} <span className="text-base font-normal">{L.days}</span>
            </p>
            <p className="text-sm text-muted">
              {L.streak} · {L.minutesToday} {bn(minutesToday)} {L.minutes}
            </p>
          </div>
        </div>
      </section>

      <Link
        href="/patterns/"
        className="flex min-h-14 items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-line hover:ring-accent"
      >
        <span className="font-medium">{L.patterns}</span>
        <span lang="ar" dir="rtl" className="quran text-2xl">
          فَاعِل · مَفْعُول
        </span>
      </Link>

      <section aria-labelledby="surahs">
        <h2 id="surahs" className="mb-3 text-lg font-semibold">
          {L.allSurahs}
        </h2>
        <ul className="grid gap-2">
          {surahs.map((s) => (
            <li key={s.surah}>
              <Link
                href={`/recite/${s.surah}/`}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line hover:ring-accent"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm">
                    {bn(s.surah)}
                  </span>
                  <span>
                    <span className="block font-medium">{s.name_bn}</span>
                    <span className="block text-xs text-muted">
                      {s.meaning_bn} · {bn(s.ayah_count)} {L.ayahs} · {bn(s.word_count)} {L.words}
                    </span>
                  </span>
                </span>
                <span lang="ar" dir="rtl" className="quran text-2xl">
                  {s.name_ar}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 px-3 py-2">
          <Link
            href={`/recite/${current.surah}/#a-${ayah}`}
            className="flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-accent font-medium text-paper"
          >
            {L.continue}
          </Link>
          <Link href="/review/" className="flex min-h-12 items-center justify-center rounded-2xl border border-line px-4 text-sm">
            {L.review}
            {due > 0 && <span className="ms-1 rounded-full bg-root px-1.5 text-xs text-paper">{bn(due)}</span>}
          </Link>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="min-h-12 rounded-2xl border border-line px-4 text-sm"
          >
            {L.settings}
          </button>
        </div>
      </nav>
      <SettingsSheet open={settingsOpen} onClose={closeSettings} />
    </main>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28" role="img" aria-label={`${bn(pct)}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-line)" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="57" textAnchor="middle" fontSize="22" fill="var(--color-ink)" fontWeight="600">
        {bn(pct)}%
      </text>
    </svg>
  );
}

/** Gentle streak: counts back from today, or from yesterday if today has no reading yet. */
function studyStats(days: { date: string; seconds: number }[]) {
  const active = new Set(days.filter((d) => d.seconds >= 60).map((d) => d.date));
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const cursor = new Date();
  if (!active.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (active.has(key(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const today = days.find((d) => d.date === todayKey());
  return { streak, minutesToday: Math.floor((today?.seconds ?? 0) / 60) };
}
