'use client';

import { useEffect } from 'react';
import { useSettings } from './useSettings';

/** Keeps the `dark` class on <html> in sync with the saved theme. */
export function ThemeSync() {
  const { theme, loaded } = useSettings();

  useEffect(() => {
    if (!loaded) return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    try {
      localStorage.setItem('theme', theme);
    } catch {}
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme, loaded]);

  return null;
}
