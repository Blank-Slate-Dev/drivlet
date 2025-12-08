'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Car,
  Clock,
  ShieldCheck,
  MapPin,
  Wrench,
  Users,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo + brand */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-28 sm:h-10 sm:w-32">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                drivlet
              </span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Service done, without the run.
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#how-it-works" className="hover:text-slate-900">
              How it works
            </a>
            <a href="#pricing" className="hover:text-slate-900">
              Pricing
            </a>
            <a href="#drivers" className="hover:text-slate-900">
              For drivers
            </a>
            <a href="#garages" className="hover:text-slate-900">
              For garages
            </a>
            <button className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-600">
              Log in
            </button>
            <button className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500">
              Get started
            </button>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:flex-row lg:items-center lg:gap-16 lg:py-20">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl space-y-6"
          >
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              NEW – SERVICING WHILE YOU WORK
            </span>

            <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Get your car serviced
              <span className="block text-emerald-600">
                without losing a day off.
              </span>
            </h1>

            <p className="text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
              drivlet picks up your car from work in the morning, coordinates
              the service with a trusted local garage, and drops it back before
              you clock off. No waiting rooms, no awkward upsell chats, no
              wasted time.
            </p>

            <div className="grid gap-3 text-sm text-slate-800 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <p>
                  Pick-up and drop-off around your workday – no need to take
                  time off.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <p>We only work with vetted, insured garages we trust.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <Wrench className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <p>
                  You pay the regular service price – we negotiate behind the
                  scenes.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <Car className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <p>Suited to logbook, standard and major services.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#booking"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-500"
              >
                Get a pick-up quote
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              <p className="text-xs text-slate-500 sm:text-sm">
                From $89 pick-up fee for standard services · $139 for major
                services
              </p>
            </div>
          </motion.div>

          {/* Right: simple booking card (static for now) */}
          <motion.div
            id="booking"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
          >
            <h2 className="text-base font-semibold text-slate-900">
              Start a provisional booking
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              This form is visual only for now. We&apos;ll wire it to real
              booking logic and rego checks once the flow is finalised.
            </p>

            <form className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Where is your car during the day?
                </label>
                <input
                  type="text"
                  placeholder="e.g. Newcastle CBD, office carpark"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Registration (rego)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABC 123"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Preferred service date
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Service type
                </label>
                <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-1">
                  <option value="standard">Standard service</option>
                  <option value="major">Major service</option>
                  <option value="logbook">Logbook service</option>
                  <option value="diagnostic">Diagnostic / other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Your email
                </label>
                <input
                  type="email"
                  placeholder="For confirmation details"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1"
                />
              </div>

              <button
                type="button"
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-500"
              >
                Request provisional booking
              </button>

              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                No payment taken yet. A drivlet team member will confirm
                availability with our partner garages and manually confirm your
                booking.
              </p>
            </form>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="border-b border-slate-200 bg-slate-50"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              How drivlet works
            </h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              A simple, four-step flow that fits around your workday.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {[
              {
                step: '01',
                title: 'You book online',
                text: 'Tell us your rego, where the car is parked, and what kind of service you need.',
              },
              {
                step: '02',
                title: 'We confirm with a garage',
                text: 'We negotiate with trusted local garages and lock in a time and price.',
              },
              {
                step: '03',
                title: 'We pick up your car',
                text: 'A drivlet driver collects your keys, takes the car to the garage, and keeps you updated.',
              },
              {
                step: '04',
                title: 'We bring it back',
                text: 'Your serviced car is returned before the end of your workday, ready for the drive home.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                  Step {item.step}
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING / VALUE */}
      <section
        id="pricing"
        className="border-b border-slate-200 bg-white py-12 sm:py-16"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
            {/* Left: summary */}
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-3 text-sm text-slate-600 sm:text-base">
                drivlet makes money in two ways: a clear pick-up fee to you, and
                negotiated garage rates behind the scenes. You still pay the
                normal service price you&apos;re used to &mdash; we just handle
                the logistics and negotiation.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-800">
                <li>• Standard service pick-up fee: from $89</li>
                <li>• Major service pick-up fee: from $139</li>
                <li>• You pay the garage&apos;s usual service price</li>
                <li>
                  • We may secure a cheaper rate &mdash; we keep the difference
                  for bringing them the work
                </li>
              </ul>
            </div>

            {/* Right: quick comparison card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Compared to a normal service day:
              </h3>
              <div className="mt-4 grid gap-4 text-xs text-slate-700 sm:text-sm">
                <div className="rounded-xl bg-white p-4 shadow-xs border border-slate-100">
                  <p className="font-semibold text-slate-900">
                    A &quot;typical&quot; service day
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li>• Take time off work or sacrifice a day off</li>
                    <li>• Sit in a waiting room, juggling calls and emails</li>
                    <li>• Navigate upsell conversations in person</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-emerald-600 p-4 text-white shadow-xs">
                  <p className="font-semibold">With drivlet</p>
                  <ul className="mt-2 space-y-1 text-emerald-50">
                    <li>• Stay at work &mdash; your day continues as normal</li>
                    <li>• We deal with the garage and logistics</li>
                    <li>• Clear pick-up fee; regular service prices</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOR DRIVERS & GARAGES */}
      <section
        id="drivers"
        className="border-b border-slate-200 bg-slate-50 py-12 sm:py-16"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2">
            {/* Drivers */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                For busy drivers
              </h2>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                You shouldn&apos;t have to waste personal time sorting out car
                servicing. drivlet is built for people who value their hours as
                much as their car.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-800">
                <li>• No more sitting in waiting rooms</li>
                <li>• Avoid awkward in-person upsell pressure</li>
                <li>• Keep weekends and days off for yourself</li>
                <li>• Transparent pick-up fees and clear communication</li>
              </ul>
            </div>

            {/* Garages */}
            <div id="garages">
              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                For local garages
              </h2>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                drivlet sends you ready-to-go service bookings from customers
                who might otherwise delay their servicing. We handle logistics
                and communication so you can focus on the work.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-800">
                <li>• More cars through the door without extra admin</li>
                <li>• Access to drivers who avoid traditional servicing</li>
                <li>• We coordinate drop-offs and pick-ups on time</li>
                <li>• Future: online garage portal for quotes & capacity</li>
              </ul>

              <button className="mt-4 inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-600">
                Register your garage (coming soon)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative h-7 w-20">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain"
              />
            </div>
            <p>© {new Date().getFullYear()} drivlet. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="h-3 w-3" />
              Based in Newcastle, NSW
            </span>
            <span className="text-[11px] text-slate-500">
              Built for people who hate wasting time at the mechanic.
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
