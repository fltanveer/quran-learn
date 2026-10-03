'use client';

import { useEffect } from 'react';

/** Registers the service worker produced by scripts/build-sw.ts. Skipped in dev. */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
