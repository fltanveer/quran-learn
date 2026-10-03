import type { Metadata } from 'next';
import Link from 'next/link';
import { getSources } from '@/lib/data';
import { L } from '@/lib/bangla-labels';

export const metadata: Metadata = { title: `${L.about} | ${L.appName}` };

export default function AboutPage() {
  const sources = getSources();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pb-16 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L.about}</h1>
        <Link href="/" className="min-h-11 rounded-2xl border border-line px-4 py-2 text-sm">
          {L.home}
        </Link>
      </header>

      <section className="rounded-3xl bg-accent-soft p-5 leading-relaxed">
        <p>
          এই অ্যাপ কোনো অর্থ বা ব্যাখ্যা নিজে তৈরি করে না। কুরআনের পাঠ, অনুবাদ ও তাফসীর নিচের উৎস থেকে হুবহু নেওয়া
          হয়েছে, কোনো পরিবর্তন ছাড়া। প্রতিটি অনুবাদ ও তাফসীরের সাথে উৎস ও লেখকের নাম দেখানো হয়।
        </p>
        <p className="mt-2">
          আপনার অগ্রগতি, নোট ও রিভিউ কার্ড শুধু এই ডিভাইসেই (IndexedDB) থাকে। কোথাও পাঠানো হয় না। এটি একটি
          ব্যক্তিগত, অবাণিজ্যিক অ্যাপ।
        </p>
      </section>

      <ul className="flex flex-col gap-4">
        {sources.map((s) => (
          <li key={s.id} className="rounded-3xl bg-card p-5 ring-1 ring-line">
            <h2 className="text-lg font-semibold" lang="en">
              {s.name}
            </h2>
            <p className="text-sm text-muted">
              {s.author} · {s.content}
            </p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted">{L.license}</dt>
              <dd lang="en">{s.license}</dd>
              <dt className="text-muted">{L.version}</dt>
              <dd lang="en">{s.version}</dd>
              <dt className="text-muted">{L.downloaded}</dt>
              <dd lang="en">{s.downloaded}</dd>
              <dt className="text-muted">{L.source}</dt>
              <dd className="break-all">
                <a href={s.source_url} className="text-accent underline" rel="noopener">
                  {s.source_url}
                </a>
              </dd>
              {s.required_link && s.required_link !== s.source_url && (
                <>
                  <dt className="text-muted">লিংক</dt>
                  <dd className="break-all">
                    <a href={s.required_link} className="text-accent underline" rel="noopener">
                      {s.required_link}
                    </a>
                  </dd>
                </>
              )}
            </dl>
            {s.notes && (
              <p className="mt-2 text-sm text-muted" lang="en">
                {L.notes}: {s.notes}
              </p>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-accent">লাইসেন্সের পূর্ণ বিবরণ</summary>
              <pre lang="en" className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted">
                {s.license_note}
              </pre>
            </details>
          </li>
        ))}
      </ul>

      <section className="rounded-3xl bg-card p-5 text-sm leading-relaxed ring-1 ring-line">
        <h2 className="mb-2 text-base font-semibold">ফন্ট</h2>
        <p lang="en">
          Amiri Quran (SIL Open Font License) and Hind Siliguri (SIL Open Font License), served from the app itself
          via Google Fonts at build time.
        </p>
      </section>
    </main>
  );
}
