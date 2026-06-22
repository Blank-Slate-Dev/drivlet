import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, ArrowRight, MessageCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/homepage/Footer';
import { LOCATIONS } from '@/lib/seo-data';
import { CANBERRA_COVERAGE } from '@/lib/coverage-areas';

export const metadata: Metadata = {
  title: 'Areas We Serve — Newcastle & Canberra | Drivlet',
  description:
    'See every area Drivlet covers for car service pickup and delivery across Newcastle, Canberra and Queanbeyan. From $119. Book online.',
  openGraph: {
    title: 'Areas We Serve — Newcastle & Canberra | Drivlet',
    description:
      'See every area Drivlet covers for car service pickup and delivery across Newcastle, Canberra and Queanbeyan. From $119. Book online.',
  },
  alternates: {
    canonical: 'https://drivlet.com.au/areas-we-serve',
  },
};

function SuburbChips({ suburbs }: { suburbs: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {suburbs.map((suburb) => (
        <span
          key={suburb}
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
        >
          {suburb}
        </span>
      ))}
    </div>
  );
}

export default function AreasWeServePage() {
  const newcastleSuburbs = LOCATIONS.newcastle.suburbs.map((s) => s.name);

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-emerald-50/60 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
            <MapPin className="h-4 w-4" />
            Coverage areas
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Areas we serve
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Car service pickup and delivery across Newcastle and Canberra — here&apos;s
            where we cover.
          </p>
        </div>
      </section>

      {/* Newcastle */}
      <section id="newcastle" className="scroll-mt-20 border-b border-slate-200 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <MapPin className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Newcastle, NSW
              </h2>
              <p className="text-sm text-slate-500">Newcastle region</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              Newcastle region
            </h3>
            <SuburbChips suburbs={newcastleSuburbs} />
          </div>
        </div>
      </section>

      {/* Canberra & surrounds */}
      <section id="canberra" className="scroll-mt-20 border-b border-slate-200 bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <MapPin className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Canberra &amp; surrounds, ACT/NSW
              </h2>
              <p className="text-sm text-slate-500">
                Canberra districts and Queanbeyan region
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {CANBERRA_COVERAGE.map((region) => (
              <div key={region.id}>
                {/* Region sub-header for Queanbeyan */}
                {region.id === 'queanbeyan' && (
                  <h3 className="mb-4 mt-2 text-xl font-bold text-slate-800">
                    {region.name}, {region.stateShort}
                  </h3>
                )}

                <div className="space-y-4">
                  {region.districts.map((district) => (
                    <div
                      key={district.name}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <h4 className="mb-3 text-base font-semibold text-slate-800">
                        {district.name}
                      </h4>
                      <SuburbChips suburbs={district.suburbs} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm sm:p-10">
            <h2 className="text-2xl font-bold text-slate-900">
              Ready to book?
            </h2>
            <p className="mt-2 text-slate-600">
              Skip the trip to the mechanic. We pick up your car, take it in, and
              bring it back — from $119.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/booking"
                className="group inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
              >
                Book a service
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4" />
                Contact us
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Don&apos;t see your suburb?{' '}
              <Link href="/contact" className="font-medium text-emerald-600 hover:underline">
                Contact us to check coverage.
              </Link>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
