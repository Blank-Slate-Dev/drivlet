// src/app/[city]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Shield,
  Star,
  Car,
  Wrench,
} from 'lucide-react';
import { LOCATIONS, getLocationFAQs, BASE_URL, BUSINESS_PHONE } from '@/lib/seo-data';
import {
  LocalBusinessJsonLd,
  FAQJsonLd,
  ServiceJsonLd,
  BreadcrumbJsonLd,
} from '@/components/seo/JsonLd';

// ─── Static Params (SSG for city pages) ──────────────────────────────────
export async function generateStaticParams() {
  return Object.keys(LOCATIONS).map((city) => ({ city }));
}

// ─── Dynamic Metadata ────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const location = LOCATIONS[city];
  if (!location) return {};

  return {
    title: location.metaTitle,
    description: location.metaDescription,
    keywords: [
      `car service pickup ${location.name}`,
      `car service delivery ${location.name}`,
      `car pickup and return ${location.name}`,
      `mobile car service ${location.name}`,
      `car service while at work ${location.name}`,
      `${location.name} car service transport`,
      `mechanic pickup service ${location.name}`,
      `drivlet ${location.name}`,
      ...location.suburbs.slice(0, 5).map((s) => `car service ${s.name} ${location.stateShort}`),
    ],
    alternates: {
      canonical: `${BASE_URL}/${location.slug}`,
    },
    openGraph: {
      type: 'website',
      title: location.metaTitle,
      description: location.metaDescription,
      url: `${BASE_URL}/${location.slug}`,
      siteName: 'Drivlet',
      locale: 'en_AU',
    },
  };
}

// ─── Page Component (Server Component — fully SSR) ───────────────────────
export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const location = LOCATIONS[city];
  if (!location) notFound();

  const faqs = getLocationFAQs(location.name);

  return (
    <>
      {/* Structured Data */}
      <LocalBusinessJsonLd
        city={location.name}
        state={location.state}
        latitude={location.latitude}
        longitude={location.longitude}
        suburbs={location.suburbs.map((s) => s.name)}
      />
      <FAQJsonLd faqs={faqs} />
      <ServiceJsonLd city={location.name} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE_URL },
          { name: location.name, url: `${BASE_URL}/${location.slug}` },
        ]}
      />

      <main className="min-h-screen bg-white">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative h-12 w-40 sm:h-14 sm:w-48">
                <Image src="/logo.png" alt="Drivlet" fill className="object-contain" priority />
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <a
                href={`tel:${BUSINESS_PHONE.replace(/\s/g, '')}`}
                className="hidden items-center gap-2 text-sm font-medium text-slate-600 sm:flex"
              >
                <Phone className="h-4 w-4" />
                {BUSINESS_PHONE}
              </a>
              <Link
                href="/booking"
                className="group flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
              >
                Book Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* ─── Hero Section ───────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 py-16 sm:py-24">
          <div className="absolute inset-0 z-0 opacity-10">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm text-emerald-200">
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="mx-2">/</span>
              <span className="text-white font-medium">{location.name}</span>
            </nav>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {location.heroHeading}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-emerald-100 sm:text-xl">
              {location.heroSubheading}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/booking"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-7 py-3.5 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-amber-300"
              >
                Book a pickup — $119
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href={`tel:${BUSINESS_PHONE.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 text-emerald-100 hover:text-white"
              >
                <Phone className="h-5 w-5" />
                or call {BUSINESS_PHONE}
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-emerald-200">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span>4.8/5 rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Fully insured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Employee drivers</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── How It Works ───────────────────────────────────────── */}
        <section className="border-b border-slate-200 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl">
              How it works in {location.name}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-slate-600">
              Three simple steps to get your car serviced without leaving work
            </p>

            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: '1',
                  icon: Clock,
                  title: 'Book online',
                  desc: `Choose a pickup window, enter your ${location.name} address, and tell us which workshop to deliver to.`,
                },
                {
                  step: '2',
                  icon: Car,
                  title: 'We pick up & deliver',
                  desc: `Our insured driver collects your car, takes condition photos, and delivers it to your chosen mechanic in ${location.name}.`,
                },
                {
                  step: '3',
                  icon: CheckCircle2,
                  title: 'We return it',
                  desc: 'When the service is done, we pick it up from the workshop and return it to you. Simple.',
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Value Props ────────────────────────────────────────── */}
        <section className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900">
              Why {location.name} locals choose Drivlet
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {[
                {
                  title: 'No time off work',
                  desc: `We pick up your car from your ${location.name} home or workplace so you don't have to take a day off for a service.`,
                },
                {
                  title: 'Your mechanic, your choice',
                  desc: `Book with any mechanic or service centre in the ${location.name} region. We deliver to whoever you choose.`,
                },
                {
                  title: 'Fully insured transport',
                  desc: 'Your car is covered under our commercial insurance while in our care. Employee drivers — not contractors.',
                },
                {
                  title: 'Real-time tracking',
                  desc: 'Track your car at every stage — from pickup to workshop drop-off to return delivery.',
                },
                {
                  title: 'Condition photos',
                  desc: 'We photograph your car at pickup and return for full transparency and peace of mind.',
                },
                {
                  title: 'Flat-rate pricing',
                  desc: 'Our transport fee starts at $119. No hidden costs — distance surcharges are shown at checkout before you pay.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Suburbs We Serve ───────────────────────────────────── */}
        <section className="border-b border-slate-200 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900">
              Suburbs we serve in {location.name}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              We cover all suburbs across the greater {location.name} region.
              Click a suburb to learn more about our service in your area.
            </p>
            <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {location.suburbs.map((suburb) => (
                <Link
                  key={suburb.slug}
                  href={`/${location.slug}/${suburb.slug}`}
                  className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <MapPin className="h-4 w-4 text-slate-400 group-hover:text-emerald-500" />
                  {suburb.name}
                  <span className="ml-auto text-xs text-slate-400">{suburb.postcode}</span>
                </Link>
              ))}
            </div>

            {location.nearbyAreas.length > 0 && (
              <p className="mt-6 text-center text-sm text-slate-500">
                We also serve nearby areas including{' '}
                {location.nearbyAreas.join(', ')}.{' '}
                <Link href="/contact" className="text-emerald-600 hover:underline">
                  Contact us
                </Link>{' '}
                to check coverage.
              </p>
            )}
          </div>
        </section>

        {/* ─── FAQ Section ────────────────────────────────────────── */}
        <section className="border-b border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-slate-900">
              Frequently asked questions — {location.name}
            </h2>
            <div className="mt-8 divide-y divide-slate-200">
              {faqs.map((faq, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex cursor-pointer items-center justify-between text-base font-medium text-slate-900 sm:text-lg">
                    {faq.question}
                    <span className="ml-4 flex-shrink-0 text-slate-400 group-open:rotate-180 transition-transform">
                      ▾
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA Section ────────────────────────────────────────── */}
        <section className="bg-emerald-700 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold text-white">
              Ready to skip the workshop waiting room?
            </h2>
            <p className="mt-3 text-lg text-emerald-100">
              Book a car service pickup in {location.name} today. From $119.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/booking"
                className="group inline-flex items-center gap-2 rounded-full bg-amber-400 px-8 py-4 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-amber-300"
              >
                Book Now
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-400 px-8 py-4 text-base font-semibold text-white transition hover:bg-emerald-600"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Footer ─────────────────────────────────────────────── */}
        <footer className="bg-slate-900 py-10">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
            <Link href="/" className="text-lg font-bold text-white">
              drivlet
            </Link>
            <p className="mt-2 text-sm text-slate-400">
              Car service pickup & delivery in {location.name}, {location.stateShort}.
              Commuto Group Pty Ltd (ABN 73 687 063 618).
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
              <Link href="/" className="hover:text-white">Home</Link>
              <Link href="/booking" className="hover:text-white">Book</Link>
              <Link href="/contact" className="hover:text-white">Contact</Link>
              <Link href="/track" className="hover:text-white">Track</Link>
              <Link href="/policies" className="hover:text-white">Policies</Link>
              {Object.values(LOCATIONS).map((loc) => (
                <Link key={loc.slug} href={`/${loc.slug}`} className="hover:text-white">
                  {loc.name}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}