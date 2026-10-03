import type { Metadata } from 'next';
import { ReviewView } from '@/components/ReviewView';
import { getPatterns, getRoots, getSurahList, getWordIndex } from '@/lib/data';
import { L } from '@/lib/bangla-labels';

export const metadata: Metadata = { title: `${L.review} | ${L.appName}` };

export default function ReviewPage() {
  return <ReviewView words={getWordIndex()} roots={getRoots()} patterns={getPatterns()} surahs={getSurahList()} />;
}
