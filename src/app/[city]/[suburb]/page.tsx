// src/app/[city]/[suburb]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Phone,
  Shield,
  Star,
} from 'lucide-react';
import { LOCATIONS, getLocationFAQs, BASE_URL, BUSINESS_PHONE } from '@/lib/seo-data';
import {
  LocalBusinessJsonLd,
  FAQJsonLd,
  BreadcrumbJsonLd,
} from '@/components/seo/JsonLd';

// ─── Static Params ───────────────────────────────────────────────────────
export async function generateStaticParams() {
  const params: { city: string; suburb: string }[] = [];
  for (const [citySlug, cityData] of Object.entries(LOCATIONS)) {
    for (const suburb of cityData.suburbs) {
      params.push({ city: citySlug, suburb: suburb.slug });
    }
  }
  return params;
}

// ─── Dynamic Metadata ────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; suburb: string }>;
}): Promise<Metadata> {
  const { city, suburb: suburbSlug } = await params;
  const location = LOCATIONS[city];
  if (!location) return {};

  const suburb = location.suburbs.find((s) => s.slug === suburbSlug);
  if (!suburb) return {};

  const title = `Car Service Pickup & Delivery ${suburb.name}, ${location.name} | Drivlet`;
  const description = `Car service pickup and delivery in ${suburb.name}, ${location.name} ${location.stateShort}. Drivlet picks up your car, takes it to your mechanic, and returns it. From $119.`;

  return {
    title,
    description,
    keywords: [
      `car service ${suburb.name}`,
      `car service pickup ${suburb.name}`,
      `mechanic ${suburb.name}`,
      `car service delivery ${suburb.name} ${location.stateShort}`,
      `${suburb.name} car service transport`,
      `mobile car service ${suburb.name}`,
    ],
    alternates: {
      canonical: `${BASE_URL}/${location.slug}/${suburb.slug}`,
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${BASE_URL}/${location.slug}/${suburb.slug}`,
      siteName: 'Drivlet',
      locale: 'en_AU',
    },
  };
}

// ─── Page Component ──────────────────────────────────────────────────────
export default async function SuburbPage({
  params,
}: {
  params: Promise<{ city: string; suburb: string }>;
}) {
  const { city, suburb: suburbSlug } = await params;
  const location = LOCATIONS[city];
  if (!location) notFound();

  const suburb = location.suburbs.find((s) => s.slug === suburbSlug);
  if (!suburb) notFound();

  const faqs = getLocationFAQs(location.name);

  // Get sibling suburbs for internal linking
  const siblingSuburbs = location.suburbs
    .filter((s) => s.slug !== suburb.slug)
    .slice(0, 8);

  return (
    <>
      {/* Structured Data */}
      <LocalBusinessJsonLd
        city={location.name}
        state={location.state}
        latitude={location.latitude}
        longitude={location.longitude}
        suburbs={[suburb.name]}
      />
      <FAQJsonLd faqs={faqs.slice(0, 5)} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE_URL },
          { name: location.name, url: `${BASE_URL}/${location.slug}` },
          { name: suburb.name, url: `${BASE_URL}/${location.slug}/${suburb.slug}` },
        ]}
      />

      <main className="min-h-screen bg-white">
        {/* Header */}
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

        {/* Hero */}
        <section className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 py-14 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm text-emerald-200">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-2">/</span>
              <Link href={`/${location.slug}`} className="hover:text-white">{location.name}</Link>
              <span className="mx-2">/</span>
              <span className="text-white font-medium">{suburb.name}</span>
            </nav>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Car service pickup &amp; delivery in {suburb.name}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-emerald-100">
              {suburb.description}
            </p>

            <div className="mt-8">
              <Link
                href="/booking"
                className="group inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3.5 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-amber-300"
              >
                Book a pickup in {suburb.name} — $119
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-emerald-200">
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
                Fully insured
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Employee drivers
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="border-b border-slate-200 py-14 sm:py-18">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-900">
              How Drivlet works in {suburb.name}, {location.name}
            </h2>
            <div className="mt-6 space-y-4 text-slate-600">
              <p>
                Getting your car serviced in {suburb.name} shouldn&apos;t mean taking time off work or
                arranging a lift. Drivlet is a car service pickup and delivery service that handles the
                logistics for you.
              </p>
              <p>
                Book online, and we&apos;ll send an insured Drivlet employee driver to collect your car
                from your {suburb.name} address. We deliver it to your chosen mechanic or service centre
                in the {location.name} region, and return it to you once the service is complete.
              </p>
              <p>
                We photograph the condition of your car at pickup and return, and you can track the
                progress of your booking in real-time. Our flat-rate transport fee starts at $119, with
                any distance surcharges shown at checkout before you pay.
              </p>
            </div>

            <div className="mt-8">
              <Link
                href="/booking"
                className="group inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Book a pickup from {suburb.name}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-slate-200 bg-slate-50 py-14 sm:py-18">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-900">
              FAQs — {suburb.name} car service pickup
            </h2>
            <div className="mt-6 divide-y divide-slate-200">
              {faqs.slice(0, 5).map((faq, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex cursor-pointer items-center justify-between text-base font-medium text-slate-900">
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

        {/* Other Suburbs (Internal Linking) */}
        <section className="border-b border-slate-200 py-14 sm:py-18">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Also serving other {location.name} suburbs
            </h2>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {siblingSuburbs.map((s) => (
                <Link
                  key={s.slug}
                  href={`/${location.slug}/${s.slug}`}
                  className="group flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <MapPin className="h-4 w-4 text-slate-400 group-hover:text-emerald-500" />
                  Car service pickup {s.name}
                </Link>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              <Link href={`/${location.slug}`} className="text-emerald-600 hover:underline">
                View all {location.name} suburbs →
              </Link>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-emerald-700 py-14">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold text-white">
              Book your car service pickup in {suburb.name}
            </h2>
            <p className="mt-2 text-emerald-100">
              From $119. No time off work needed.
            </p>
            <Link
              href="/booking"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-8 py-4 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-amber-300"
            >
              Book Now
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 py-8">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
            <Link href="/" className="text-lg font-bold text-white">drivlet</Link>
            <p className="mt-2 text-sm text-slate-400">
              Car service pickup & delivery in {suburb.name}, {location.name}.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
              <Link href="/" className="hover:text-white">Home</Link>
              <Link href={`/${location.slug}`} className="hover:text-white">{location.name}</Link>
              <Link href="/booking" className="hover:text-white">Book</Link>
              <Link href="/contact" className="hover:text-white">Contact</Link>
              <Link href="/policies" className="hover:text-white">Policies</Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}