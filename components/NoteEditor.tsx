'use client';

import { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/db';
import { L } from '@/lib/bangla-labels';

/** Personal note per ayah, saved to IndexedDB as the user types. */
export function NoteEditor({ surah, ayah }: { surah: number; ayah: number }) {
  const id = `${surah}:${ayah}`;
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    db.notes.get(id).then((n) => setText(n?.text ?? ''));
  }, [id]);

  const onChange = (value: string) => {
    setText(value);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (value.trim()) await db.notes.put({ id, surah, ayah, text: value, updated: Date.now() });
      else await db.notes.delete(id);
      setSaved(true);
    }, 400);
  };

  return (
    <div>
      <label htmlFor="note" className="sr-only">
        {L.tabNote}
      </label>
      <textarea
        id="note"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={L.notePlaceholder}
        rows={7}
        className="w-full rounded-2xl border border-line bg-paper p-4 text-lg leading-relaxed outline-none focus:border-accent"
      />
      <p className="mt-1 h-5 text-sm text-muted" aria-live="polite">
        {saved ? `✓ ${L.saved}` : ''}
      </p>
    </div>
  );
}
