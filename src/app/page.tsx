// src/app/page.tsx
// This is a SERVER COMPONENT.
// It renders structured data (JSON-LD) server-side and delegates the visible page
// to HomeContent which is a 'use client' component — but still SSR'd by Next.js.
// The key difference from before: NO dynamic() with ssr:false, so Google sees everything.

import HomeContent from '@/components/homepage/HomeContent';
import { FAQJsonLd, ServiceJsonLd } from '@/components/seo/JsonLd';
import { GLOBAL_FAQS } from '@/lib/seo-data';

export default function Home() {
  return (
    <>
      <FAQJsonLd faqs={GLOBAL_FAQS} />
      <ServiceJsonLd />
      <HomeContent />
    </>
  );
}
