import type { Metadata } from 'next';
import { ReviewPage } from '@/components/ReviewPage';
import { getSurahList } from '@/lib/data';
import { L } from '@/lib/bangla-labels';

export const metadata: Metadata = { title: `${L.review} | ${L.appName}` };

export default function Page() {
  return <ReviewPage surahs={getSurahList()} />;
}
