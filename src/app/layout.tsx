// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/JsonLd';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://drivlet.com.au'),
  title: {
    default: 'Drivlet – Car Service Pickup & Delivery | Newcastle & Canberra',
    template: '%s | Drivlet',
  },
  description:
    'Drivlet picks up your car, delivers it to your chosen service centre, and returns it — so you don\'t have to take time off work. Serving Newcastle and Canberra. From $119.',
  keywords: [
    'car service pickup',
    'car service delivery',
    'car service pickup and delivery',
    'car service while at work',
    'mobile car service pickup',
    'car pickup and return',
    'Newcastle car service pickup',
    'Canberra car service pickup',
    'car service transport',
    'mechanic pickup service',
    'logbook service pickup',
    'car service no time off work',
    'drivlet',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    title: 'Drivlet – Car Service Pickup & Delivery',
    description:
      'We pick up your car, deliver it to your chosen service centre, and return it. Serving Newcastle & Canberra. From $119.',
    url: 'https://drivlet.com.au',
    siteName: 'Drivlet',
    locale: 'en_AU',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 400,
        alt: 'Drivlet - Car Service Pickup & Delivery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Drivlet – Car Service Pickup & Delivery',
    description:
      'We pick up your car, deliver it to your service centre, and return it. No time off work needed.',
  },
  alternates: {
    canonical: 'https://drivlet.com.au',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.png',
  },
  verification: {
    // Add these once you set up Google Search Console & Bing Webmaster Tools:
    // google: 'your-google-verification-code',
    // other: { 'msvalidate.01': 'your-bing-verification-code' },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}
      >
        {/* Global structured data */}
        <OrganizationJsonLd />
        <WebSiteJsonLd />

        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
