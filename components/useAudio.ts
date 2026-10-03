'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const AUDIO_BASE = 'https://everyayah.com/data/Alafasy_128kbps/';
const p3 = (n: number) => String(n).padStart(3, '0');

/** One shared audio player for per-ayah recitation. */
export function useAyahAudio(surah: number) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [error, setError] = useState<number | null>(null);

  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    a.onended = () => setPlaying(null);
    audio.current = a;
    return () => {
      a.pause();
      audio.current = null;
    };
  }, []);

  const toggle = useCallback(
    async (ayah: number) => {
      const a = audio.current;
      if (!a) return;
      if (playing === ayah) {
        a.pause();
        setPlaying(null);
        return;
      }
      setError(null);
      a.src = `${AUDIO_BASE}${p3(surah)}${p3(ayah)}.mp3`;
      try {
        setPlaying(ayah);
        await a.play();
      } catch {
        setPlaying(null);
        setError(ayah);
      }
    },
    [playing, surah],
  );

  return { playing, error, toggle };
}
