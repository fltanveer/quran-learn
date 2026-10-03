'use client';

import { useEffect, useState } from 'react';

// One in-memory copy per URL. The service worker keeps the files for offline use.
const cache = new Map<string, Promise<unknown>>();

export function loadJson<T>(url: string): Promise<T> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${url}: ${r.status}`))));
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p as Promise<T>;
}

/** Static JSON from /public/data. `data` is undefined while loading; `error` is set if it failed. */
export function useJson<T>(url: string | null): { data: T | undefined; error: boolean } {
  const [state, setState] = useState<{ url: string | null; data?: T; error: boolean }>({ url, error: false });
  useEffect(() => {
    if (!url) return;
    let live = true;
    loadJson<T>(url)
      .then((data) => live && setState({ url, data, error: false }))
      .catch(() => live && setState({ url, error: true }));
    return () => {
      live = false;
    };
  }, [url]);
  return state.url === url ? { data: state.data, error: state.error } : { data: undefined, error: false };
}
