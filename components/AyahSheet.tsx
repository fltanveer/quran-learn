'use client';

import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { TafsirLayers } from './TafsirLayers';
import { NoteEditor } from './NoteEditor';
import { RecitePractice } from './RecitePractice';
import { RichText } from './RichText';
import { useSettings } from './useSettings';
import { useJson } from './useJson';
import { updateSettings } from '@/lib/db';
import { L, bn } from '@/lib/bangla-labels';
import type { Ayah, Summary, SurahFile, TafsirSource } from '@/lib/types';

export type Tab = 'translations' | 'tafsir' | 'note' | 'practice';

type Props = {
  ayah: Ayah | null;
  surah: number;
  summaries: Summary[];
  tafsirSources: TafsirSource[];
  initialTab?: Tab;
  onClose: () => void;
};

export function AyahSheet({ ayah, surah, summaries, tafsirSources, initialTab, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'translations');
  const full = useJson<SurahFile>(ayah ? `/data/surah/${String(surah).padStart(3, '0')}.json` : null);
  if (!ayah) return null;
  const fullAyah = full.data?.ayahs.find((a) => a.n === ayah.n);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'translations', label: L.tabTranslations },
    { id: 'tafsir', label: L.tabTafsir },
    { id: 'note', label: L.tabNote },
    { id: 'practice', label: L.tabPractice },
  ];

  return (
    <BottomSheet open onClose={onClose} title={`${L.surah} ${bn(surah)}, ${L.ayahNo} ${bn(ayah.n)}`}>
      <p lang="ar" dir="rtl" className="quran text-center text-3xl">
        {ayah.text}
      </p>
      <p className="mb-4 mt-1 text-center text-accent">{ayah.pron_bn}</p>
      <div role="tablist" aria-label={L.tabTranslations} className="mb-4 grid grid-cols-4 gap-1 rounded-2xl bg-accent-soft p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`min-h-11 rounded-xl px-2 text-sm font-medium ${
              tab === t.id ? 'bg-card shadow-sm' : 'text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'translations' && (fullAyah ? <Translations ayah={fullAyah} /> : <Loading error={full.error} />)}
        {tab === 'tafsir' && !full.data && <Loading error={full.error} />}
        {tab === 'tafsir' && full.data && (
          <TafsirLayers
            surah={surah}
            ayah={ayah.n}
            records={full.data.tafsir_records.filter((r) => ayah.tafsir.includes(r.id))}
            summaries={summaries.filter((s) => s.ayah === ayah.n)}
            sources={tafsirSources}
          />
        )}
        {tab === 'note' && <NoteEditor surah={surah} ayah={ayah.n} />}
        {tab === 'practice' && <RecitePractice surah={surah} ayah={ayah} />}
      </div>
    </BottomSheet>
  );
}

function Loading({ error }: { error: boolean }) {
  return <p className="text-sm text-muted">{error ? L.loadFailed : L.loading}</p>;
}

function Translations({ ayah }: { ayah: Ayah }) {
  const { hiddenTranslations } = useSettings();
  const toggle = (id: string) =>
    updateSettings({
      hiddenTranslations: hiddenTranslations.includes(id)
        ? hiddenTranslations.filter((x) => x !== id)
        : [...hiddenTranslations, id],
    });

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm text-muted">{L.showTranslations}</legend>
        {ayah.translations.map((t) => {
          const on = !hiddenTranslations.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(t.id)}
              className={`min-h-10 rounded-full border px-3 text-sm ${
                on ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'
              }`}
            >
              {t.author}
            </button>
          );
        })}
      </fieldset>
      {ayah.translations
        .filter((t) => !hiddenTranslations.includes(t.id))
        .map((t) => (
          <article key={t.id} className="rounded-2xl border border-line p-4">
            <p className="text-lg leading-relaxed">{t.text}</p>
            <p className="mt-2 text-xs text-muted">
              {L.translator}: {t.author} · {L.source}: {t.source}
            </p>
            {t.footnotes && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-accent">{L.footnotes}</summary>
                <RichText text={t.footnotes} className="mt-2 text-sm leading-relaxed" />
              </details>
            )}
          </article>
        ))}
    </div>
  );
}
