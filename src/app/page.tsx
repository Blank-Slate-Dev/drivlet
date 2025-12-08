'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Car,
  Clock,
  ShieldCheck,
  Wrench,
  ArrowRight,
  MapPin,
  Users,
} from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo + tagline */}
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-28 sm:h-10 sm:w-32">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">
                Service done, without the run.
              </span>
            </div>
          </div>

          {/* Simple nav */}
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

      {/* HERO – Fixter-style: text left, image right, booking card */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:flex-row lg:items-center lg:gap-14 lg:py-20">
          {/* LEFT: text content */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl space-y-6"
          >
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              CAR SERVICING WHILE YOU WORK
            </span>

            <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem]">
              We get your car serviced
              <span className="block text-emerald-600">
                while you get on with your day.
              </span>
            </h1>

            <p className="text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
              drivlet picks up your car from work in the morning, coordinates
              the service with a trusted local garage, and drops it back before
              you finish. No waiting rooms, no awkward upsell chats, no wasting
              a day off.
            </p>

            {/* Key benefits row (Fixter-style chips) */}
            <div className="grid gap-3 text-sm text-slate-800 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <Clock className="h-3.5 w-3.5 text-emerald-700" />
                </div>
                <p>Pick-up and drop-off around your work hours.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                </div>
                <p>Vetted, insured garages we trust with our own cars.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <Wrench className="h-3.5 w-3.5 text-emerald-700" />
                </div>
                <p>You pay the usual service price &mdash; we handle the rest.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <Car className="h-3.5 w-3.5 text-emerald-700" />
                </div>
                <p>Logbook, standard and major services supported.</p>
              </div>
            </div>

            {/* CTA row */}
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

          {/* RIGHT: image + booking card, Fixter-style stack */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="flex w-full flex-col gap-4 lg:max-w-md"
          >
            {/* Photo card */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100/40 shadow-sm">
              <div className="relative h-48 w-full sm:h-56 lg:h-64">
                <Image
                  src="/lamborghini_model.png"
                  alt="drivlet driver collecting a car for servicing"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Booking card */}
            <section
              id="booking"
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
            >
              <h2 className="text-sm font-semibold text-slate-900">
                Start a provisional booking
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                This form is a visual preview. We&apos;ll connect it to real
                bookings and rego checks once the flow is finalised.
              </p>

              <form className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Where will your car be?
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Newcastle CBD office carpark"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Registration (rego)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABC 123"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Preferred service date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Service type
                  </label>
                  <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-1">
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
                    placeholder="For booking confirmation"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1"
                  />
                </div>

                <button
                  type="button"
                  className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/25 transition hover:bg-emerald-500"
                >
                  Request provisional booking
                </button>

                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  No payment taken yet. A drivlet team member will confirm
                  availability with our partner garages and manually confirm
                  your booking.
                </p>
              </form>
            </section>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS – Fixter-style 3/4 steps */}
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
              A simple, guided journey from &quot;I need a service&quot; to
              &quot;all done&quot;.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {[
              {
                step: '01',
                title: 'You tell us what you need',
                text: 'Share your rego, where your car will be parked, and what type of service you need.',
              },
              {
                step: '02',
                title: 'We book a trusted garage',
                text: 'We match you with a vetted local garage, agree pricing and timings on your behalf.',
              },
              {
                step: '03',
                title: 'We collect and supervise',
                text: 'A drivlet driver collects your car, coordinates with the garage, and keeps you updated.',
              },
              {
                step: '04',
                title: 'We return your car',
                text: 'Your serviced car is returned before the end of your workday, ready to drive home.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
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
            {/* Left: explanation */}
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                Clear, simple pricing
              </h2>
              <p className="mt-3 text-sm text-slate-600 sm:text-base">
                drivlet makes money in two transparent ways: a fixed pick-up fee
                you see upfront, and negotiated garage rates behind the scenes.
                You still pay the usual service price &mdash; we just handle the
                time, hassle and negotiation.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-800">
                <li>• Standard service pick-up fee: from $89</li>
                <li>• Major service pick-up fee: from $139</li>
                <li>• You pay the garage&apos;s regular service price</li>
                <li>
                  • We may secure a better rate for bringing them work &mdash; we
                  keep the difference
                </li>
              </ul>
            </div>

            {/* Right: comparison card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                A typical service day vs drivlet
              </h3>
              <div className="mt-4 grid gap-4 text-xs text-slate-700 sm:text-sm">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-slate-900">
                    A &quot;normal&quot; service day
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li>• Take time off work or give up a day off</li>
                    <li>• Sit in a waiting room juggling calls and emails</li>
                    <li>• Navigate upsell conversations in person</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-emerald-600 p-4 text-white">
                  <p className="font-semibold">With drivlet</p>
                  <ul className="mt-2 space-y-1 text-emerald-50">
                    <li>• Stay at work &mdash; your day runs as normal</li>
                    <li>• We coordinate with the garage for you</li>
                    <li>• Clear pick-up fee, regular service prices</li>
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
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  Built for busy drivers
                </h2>
              </div>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                drivlet is for people who value their time as much as their car.
                If you hate wasting weekends at the mechanic, this is for you.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-800">
                <li>• No more sitting in waiting rooms</li>
                <li>• No awkward upsell pressure in person</li>
                <li>• Your day continues as normal while we handle the car</li>
                <li>• Clear communication before anything gets approved</li>
              </ul>
            </div>

            {/* Garages */}
            <div id="garages">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  Good for local garages
                </h2>
              </div>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                drivlet sends you warm, ready-to-go bookings from drivers who
                might otherwise delay or skip servicing. We reduce friction so
                you can focus on the work.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-800">
                <li>• More cars through the door with less admin</li>
                <li>• Access to drivers who avoid traditional servicing</li>
                <li>• We manage timings, collection and communication</li>
                <li>• Future: dedicated garage portal for quotes & capacity</li>
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
