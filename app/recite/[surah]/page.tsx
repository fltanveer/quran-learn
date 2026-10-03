import type { Metadata } from 'next';
import { ReciteView } from '@/components/ReciteView';
import { getSummaries, getSurah, getSurahLite, getSurahList, getTafsirSources } from '@/lib/data';

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
      data={getSurahLite(n)}
      summaries={getSummaries(n)}
      tafsirSources={getTafsirSources()}
      prev={list[idx - 1]}
      next={list[idx + 1]}
    />
  );
}
