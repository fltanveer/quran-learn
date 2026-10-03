import type { Metadata } from 'next';
import { PatternsView } from '@/components/PatternsView';
import { getPatterns, getWordIndex } from '@/lib/data';
import { L } from '@/lib/bangla-labels';

export const metadata: Metadata = { title: `${L.patterns} | ${L.appName}` };

export default function PatternsPage() {
  return <PatternsView patterns={getPatterns()} words={getWordIndex()} />;
}
