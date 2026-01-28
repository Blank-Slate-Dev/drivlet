// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import PerformanceWrapper from '@/components/PerformanceWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'drivlet – Service done, without the run.',
    template: '%s | drivlet',
  },
  description:
    'drivlet picks up your car from work, gets it serviced at a trusted garage, and brings it back before you clock off. No waiting rooms, no wasted days off.',
  keywords: [
    'car service pick up',
    'car service while at work',
    'mobile car service pickup',
    'Newcastle car service',
    'logbook service pickup',
    'drivlet',
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    title: 'drivlet – Service done, without the run.',
    description:
      'Book a car service that happens while you work. We collect your car, coordinate with trusted garages, and return it before the end of your day.',
    url: 'https://drivlet.example', // update later when you have a real domain
    siteName: 'drivlet',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Early mobile detection to prevent layout shifts */}
        <Script
          id="mobile-detection"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (window.innerWidth < 768 || 'ontouchstart' in window) {
                  document.documentElement.classList.add('mobile-device');
                  window.__DRIVLET_MOBILE__ = true;
                }
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                  document.documentElement.classList.add('reduce-motion');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}
      >
        <PerformanceWrapper>
          <SessionProvider>{children}</SessionProvider>
        </PerformanceWrapper>
      </body>
    </html>
  );
}
