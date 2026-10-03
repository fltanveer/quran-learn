import { HomeView } from '@/components/HomeView';
import { getSalahSurahs, getSurah, getSurahList } from '@/lib/data';

export default function HomePage() {
  const surahs = getSurahList();
  const wordsBySurah = Object.fromEntries(
    surahs.map((s) => [s.surah, getSurah(s.surah).ayahs.flatMap((a) => a.words.map((w) => w.ar))]),
  );
  return <HomeView surahs={surahs} wordsBySurah={wordsBySurah} defaultSalah={getSalahSurahs()} />;
}
