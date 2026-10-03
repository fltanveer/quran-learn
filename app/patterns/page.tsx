import type { Metadata } from 'next';
import { PatternsPage } from '@/components/PatternsPage';
import { L } from '@/lib/bangla-labels';

export const metadata: Metadata = { title: `${L.patterns} | ${L.appName}` };

export default function Page() {
  return <PatternsPage />;
}
