// src/app/driver/join/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Car,
  DollarSign,
  Clock,
  Shield,
  MapPin,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Smartphone,
} from "lucide-react";

const benefits = [
  {
    icon: DollarSign,
    title: "Competitive pay",
    description: "Earn $25–35 per vehicle delivery with transparent, upfront pricing. No hidden fees or commission traps.",
  },
  {
    icon: Clock,
    title: "Flexible hours",
    description: "Choose when you work. Clock in and out on your terms — mornings, afternoons, or full days.",
  },
  {
    icon: Shield,
    title: "Fully insured",
    description: "Every vehicle you transport is covered by our commercial insurance. Drive with confidence.",
  },
  {
    icon: MapPin,
    title: "Local routes",
    description: "All jobs are within the Newcastle and Lake Macquarie area. Short drives, no long-haul trips.",
  },
  {
    icon: Smartphone,
    title: "Easy-to-use app",
    description: "Accept jobs, navigate to pickups, upload condition photos, and track your earnings — all from your phone.",
  },
  {
    icon: Calendar,
    title: "Quick onboarding",
    description: "Sign up in minutes. Once approved, you can start accepting jobs within 1–2 business days.",
  },
];

const requirements = [
  "Valid Australian driver's licence (full, no P-plates)",
  "Clean driving record (no major infringements in 3 years)",
  "Smartphone with a working camera",
  "Ability to drive both automatic and manual vehicles (preferred)",
  "Reliable and punctual with great communication skills",
];

export default function DriverJoinPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 relative">
      {/* Pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-12 w-40 sm:h-14 sm:w-48">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain brightness-0 invert"
                priority
              />
            </div>
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/20">
            <Car className="h-5 w-5 text-emerald-300" />
            <span className="text-sm font-medium text-white">Driver Portal</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10">
        <div className="mx-auto max-w-4xl px-4 pt-12 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/20 mb-6">
              <span className="text-sm font-medium text-emerald-200">Now accepting drivers in Newcastle</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Drive cars.<br />
              <span className="text-emerald-300">Earn money.</span>
            </h1>
            <p className="mt-4 text-lg text-emerald-100 max-w-2xl mx-auto">
              Join drivlet as a driver and get paid to pick up and deliver vehicles to local workshops. Flexible hours, competitive pay, and fully insured.
            </p>

            {/* Pay highlight */}
            <div className="mt-8 inline-flex items-center gap-6 rounded-2xl bg-white/10 backdrop-blur-sm px-8 py-4 border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">$25–35</div>
                <div className="text-sm text-emerald-200">per delivery</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-white">Flexible</div>
                <div className="text-sm text-emerald-200">set your hours</div>
              </div>
              <div className="w-px h-10 bg-white/20 hidden sm:block" />
              <div className="text-center hidden sm:block">
                <div className="text-3xl font-bold text-white">Local</div>
                <div className="text-sm text-emerald-200">Newcastle area</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Benefits */}
        <div className="mx-auto max-w-5xl px-4 py-12">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white text-center mb-10"
          >
            Why drive with drivlet?
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
                className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-6 hover:bg-white/15 transition"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 mb-4">
                  <benefit.icon className="h-5 w-5 text-emerald-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-emerald-100/80 leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="mx-auto max-w-3xl px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-8"
          >
            <h3 className="text-xl font-bold text-white mb-5">What you need</h3>
            <ul className="space-y-3">
              {requirements.map((req) => (
                <li key={req} className="flex items-start gap-3 text-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{req}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* CTA */}
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link
              href="/driver/register"
              className="group w-full inline-flex items-center justify-center gap-3 py-4 px-8 bg-white text-emerald-700 font-bold text-lg rounded-2xl shadow-xl shadow-black/10 transition hover:bg-emerald-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              Continue to sign up
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="mt-4 text-sm text-emerald-200">
              Takes less than 5 minutes. You&apos;ll need your licence details and bank account info.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-emerald-100 text-sm">
                Already have an account?{" "}
                <Link href="/driver/login" className="font-semibold text-white hover:text-emerald-200 transition">
                  Sign in
                </Link>
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}