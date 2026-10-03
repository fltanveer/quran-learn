'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { L } from '@/lib/bangla-labels';
import { RichText } from './RichText';
import type { Summary, TafsirRecord } from '@/lib/types';

const LAYERS: { id: Summary['layer']; label: string }[] = [
  { id: 'essence', label: L.essence },
  { id: 'summary', label: L.summary },
  { id: 'lessons', label: L.lessons },
  { id: 'heart', label: L.heart },
];

type Props = { surah: number; ayah: number; records: TafsirRecord[]; summaries: Summary[] };

const summaryKey = (surah: number, s: Summary) => `${surah}:${s.ayah}:${s.tafsir_source}:${s.layer}`;

/** Short summary layers first (if any), then the full original tafsir, always with its source. */
export function TafsirLayers({ surah, ayah, records, summaries }: Props) {
  const reviewedIds = useLiveQuery(() => db.reviewedSummaries.toArray(), []) ?? [];
  const isReviewed = (s: Summary) =>
    s.status === 'reviewed' || reviewedIds.some((r) => r.id === summaryKey(surah, s));
  const toggleReviewed = async (s: Summary) => {
    const id = summaryKey(surah, s);
    if (reviewedIds.some((r) => r.id === id)) await db.reviewedSummaries.delete(id);
    else await db.reviewedSummaries.put({ id, reviewed: 1, updated: Date.now() });
  };

  return (
    <div className="flex flex-col gap-4">
      {summaries.length === 0 ? (
        <p className="rounded-2xl bg-accent-soft p-3 text-sm">{L.noSummaries}</p>
      ) : (
        LAYERS.map((layer) =>
          summaries
            .filter((s) => s.layer === layer.id && s.text_bn)
            .map((s) => (
              <article key={summaryKey(surah, s)} className="rounded-2xl border border-line p-4">
                <header className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{layer.label}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isReviewed(s) ? 'bg-accent-soft text-accent' : 'bg-line text-ink'
                    }`}
                  >
                    {isReviewed(s) ? L.reviewed : L.unreviewed}
                  </span>
                </header>
                <p className="whitespace-pre-line leading-relaxed">{s.text_bn}</p>
                <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    {L.source}: {s.tafsir_source}
                  </span>
                  {s.status !== 'reviewed' && (
                    <label className="flex min-h-10 items-center gap-2">
                      <input type="checkbox" checked={isReviewed(s)} onChange={() => toggleReviewed(s)} />
                      {L.markReviewed}
                    </label>
                  )}
                </footer>
              </article>
            )),
        )
      )}

      {records.map((r) => (
        <article key={r.id} className="rounded-2xl border border-line p-4">
          <header className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{L.fullTafsir}</h3>
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-paper">{L.originalSource}</span>
          </header>
          <RichText text={r.text} className="leading-relaxed" />
          <p className="mt-3 text-xs text-muted">
            {L.source}: {r.source} · {r.author}
            {r.from_ayah !== ayah && ` (${r.from_ayah}-${r.to_ayah})`}
          </p>
          <p className="mt-1 text-xs text-muted">{r.license_note}</p>
        </article>
      ))}
    </div>
  );
}
