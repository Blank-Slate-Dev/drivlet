// src/components/homepage/HomeContent.tsx
'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import HeroSection from '@/components/homepage/HeroSection';
import ValuePropsSection from '@/components/homepage/ValuePropsSection';
import HowItWorksSection from '@/components/homepage/HowItWorksSection';
import InteractiveServicesSection from '@/components/homepage/InteractiveServicesSection';
import TestimonialsSection from '@/components/homepage/TestimonialsSection';
import FAQSection from '@/components/homepage/FAQSection';
import Footer from '@/components/homepage/Footer';
import { LOCATIONS } from '@/lib/seo-data';

export default function HomeContent() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <HeroSection />

      {/* Value Props */}
      <ValuePropsSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Services Section */}
      <InteractiveServicesSection />

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
              <div key={location.slug} className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900">
                  <Link href={`/${location.slug}`} className="hover:text-emerald-600 transition">
                    {location.name}, {location.stateShort}
                  </Link>
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}