'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ColoredWord } from './ColoredWord';
import { WordCard, type WordContext } from './WordCard';
import { AyahSheet } from './AyahSheet';
import { SettingsSheet, SUPPORT_OPTIONS } from './SettingsSheet';
import { useSettings } from './useSettings';
import { useAyahAudio } from './useAudio';
import { useStudyTimer } from './useStudyTimer';
import { db, updateSettings, type SupportLevel } from '@/lib/db';
import { L, ar, bn } from '@/lib/bangla-labels';
import type { Ayah, Pattern, RootEntry, Summary, SurahFile, SurahMeta, Word } from '@/lib/types';

type Props = {
  data: SurahFile;
  roots: RootEntry[];
  patterns: Pattern[];
  summaries: Summary[];
  prev?: SurahMeta;
  next?: SurahMeta;
};

export function ReciteView({ data, roots, patterns, summaries, prev, next }: Props) {
  const settings = useSettings();
  const knownRows = useLiveQuery(() => db.known.toArray(), []);
  const known = useMemo(() => new Set((knownRows ?? []).map((k) => k.ar)), [knownRows]);
  const notes = useLiveQuery(() => db.notes.where('surah').equals(data.surah).toArray(), [data.surah]);
  const noted = useMemo(() => new Set((notes ?? []).map((n) => n.ayah)), [notes]);

  const [wordCtx, setWordCtx] = useState<WordContext | null>(null);
  const [sheetAyah, setSheetAyah] = useState<Ayah | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const audio = useAyahAudio(data.surah);
  const timer = useStudyTimer();

  useLastPosition(data.surah);

  const closeWord = useCallback(() => setWordCtx(null), []);
  const closeAyah = useCallback(() => setSheetAyah(null), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  return (
    <main className="mx-auto max-w-3xl pb-32">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-xl font-semibold">
            {data.name_bn} <span className="text-sm font-normal text-muted">({bn(data.ayahs.length)} {L.ayahs})</span>
          </h1>
        </div>
        <p lang="ar" dir="rtl" className="quran text-2xl">
          {data.name_ar}
        </p>
      </header>

      {data.bismillah && (
        <p lang="ar" dir="rtl" className="quran mt-6 text-center" style={{ fontSize: settings.fontSize * 0.9 }}>
          {data.bismillah}
        </p>
      )}

      <ol className="mt-4 flex flex-col">
        {data.ayahs.map((a) => (
          <AyahRow
            key={a.n}
            ayah={a}
            fontSize={settings.fontSize}
            support={settings.support}
            known={known}
            hasNote={noted.has(a.n)}
            playing={audio.playing === a.n}
            audioError={audio.error === a.n}
            onPlay={() => audio.toggle(a.n)}
            onWord={(word) => setWordCtx({ word, surah: data.surah, ayah: a.n })}
            onAyah={() => setSheetAyah(a)}
          />
        ))}
      </ol>

      <nav className="mt-8 flex justify-between gap-3 px-4" aria-label={L.allSurahs}>
        {prev ? (
          <Link href={`/recite/${prev.surah}/`} className="min-h-12 rounded-2xl border border-line px-4 py-3">
            → {L.prev}: {prev.name_bn}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/recite/${next.surah}/`} className="min-h-12 rounded-2xl border border-line px-4 py-3">
            {L.next}: {next.name_bn} ←
          </Link>
        )}
      </nav>

      {timer.done && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-20 mx-auto max-w-md rounded-3xl bg-accent p-5 text-paper shadow-xl">
          <p className="text-lg font-semibold">{L.doneForToday}</p>
          <p className="mt-1 text-sm">{L.doneForTodayBody}</p>
          <div className="mt-3 flex gap-3">
            <Link href="/" className="min-h-11 flex-1 rounded-2xl bg-paper px-4 py-2 text-center font-medium text-accent">
              {L.goHome}
            </Link>
            <button type="button" onClick={timer.dismiss} className="min-h-11 flex-1 rounded-2xl border border-paper px-4 py-2 font-medium">
              {L.keepGoing}
            </button>
          </div>
        </div>
      )}

      <BottomBar support={settings.support} onSettings={() => setSettingsOpen(true)} />

      <WordCard ctx={wordCtx} onClose={closeWord} roots={roots} patterns={patterns} />
      <AyahSheet
        ayah={sheetAyah}
        surah={data.surah}
        tafsirRecords={data.tafsir_records}
        summaries={summaries}
        onClose={closeAyah}
      />
      <SettingsSheet open={settingsOpen} onClose={closeSettings} />
    </main>
  );
}

type RowProps = {
  ayah: Ayah;
  fontSize: number;
  support: SupportLevel;
  known: Set<string>;
  hasNote: boolean;
  playing: boolean;
  audioError: boolean;
  onPlay: () => void;
  onWord: (w: Word) => void;
  onAyah: () => void;
};

function AyahRow({ ayah, fontSize, support, known, hasNote, playing, audioError, onPlay, onWord, onAyah }: RowProps) {
  const showMeaning = (w: Word) => support === 'all' || (support === 'new' && !known.has(w.ar));
  return (
    <li id={`a-${ayah.n}`} data-ayah={ayah.n} className="scroll-mt-20 border-b border-line px-3 py-4">
      <div lang="ar" dir="rtl" className="quran flex flex-wrap items-start gap-x-3 gap-y-2" style={{ fontSize }}>
        {ayah.words.map((w) => (
          <span key={w.pos} className="inline-flex items-start gap-x-2">
            <button
              type="button"
              onClick={() => onWord(w)}
              className="flex flex-col items-center rounded-xl px-1 hover:bg-accent-soft focus-visible:bg-accent-soft"
            >
              <span className="pb-[0.2em]">
                <ColoredWord segments={w.segments} />
              </span>
              {showMeaning(w) && (w.meaning_bn || w.gloss_en) && (
                <span
                  lang={w.meaning_bn ? 'bn' : 'en'}
                  dir="ltr"
                  className="max-w-[9rem] pb-1 text-center font-bangla text-sm leading-snug text-muted"
                >
                  {w.meaning_bn ?? w.gloss_en}
                </span>
              )}
            </button>
            {w.after && <span aria-hidden="true">{w.after}</span>}
          </span>
        ))}
        <button
          type="button"
          onClick={onAyah}
          className="relative rounded-full px-2 text-accent hover:bg-accent-soft"
        >
          ﴿{ar(ayah.n)}﴾
          <span className="sr-only" lang="bn">
            {L.ayahNo} {bn(ayah.n)}: {L.tabTranslations}, {L.tabTafsir}, {L.tabNote}
          </span>
          {hasNote && <span className="absolute -top-1 left-0 h-2 w-2 rounded-full bg-root" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={onPlay}
          aria-pressed={playing}
          aria-label={`${playing ? L.pause : L.play}, ${L.ayahNo} ${bn(ayah.n)}`}
          className={`flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full border font-bangla text-base ${
            playing ? 'border-accent bg-accent text-paper' : 'border-line text-accent'
          }`}
        >
          <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
        </button>
      </div>
      {audioError && <p className="mt-2 text-sm text-root">{L.audioOffline}</p>}
    </li>
  );
}

function BottomBar({ support, onSettings }: { support: SupportLevel; onSettings: () => void }) {
  return (
    <nav
      aria-label={L.settings}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
        <Link href="/" className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl text-sm" aria-label={L.home}>
          {L.home}
        </Link>
        <div className="grid flex-1 grid-cols-3 gap-1 rounded-2xl bg-accent-soft p-1" role="group" aria-label={L.support}>
          {SUPPORT_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={support === o.id}
              onClick={() => updateSettings({ support: o.id })}
              className={`min-h-11 rounded-xl px-1 text-xs font-medium ${support === o.id ? 'bg-card shadow-sm' : 'text-muted'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSettings}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl text-sm"
        >
          {L.settings}
        </button>
      </div>
    </nav>
  );
}

/** Saves the ayah currently on screen so Home can offer "continue". */
function useLastPosition(surah: number) {
  const last = useRef(0);
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-ayah]');
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => Number(e.target.getAttribute('data-ayah')));
        if (!visible.length) return;
        const ayah = Math.min(...visible);
        if (ayah === last.current) return;
        last.current = ayah;
        db.progress.put({ id: 'last', surah, ayah, updated: Date.now() });
      },
      { rootMargin: '-30% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [surah]);
}
