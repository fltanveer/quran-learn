'use client';

import { useJson } from './useJson';
import { L } from '@/lib/bangla-labels';
import type { Pattern, RootEntry, WordIndexEntry } from '@/lib/types';

export type SharedData = { words: WordIndexEntry[]; roots: RootEntry[]; patterns: Pattern[] };

/** Loads the shared word index, roots and patterns, then renders children with them. */
export function DataGate({ children }: { children: (d: SharedData) => React.ReactNode }) {
  const words = useJson<WordIndexEntry[]>('/data/word-index.json');
  const roots = useJson<RootEntry[]>('/data/roots.json');
  const patterns = useJson<Pattern[]>('/data/patterns.json');
  if (words.data && roots.data && patterns.data)
    return <>{children({ words: words.data, roots: roots.data, patterns: patterns.data })}</>;
  const error = words.error || roots.error || patterns.error;
  return <p className="p-6 text-center text-muted">{error ? L.loadFailed : L.loading}</p>;
}
