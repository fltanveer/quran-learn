'use client';

import { DataGate } from './DataGate';
import { ReviewView } from './ReviewView';
import type { SurahMeta } from '@/lib/types';

export function ReviewPage({ surahs }: { surahs: SurahMeta[] }) {
  return <DataGate>{(d) => <ReviewView {...d} surahs={surahs} />}</DataGate>;
}
