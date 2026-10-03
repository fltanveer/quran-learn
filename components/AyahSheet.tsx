'use client';

import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { TafsirLayers } from './TafsirLayers';
import { NoteEditor } from './NoteEditor';
import { RichText } from './RichText';
import { useSettings } from './useSettings';
import { updateSettings } from '@/lib/db';
import { L, bn } from '@/lib/bangla-labels';
import type { Ayah, Summary, TafsirRecord } from '@/lib/types';

type Tab = 'translations' | 'tafsir' | 'note';

type Props = {
  ayah: Ayah | null;
  surah: number;
  tafsirRecords: TafsirRecord[];
  summaries: Summary[];
  onClose: () => void;
};

export function AyahSheet({ ayah, surah, tafsirRecords, summaries, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('translations');
  if (!ayah) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'translations', label: L.tabTranslations },
    { id: 'tafsir', label: L.tabTafsir },
    { id: 'note', label: L.tabNote },
  ];

  return (
    <BottomSheet open onClose={onClose} title={`${L.surah} ${bn(surah)}, ${L.ayahNo} ${bn(ayah.n)}`}>
      <p lang="ar" dir="rtl" className="quran text-center text-3xl">
        {ayah.text}
      </p>
      <p className="mb-4 mt-1 text-center text-accent">{ayah.pron_bn}</p>
      <div role="tablist" aria-label={L.tabTranslations} className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-accent-soft p-1">
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
        {tab === 'translations' && <Translations ayah={ayah} />}
        {tab === 'tafsir' && (
          <TafsirLayers
            surah={surah}
            ayah={ayah.n}
            records={tafsirRecords.filter((r) => ayah.tafsir.includes(r.id))}
            summaries={summaries.filter((s) => s.ayah === ayah.n)}
          />
        )}
        {tab === 'note' && <NoteEditor surah={surah} ayah={ayah.n} />}
      </div>
    </BottomSheet>
  );
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
