// src/components/homepage/HomeContent.tsx
'use client';

import { MapPin } from 'lucide-react';
// HIDDEN FOR CURRENT PHASE — location page links. Re-enable when expanding launch areas.
// import Link from 'next/link';
import Header from '@/components/Header';
import HeroSection from '@/components/homepage/HeroSection';
import ValuePropsSection from '@/components/homepage/ValuePropsSection';
import HowItWorksSection from '@/components/homepage/HowItWorksSection';
import InteractiveServicesSection from '@/components/homepage/InteractiveServicesSection';
import TestimonialsSection from '@/components/homepage/TestimonialsSection';
import FAQSection from '@/components/homepage/FAQSection';
import Footer from '@/components/homepage/Footer';
// HIDDEN FOR CURRENT PHASE — location page links. Re-enable when expanding launch areas.
// import { LOCATIONS } from '@/lib/seo-data';

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

      {/* Areas We Serve Section */}
      <section className="border-b border-slate-200 bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Areas we serve
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Drivlet currently operates across NSW and Canberra.
          </p>

          {/* HIDDEN FOR CURRENT PHASE — location page links. Re-enable when expanding launch areas.
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {Object.values(LOCATIONS).map((location) => (
              <Link
                key={location.slug}
                href={`/areas-we-serve#${location.slug}`}
                className="group flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-slate-900 transition group-hover:text-emerald-600">
                  {location.name}, {location.stateShort}
                </h3>
              </Link>
            ))}
          </div>
          */}

          {/* Non-clickable current-service-area badges */}
          <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
            {[
              { label: 'New South Wales' },
              { label: 'Canberra (ACT)' },
            ].map((area) => (
              <div
                key={area.label}
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-emerald-700 shadow-sm"
              >
                <MapPin className="h-5 w-5 shrink-0" />
                <span className="text-lg font-semibold">{area.label}</span>
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