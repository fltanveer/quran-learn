'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateSettings } from '@/lib/db';
import { L, bn } from '@/lib/bangla-labels';
import { RichText } from './RichText';
import { SafeHtml } from './SafeHtml';
import { useSettings } from './useSettings';
import type { Summary, TafsirRecord, TafsirSource } from '@/lib/types';

const LAYERS: { id: Summary['layer']; label: string }[] = [
  { id: 'essence', label: L.essence },
  { id: 'summary', label: L.summary },
  { id: 'lessons', label: L.lessons },
  { id: 'heart', label: L.heart },
];

const MUKHTASAR = 'bn_mokhtasar';
const pad3 = (n: number) => String(n).padStart(3, '0');

type Props = {
  surah: number;
  ayah: number;
  records: TafsirRecord[]; // Al-Mukhtasar records bundled with the surah
  summaries: Summary[];
  sources: TafsirSource[];
};

const summaryKey = (surah: number, s: Summary) => `${surah}:${s.ayah}:${s.tafsir_source}:${s.layer}`;

/** Summary layers first (if any), then the full original tafsir from the chosen source. */
export function TafsirLayers({ surah, ayah, records, summaries, sources }: Props) {
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

      <FullTafsir surah={surah} ayah={ayah} records={records} sources={sources} />
    </div>
  );
}

function FullTafsir({ surah, ayah, records, sources }: Omit<Props, 'summaries'>) {
  const { tafsirSource } = useSettings();
  const slug = sources.some((s) => s.slug === tafsirSource) ? tafsirSource : MUKHTASAR;
  const [loaded, setLoaded] = useState<{ key: string; records: TafsirRecord[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const key = `${slug}/${pad3(surah)}`;

  useEffect(() => {
    if (slug === MUKHTASAR) return;
    let live = true;
    setFailed(false);
    fetch(`/data/tafsir/${key}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((recs: TafsirRecord[]) => live && setLoaded({ key, records: recs }))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [key, slug]);

  const pool = slug === MUKHTASAR ? records : loaded?.key === key ? loaded.records : null;
  const rec = pool?.find((r) => r.from_ayah <= ayah && ayah <= r.to_ayah);

  return (
    <section className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-muted">
        {L.tafsirSource}
        <select
          value={slug}
          onChange={(e) => updateSettings({ tafsirSource: e.target.value })}
          className="min-h-11 rounded-xl border border-line bg-card px-3 text-base text-ink"
        >
          <option value={MUKHTASAR}>{L.mukhtasarName}</option>
          <optgroup label="বাংলা">
            {sources
              .filter((s) => s.lang === 'bn')
              .map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
          </optgroup>
          <optgroup label="আরবি">
            {sources
              .filter((s) => s.lang === 'ar')
              .map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
          </optgroup>
        </select>
      </label>

      {failed ? (
        <p className="rounded-2xl bg-accent-soft p-3 text-sm">{L.tafsirOffline}</p>
      ) : !pool ? (
        <p className="text-sm text-muted">...</p>
      ) : !rec ? (
        <p className="text-sm text-muted">{L.tafsirMissing}</p>
      ) : (
        <article className="rounded-2xl border border-line p-4">
          <header className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{L.fullTafsir}</h3>
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-paper">{L.originalSource}</span>
            {rec.from_ayah !== rec.to_ayah && (
              <span className="text-xs text-muted">
                {L.ayahRange}: {bn(rec.from_ayah)}-{bn(rec.to_ayah)}
              </span>
            )}
          </header>
          {slug === MUKHTASAR ? (
            <RichText text={rec.text} className="leading-relaxed" />
          ) : (
            <SafeHtml
              html={rec.text}
              className={rec.lang === 'ar' ? 'quran-prose text-lg leading-loose' : 'leading-relaxed'}
            />
          )}
          <p className="mt-3 text-xs text-muted">
            {L.source}: {rec.source} · {rec.author}
          </p>
          <p className="mt-1 text-xs text-muted">{rec.license_note}</p>
        </article>
      )}
    </section>
  );
}
