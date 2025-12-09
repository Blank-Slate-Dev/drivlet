// src/app/page.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  Clock,
  ShieldCheck,
  Wrench,
  ArrowRight,
  MapPin,
  Users,
  CheckCircle2,
  ChevronDown,
  Star,
  Phone,
  Mail,
  Calendar,
  Settings,
  Gauge,
  Zap,
} from 'lucide-react';

type VehicleDetails = {
  make: string;
  model: string;
  year: number;
  series?: string;
  fuel_type?: string;
  transmission?: string;
};

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [isLookingUpRego, setIsLookingUpRego] = useState(false);
  const [regoError, setRegoError] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(
    null
  );

  const faqs = [
    {
      question: 'Who is going to drive my car?',
      answer:
        'All drivlet drivers are fully insured, background-checked professionals. We treat every car as if it were our own.',
    },
    {
      question: 'What garage will my car go to?',
      answer:
        'We partner with vetted local garages that meet our quality standards. You can request a specific garage or let us match you with the best option for your service needs.',
    },
    {
      question: 'How and when do I pay?',
      answer:
        'You pay after the service is complete. We send you a clear breakdown of the service cost plus our pick-up fee before any work begins.',
    },
    {
      question: 'What if additional work is needed?',
      answer:
        'We will always contact you before any additional work is approved. No surprise charges, ever.',
    },
    {
      question: 'Can I cancel my booking?',
      answer:
        'Yes, you can cancel or reschedule free of charge up to 24 hours before your scheduled pick-up time.',
    },
    {
      question: 'What areas do you service?',
      answer:
        'We currently operate in the Newcastle, NSW region and surrounding suburbs. We are expanding to more areas soon.',
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="relative h-12 w-40 sm:h-14 sm:w-48">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain"
                priority
              />
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
            <a href="#how-it-works" className="transition hover:text-emerald-600">
              How it works
            </a>
            <a href="#services" className="transition hover:text-emerald-600">
              Our services
            </a>
            <a href="#pricing" className="transition hover:text-emerald-600">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-emerald-600">
              FAQ
            </a>
          </nav>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowBookingPanel((prev) => !prev)}
              className="group flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            >
              Book a service
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button className="hidden text-sm font-medium text-slate-700 transition hover:text-emerald-600 sm:block">
              Login
            </button>
          </div>
        </div>
      </header>

      {/* SLIDE-DOWN BOOKING PANEL */}
      <AnimatePresence>
        {showBookingPanel && (
          <motion.section
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm"
          >
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                    Start a quick booking
                  </h2>
                  <p className="text-xs text-slate-500 sm:text-sm">
                    Tell us when and where – we&apos;ll match you with a vetted
                    local garage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBookingPanel(false)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Close
                </button>
              </div>

              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => e.preventDefault()}
              >
                {/* Earliest pick-up time */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 sm:text-sm">
                    Earliest pick-up time
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2"
                  />
                </div>

                {/* Latest drop-off time */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 sm:text-sm">
                    Latest drop-off time
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700 sm:text-sm">
                    Pick-up address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123 King St, Newcastle NSW"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2"
                  />
                  {/* Later we can plug in Google Maps / Places here */}
                </div>

                {/* State */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 sm:text-sm">
                    State
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2"
                    defaultValue="NSW"
                    id="rego-state"
                  >
                    <option value="NSW">NSW</option>
                    <option value="QLD">QLD</option>
                    <option value="VIC">VIC</option>
                    <option value="SA">SA</option>
                    <option value="WA">WA</option>
                    <option value="TAS">TAS</option>
                    <option value="NT">NT</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>

                {/* Registration + lookup */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 sm:text-sm">
                    Registration (rego)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. ABC123"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm uppercase text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2"
                      id="rego-plate"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        setRegoError(null);
                        setVehicleDetails(null);

                        const plateInput = document.getElementById(
                          'rego-plate'
                        ) as HTMLInputElement | null;
                        const stateSelect = document.getElementById(
                          'rego-state'
                        ) as HTMLSelectElement | null;

                        const plate = plateInput?.value || '';
                        const state = stateSelect?.value || '';

                        if (!plate.trim()) {
                          setRegoError('Please enter a registration plate.');
                          return;
                        }

                        setIsLookingUpRego(true);
                        try {
                          const res = await fetch('/api/rego', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ plate, state }),
                          });

                          const data = await res.json();

                          if (!res.ok || data.error) {
                            setRegoError(
                              data.error || 'Unable to find vehicle details.'
                            );
                            return;
                          }

                          setVehicleDetails({
                            make: data.make ?? 'Unknown',
                            model: data.model ?? 'Unknown',
                            year: data.year ?? 0,
                            series: data.series,
                            fuel_type: data.fuel_type,
                            transmission: data.transmission,
                          });
                        } catch (error) {
                          console.error(error);
                          setRegoError('Something went wrong. Please try again.');
                        } finally {
                          setIsLookingUpRego(false);
                        }
                      }}
                      className="whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                    >
                      {isLookingUpRego ? 'Looking up…' : 'Lookup'}
                    </button>
                  </div>
                  {regoError && (
                    <p className="mt-1 text-xs text-red-600">{regoError}</p>
                  )}
                </div>

                {/* Vehicle summary (from API/mock) */}
                {vehicleDetails && (
                  <div className="sm:col-span-2">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 sm:text-sm">
                      <p className="font-semibold">
                        Vehicle found:{' '}
                        {vehicleDetails.year
                          ? `${vehicleDetails.year} `
                          : ''}
                        {vehicleDetails.make} {vehicleDetails.model}
                      </p>
                      <p className="mt-1">
                        {vehicleDetails.series && (
                          <>
                            Series: {vehicleDetails.series}
                            {' • '}
                          </>
                        )}
                        {vehicleDetails.fuel_type && (
                              <>Fuel: {vehicleDetails.fuel_type} {' • '}</>
                        )}
                        {vehicleDetails.transmission && (
                          <>Transmission: {vehicleDetails.transmission}</>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit CTA */}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/35 transition hover:bg-emerald-600"
                  >
                    Continue to detailed booking
                  </button>
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* HERO - Fixter-style bold colored section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Left: Hero text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Car servicing,
                <br />
                <span className="text-emerald-300">made easy</span>
              </h1>
              <p className="mt-5 text-lg text-emerald-100 sm:text-xl">
                Hassle-free pick-up, service and drop-off while you work
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
                <button
                  type="button"
                  onClick={() => setShowBookingPanel(true)}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-7 py-3.5 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-amber-300"
                >
                  Book a service
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {/* Trust indicators */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-emerald-200 lg:justify-start">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <span>Trusted service</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  <span>Fully insured</span>
                </div>
              </div>
            </motion.div>

            {/* Right: Car image with floating badge */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              <div className="relative">
                <Image
                  src="/lamborghini_ariel_view.png"
                  alt="drivlet branded car"
                  width={700}
                  height={400}
                  className="mx-auto w-[60%] object-contain drop-shadow-2xl"
                  priority
                />
                {/* Floating badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="absolute -bottom-4 right-4 flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg sm:right-8"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Collection & Delivery available
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* VALUE PROPS - "Simply book online" section */}
      <section className="border-b border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Simply{' '}
              <span className="relative inline-block">
                book online
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  height="8"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 7 Q 50 0 100 7"
                    stroke="#fbbf24"
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </span>{' '}
              and we&apos;ll handle the rest
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Users,
                title: 'Advisors on your side',
                description:
                  'Our in-house experts make sure any quotes you receive are relevant and fairly priced, so no nasty surprises!',
              },
              {
                icon: Gauge,
                title: 'Fair pricing',
                description:
                  'We negotiate competitive rates with garages to offer the best prices, on average 30% cheaper than main dealerships.',
              },
              {
                icon: ShieldCheck,
                title: 'Vetted garages',
                description:
                  'We personally select and vet only the best local garages, fully covered by a 12-month warranty on parts and labour.',
              },
              {
                icon: Car,
                title: 'Collection from your door',
                description:
                  'Our fully insured drivers offer a contact-free collection and delivery service, with flexible time slots that suit you.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <item.icon className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - 4 steps */}
      <section
        id="how-it-works"
        className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Car servicing, made easy in{' '}
              <span className="relative inline-block font-semibold">
                4 steps
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  height="6"
                  viewBox="0 0 100 6"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 5 Q 50 0 100 5"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              </span>
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '1',
                title: 'Book online in 2 clicks',
                description:
                  'Share your rego, pick-up location, and service type. We handle the rest.',
              },
              {
                step: '2',
                title: 'We collect your car',
                description:
                  'Our fully insured drivers collect your car right from your doorstep or workplace.',
              },
              {
                step: '3',
                title: 'Your car gets serviced',
                description:
                  'We coordinate with our vetted garage network and keep you updated throughout.',
              },
              {
                step: '4',
                title: 'We return your car',
                description:
                  'Your serviced car is returned before the end of your workday, ready to drive home.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-xl font-bold text-slate-400">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section
        id="services"
        className="border-b border-slate-200 bg-white py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Our most popular services
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Standard Service',
                price: 'From $89 pick-up fee',
                color: 'bg-blue-500',
                icon: Settings,
              },
              {
                title: 'Major Service',
                price: 'From $139 pick-up fee',
                color: 'bg-emerald-500',
                icon: Wrench,
              },
              {
                title: 'Logbook Service',
                price: 'Get a quote',
                color: 'bg-amber-500',
                icon: Calendar,
              },
              {
                title: 'Diagnostics',
                price: 'Get a quote',
                color: 'bg-purple-500',
                icon: Zap,
              },
            ].map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className={`h-1.5 ${service.color}`} />
                <div className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <service.icon className="h-7 w-7 text-slate-600" />
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-900">
                    {service.title}
                  </h3>
                  <p className="mb-4 text-sm text-slate-500">
                    {service.price}
                  </p>
                  <a
                    href="#booking"
                    className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
                  >
                    Get a quote
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              What our customers say
            </h2>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-green-500 text-green-500"
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-slate-600">
                Excellent service
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Takes a lot of stress away',
                text: "Knowing someone was keeping an eye on everything to make sure I wasn't being overcharged takes a lot of stress out of having the work done.",
                name: 'Sarah M.',
                location: 'Newcastle',
              },
              {
                title: 'Excellent service',
                text: 'On time to pick up my car & drop it back. The main dealer quoted me $800 more. Lots different!',
                name: 'James T.',
                location: 'Maitland',
              },
              {
                title: 'Total game-changer!',
                text: 'It took about 5 minutes to book, hand over the key, and get it back. I was able to carry on working. Total game-changer!',
                name: 'Michelle K.',
                location: 'Lake Macquarie',
              },
              {
                title: 'No need to visit a garage',
                text: "Can't beat someone collecting the car and returning it a few hours later. No having to drive to a garage or hanging around waiting.",
                name: 'David R.',
                location: 'Charlestown',
              },
            ].map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-green-500 text-green-500"
                    />
                  ))}
                </div>
                <h4 className="mb-2 font-semibold text-slate-900">
                  {testimonial.title}
                </h4>
                <p className="mb-4 text-sm leading-relaxed text-slate-600">
                  {testimonial.text}
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {testimonial.name},{' '}
                  <span className="font-normal text-slate-500">
                    {testimonial.location}
                  </span>
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-gradient-to-r from-emerald-700 to-teal-700 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Need a hand understanding your car needs?
          </h2>
          <p className="mt-3 text-emerald-100">
            Our in-house experts know cars, our garages and our drivers inside
            out.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="tel:+61400000000"
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-900 shadow-lg transition hover:bg-amber-300"
            >
              <Phone className="h-5 w-5" />
              Call us
            </a>
            <a
              href="mailto:hello@drivlet.com.au"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-6 py-3 font-medium text-white transition hover:bg-white/10"
            >
              <Mail className="h-5 w-5" />
              Email us
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="border-b border-slate-200 bg-white py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
            {/* Left: Title */}
            <div>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                Common questions about booking at drivlet
              </h2>
            </div>

            {/* Right: Accordion */}
            <div className="divide-y divide-slate-200">
              {faqs.map((faq, index) => (
                <div key={index} className="py-4">
                  <button
                    onClick={() =>
                      setOpenFaq(openFaq === index ? null : index)
                    }
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-base font-medium text-slate-900 sm:text-lg">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${
                        openFaq === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {openFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              <div className="pt-4">
                <a
                  href="#"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Can&apos;t find your answer? Check our FAQ →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOOKING FORM SECTION */}
      <section
        id="booking"
        className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg sm:p-10">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Start a provisional booking
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Fill in your details and we&apos;ll confirm availability with
                our partner garages.
              </p>
            </div>

            <form className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Your name
                  </label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Your email
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Where will your car be?
                </label>
                <input
                  type="text"
                  placeholder="e.g. Newcastle CBD office carpark"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Registration (rego)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABC 123"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Preferred date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Service type
                </label>
                <select className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2">
                  <option value="standard">
                    Standard service ($89 pick-up)
                  </option>
                  <option value="major">Major service ($139 pick-up)</option>
                  <option value="logbook">Logbook service</option>
                  <option value="diagnostic">Diagnostic / other</option>
                </select>
              </div>

              <button
                type="button"
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
              >
                Request provisional booking
              </button>

              <p className="text-center text-xs leading-relaxed text-slate-500">
                No payment taken yet. A drivlet team member will confirm
                availability with our partner garages and get back to you.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-emerald-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand column */}
            <div>
              <div className="relative mb-4 h-10 w-32">
                <Image
                  src="/logo.png"
                  alt="drivlet"
                  fill
                  className="object-contain brightness-0 invert"
                />
              </div>
              <p className="text-sm text-emerald-200">
                Service done, without the run.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs text-emerald-300">
                <MapPin className="h-3.5 w-3.5" />
                Based in Newcastle, NSW
              </div>
            </div>

            {/* Meet drivlet */}
            <div>
              <h4 className="mb-4 font-semibold">Meet drivlet</h4>
              <ul className="space-y-2 text-sm text-emerald-200">
                <li>
                  <a href="#" className="transition hover:text-white">
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="transition hover:text-white"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#faq" className="transition hover:text-white">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#booking" className="transition hover:text-white">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Popular Services */}
            <div>
              <h4 className="mb-4 font-semibold">Popular Services</h4>
              <ul className="space-y-2 text-sm text-emerald-200">
                <li>
                  <a
                    href="#services"
                    className="transition hover:text-white"
                  >
                    Standard service
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    className="transition hover:text-white"
                  >
                    Major service
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    className="transition hover:text-white"
                  >
                    Logbook service
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    className="transition hover:text-white"
                  >
                    Car diagnostic
                  </a>
                </li>
              </ul>
            </div>

            {/* Terms */}
            <div>
              <h4 className="mb-4 font-semibold">Terms</h4>
              <ul className="space-y-2 text-sm text-emerald-200">
                <li>
                  <a href="#" className="transition hover:text-white">
                    Terms and Conditions
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-white">
                    Privacy Policy
                  </a>
                </li>
              </ul>
              <div className="mt-6">
                <h4 className="mb-2 font-semibold">For Garages</h4>
                <a
                  href="#"
                  className="text-sm text-emerald-200 transition hover:text-white"
                >
                  Garage Login →
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-emerald-800 pt-6 text-center text-xs text-emerald-300">
            © {new Date().getFullYear()} drivlet. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
