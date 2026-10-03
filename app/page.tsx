import { HomeView } from '@/components/HomeView';
import { getAllWordForms, getSurahList } from '@/lib/data';

export default function HomePage() {
  return <HomeView surahs={getSurahList()} wordForms={getAllWordForms()} />;
}
