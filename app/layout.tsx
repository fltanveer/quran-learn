import type { Metadata, Viewport } from 'next';
import { Amiri_Quran, Hind_Siliguri } from 'next/font/google';
import { ThemeSync } from '@/components/ThemeSync';
import { SwRegister } from '@/components/SwRegister';
import { L } from '@/lib/bangla-labels';
import './globals.css';

const amiri = Amiri_Quran({ weight: '400', subsets: ['arabic'], variable: '--font-amiri-quran', display: 'swap' });
const hind = Hind_Siliguri({
  weight: ['400', '500', '600'],
  subsets: ['bengali', 'latin'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

export const metadata: Metadata = {
  title: L.appName,
  description: 'রুট, প্যাটার্ন ও শব্দের মাধ্যমে কুরআন বুঝে তিলাওয়াত',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: L.appName, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf8f1' },
    { media: '(prefers-color-scheme: dark)', color: '#121614' },
  ],
};

// Applies the saved theme before first paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${amiri.variable} ${hind.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeSync />
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
