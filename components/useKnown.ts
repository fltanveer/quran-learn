'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { isKnownCard } from '@/lib/fsrs';

/** Word forms the user knows: marked by hand, or learned through review. */
export function useKnown(): Set<string> {
  const manual = useLiveQuery(() => db.known.toArray(), []);
  const cards = useLiveQuery(() => db.cards.toArray(), []);
  return useMemo(() => {
    const set = new Set((manual ?? []).map((k) => k.ar));
    for (const c of cards ?? []) if (isKnownCard(c.card)) set.add(c.ar);
    return set;
  }, [manual, cards]);
}
