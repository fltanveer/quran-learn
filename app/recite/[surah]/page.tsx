import type { Metadata } from 'next';
import { ReciteView } from '@/components/ReciteView';
import { getPatterns, getRoots, getSummaries, getSurah, getSurahList } from '@/lib/data';

type Params = { surah: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getSurahList().map((s) => ({ surah: String(s.surah) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { surah } = await params;
  const s = getSurah(Number(surah));
  return { title: `${s.name_bn} | কুরআন বুঝে পড়ি` };
}

export default async function RecitePage({ params }: { params: Promise<Params> }) {
  const n = Number((await params).surah);
  const list = getSurahList();
  const idx = list.findIndex((s) => s.surah === n);
  return (
    <ReciteView
      data={getSurah(n)}
      roots={getRoots()}
      patterns={getPatterns()}
      summaries={getSummaries(n)}
      prev={list[idx - 1]}
      next={list[idx + 1]}
    />
  );
}
