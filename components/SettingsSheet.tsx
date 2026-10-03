'use client';

import { BottomSheet } from './BottomSheet';
import { useSettings } from './useSettings';
import { updateSettings, type PronLevel, type SupportLevel, type Theme } from '@/lib/db';
import { L, bn } from '@/lib/bangla-labels';

export const SUPPORT_OPTIONS: { id: SupportLevel; label: string }[] = [
  { id: 'all', label: L.supportAll },
  { id: 'new', label: L.supportNew },
  { id: 'none', label: L.supportNone },
];

const PRON_OPTIONS: { id: PronLevel; label: string }[] = [
  { id: 'ayah', label: L.pronAyah },
  { id: 'word', label: L.pronWord },
  { id: 'both', label: L.pronBoth },
  { id: 'none', label: L.supportNone },
];

const THEMES: { id: Theme; label: string }[] = [
  { id: 'light', label: L.themeLight },
  { id: 'dark', label: L.themeDark },
  { id: 'system', label: L.themeSystem },
];

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted">{label}</legend>
      <div className="grid gap-1 rounded-2xl bg-accent-soft p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={`min-h-11 rounded-xl px-2 text-sm font-medium ${value === o.id ? 'bg-card shadow-sm' : 'text-muted'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  return (
    <BottomSheet open={open} onClose={onClose} title={L.settings}>
      <div className="flex flex-col gap-6">
        <Segmented label={L.support} options={SUPPORT_OPTIONS} value={s.support} onChange={(support) => updateSettings({ support })} />

        <div>
          <Segmented label={L.pron} options={PRON_OPTIONS} value={s.pron} onChange={(pron) => updateSettings({ pron })} />
          <p className="mt-2 text-xs text-muted">{L.pronNote}</p>
        </div>

        <div>
          <label htmlFor="font-size" className="mb-2 block text-sm text-muted">
            {L.fontSize}: {bn(s.fontSize)}
          </label>
          <input
            id="font-size"
            type="range"
            min={22}
            max={56}
            step={2}
            value={s.fontSize}
            onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
            className="w-full accent-[var(--color-accent)]"
          />
          <p lang="ar" dir="rtl" className="quran text-center" style={{ fontSize: s.fontSize }}>
            بِسْمِ ٱللَّهِ
          </p>
        </div>

        <Segmented label={L.theme} options={THEMES} value={s.theme} onChange={(theme) => updateSettings({ theme })} />

        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            <span lang="ar" className="quran seg-root text-xl">
              ع
            </span>{' '}
            {L.legendRoot}
          </span>
          <span>
            <span lang="ar" className="quran seg-pattern text-xl">
              ع
            </span>{' '}
            {L.legendPattern}
          </span>
          <span>
            <span lang="ar" className="quran seg-affix text-xl">
              ع
            </span>{' '}
            {L.legendAffix}
          </span>
        </div>
      </div>
    </BottomSheet>
  );
}
