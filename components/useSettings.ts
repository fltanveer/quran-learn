'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS, type Settings } from '@/lib/db';

/** Saved settings merged over defaults. `loaded` is false until IndexedDB answers. */
export function useSettings(): Settings & { loaded: boolean } {
  // null = no row saved yet; undefined = query still running.
  const row = useLiveQuery(async () => (await db.settings.get('settings')) ?? null, []);
  return { ...DEFAULT_SETTINGS, ...(row ?? {}), loaded: row !== undefined };
}
