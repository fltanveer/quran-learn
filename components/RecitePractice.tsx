'use client';

import { useEffect, useRef, useState } from 'react';
import { matchWords, type WordResult } from '@/lib/arabic-match';
import { L } from '@/lib/bangla-labels';
import type { Ayah } from '@/lib/types';

const AUDIO_BASE = 'https://everyayah.com/data/Alafasy_128kbps/';
const p3 = (n: number) => String(n).padStart(3, '0');

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib everywhere).
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
const getRecognition = (): (new () => Recognition) | undefined =>
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as Record<string, unknown>).SpeechRecognition ??
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => Recognition) | undefined;

/** Record an ayah, play it next to the qari, and (where supported) flag words the recognizer did not hear. */
export function RecitePractice({ surah, ayah }: { surah: number; ayah: Ayah }) {
  const [recording, setRecording] = useState(false);
  const [myUrl, setMyUrl] = useState<string | null>(null);
  const [heard, setHeard] = useState('');
  const [result, setResult] = useState<{ words: WordResult[]; extra: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speechOk, setSpeechOk] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const recog = useRef<Recognition | null>(null);
  const transcript = useRef('');
  const player = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSpeechOk(!!getRecognition());
    return () => {
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
      recog.current?.stop();
      player.current?.pause();
    };
  }, []);

  useEffect(() => () => {
    if (myUrl) URL.revokeObjectURL(myUrl);
  }, [myUrl]);

  const play = (src: string) =>
    new Promise<void>((resolve) => {
      player.current?.pause();
      const a = new Audio(src);
      player.current = a;
      a.onended = () => resolve();
      a.onerror = () => {
        setError(L.audioOffline);
        resolve();
      };
      a.play().catch(() => {
        setError(L.audioOffline);
        resolve();
      });
    });

  const qariUrl = `${AUDIO_BASE}${p3(surah)}${p3(ayah.n)}.mp3`;

  const start = async () => {
    setError(null);
    setResult(null);
    setHeard('');
    transcript.current = '';
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(L.micDenied);
      return;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setMyUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
    };
    rec.start();
    recorder.current = rec;

    const R = getRecognition();
    if (R) {
      const r = new R();
      r.lang = 'ar-SA';
      r.continuous = true;
      r.interimResults = false;
      r.onresult = (e) => {
        transcript.current = Array.from(e.results)
          .map((res) => res[0].transcript)
          .join(' ');
      };
      r.onerror = (e) => e.error !== 'no-speech' && e.error !== 'aborted' && setError(L.speechFailed);
      r.onend = () => {
        setHeard(transcript.current);
        if (transcript.current) setResult(matchWords(ayah.words.map((w) => w.ar), transcript.current));
      };
      try {
        r.start();
        recog.current = r;
      } catch {
        recog.current = null;
      }
    }
    setRecording(true);
  };

  const stop = () => {
    recorder.current?.stop();
    recog.current?.stop();
    setRecording(false);
  };

  const compare = async () => {
    if (!myUrl) return;
    await play(qariUrl);
    await play(myUrl);
  };

  const missing = result?.words.filter((w) => w.status === 'missing').length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-2xl bg-accent-soft p-3 text-sm">{L.practiceIntro}</p>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => play(qariUrl)} className="min-h-12 rounded-2xl border border-line px-3">
          ▶ {L.listenQari}
        </button>
        {recording ? (
          <button type="button" onClick={stop} className="min-h-12 rounded-2xl bg-root px-3 font-medium text-paper">
            ■ {L.stopRecording}
          </button>
        ) : (
          <button type="button" onClick={start} className="min-h-12 rounded-2xl bg-accent px-3 font-medium text-paper">
            ● {L.record}
          </button>
        )}
        <button
          type="button"
          disabled={!myUrl || recording}
          onClick={() => myUrl && play(myUrl)}
          className="min-h-12 rounded-2xl border border-line px-3 disabled:opacity-50"
        >
          ▶ {L.listenMine}
        </button>
        <button
          type="button"
          disabled={!myUrl || recording}
          onClick={compare}
          className="min-h-12 rounded-2xl border border-line px-3 disabled:opacity-50"
        >
          ⇄ {L.compare}
        </button>
      </div>

      {recording && (
        <p role="status" className="text-center text-root">
          ● {L.recordingNow}
        </p>
      )}
      {error && <p className="text-sm text-root">{error}</p>}
      {!speechOk && <p className="text-xs text-muted">{L.speechUnsupported}</p>}

      {result && (
        <section className="rounded-2xl border border-line p-4">
          <h3 className="mb-2 font-semibold">{L.wordCheck}</h3>
          <p lang="ar" dir="rtl" className="quran text-3xl">
            {ayah.words.map((w, i) => (
              <span
                key={w.pos}
                className={result.words[i].status === 'ok' ? 'text-accent' : 'text-root underline decoration-wavy'}
              >
                {w.ar}{' '}
              </span>
            ))}
          </p>
          <p className="mt-2 text-sm">{missing === 0 ? L.allWordsHeard : `${L.missingWords}: ${missing}`}</p>
          {heard && (
            <p className="mt-2 text-xs text-muted">
              {L.heardText}:{' '}
              <span lang="ar" dir="rtl">
                {heard}
              </span>
            </p>
          )}
          <p className="mt-2 text-xs text-muted">{L.notTajweed}</p>
        </section>
      )}
    </div>
  );
}
