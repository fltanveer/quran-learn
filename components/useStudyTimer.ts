'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addStudySeconds, db, todayKey } from '@/lib/db';

const TICK = 15;
export const SESSION_GOAL_SECONDS = 12 * 60;

/** Counts visible reading time into today's total and reports when the daily session is done. */
export function useStudyTimer() {
  const today = useLiveQuery(() => db.days.get(todayKey()), []);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem('done-dismissed') === todayKey());
    } catch {}
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') addStudySeconds(TICK);
    }, TICK * 1000);
    return () => clearInterval(id);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('done-dismissed', todayKey());
    } catch {}
  };

  const seconds = today?.seconds ?? 0;
  return { seconds, done: seconds >= SESSION_GOAL_SECONDS && !dismissed, dismiss };
}
