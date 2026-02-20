// src/app/page.tsx
// SERVER COMPONENT — no 'use client', no dynamic() with ssr:false.
// All child components (even 'use client' ones) are SSR'd by Next.js App Router.
// This means Google sees ALL homepage content on first crawl.

import Link from 'next/link';
import Header from '@/components/Header';
import HeroSection from '@/components/homepage/HeroSection';
import ValuePropsSection from '@/components/homepage/ValuePropsSection';
import HowItWorksSection from '@/components/homepage/HowItWorksSection';
import InteractiveServicesSection from '@/components/homepage/InteractiveServicesSection';
import TestimonialsSection from '@/components/homepage/TestimonialsSection';
import FAQSection from '@/components/homepage/FAQSection';
import Footer from '@/components/homepage/Footer';
import { HomepageClientWrapper } from '@/components/homepage/HomepageClientWrapper';
import { FAQJsonLd, ServiceJsonLd } from '@/components/seo/JsonLd';
import { GLOBAL_FAQS, LOCATIONS } from '@/lib/seo-data';

export default function Home() {
  return (
    <>
      {/* Structured data — rendered server-side in HTML head */}
      <FAQJsonLd faqs={GLOBAL_FAQS} />
      <ServiceJsonLd />

      <HomepageClientWrapper>
        {(openBookingModal) => (
          <main className="min-h-screen bg-white">
            {/* Header */}
            <Header onBookingClick={openBookingModal} />

            {/* Hero Section */}
            <HeroSection />

            {/* Value Props */}
            <ValuePropsSection />

            {/* How It Works */}
            <HowItWorksSection />

            {/* Services Section */}
            <InteractiveServicesSection onBookingClick={openBookingModal} />

            {/* Testimonials Section */}
            <TestimonialsSection />

            {/* FAQ Section */}
            <FAQSection />

            {/* Location Links Section — crawlable internal links to city/suburb pages */}
            <section className="border-b border-slate-200 bg-slate-50 py-12 sm:py-16">
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
                  Areas we serve
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
                  Car service pickup and delivery across Newcastle and Canberra
                </p>

                <div className="mt-10 grid gap-8 sm:grid-cols-2">
                  {Object.values(LOCATIONS).map((location) => (
                    <div key={location.slug} className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="text-lg font-bold text-slate-900">
                        <Link href={`/${location.slug}`} className="hover:text-emerald-600 transition">
                          {location.name}, {location.stateShort}
                        </Link>
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Car service pickup &amp; delivery across the {location.name} region.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {location.suburbs.slice(0, 8).map((suburb) => (
                          <Link
                            key={suburb.slug}
                            href={`/${location.slug}/${suburb.slug}`}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            {suburb.name}
                          </Link>
                        ))}
                        {location.suburbs.length > 8 && (
                          <Link
                            href={`/${location.slug}`}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                          >
                            +{location.suburbs.length - 8} more
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Footer */}
            <Footer />
          </main>
        )}
      </HomepageClientWrapper>
    </>
  );
}
