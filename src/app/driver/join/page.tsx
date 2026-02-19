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
  Smartphone,
} from "lucide-react";

const highlights = [
  { icon: DollarSign, title: "Competitive pay", desc: "Earn $35+/hour with transparent, upfront pricing." },
  { icon: Clock, title: "Flexible hours", desc: "Choose when you work. Clock in and out on your terms." },
  { icon: Shield, title: "Fully insured", desc: "Every vehicle is covered by our commercial insurance." },
  { icon: MapPin, title: "Local routes", desc: "Short drives within plenty of areas in Australia." },
  { icon: Smartphone, title: "Easy-to-use app", desc: "Accept jobs, upload photos, and track earnings from your phone." },
  { icon: Car, title: "Quick onboarding", desc: "Sign up in minutes. Start accepting jobs within 1–2 days." },
];

export default function DriverJoinPage() {
  return (
    <main className="h-screen overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 relative flex flex-col">
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
      <header className="relative z-50">
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

      {/* Content - fills remaining viewport */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              Drive cars. <span className="text-emerald-300">Earn money.</span>
            </h1>
            <p className="mt-3 text-base text-emerald-100 max-w-xl mx-auto">
              Join drivlet and get paid to pick up and deliver vehicles to local workshops. Flexible hours, fully insured.
            </p>

            {/* Pay highlight */}
            <div className="mt-5 inline-flex items-center gap-6 rounded-2xl bg-white/10 backdrop-blur-sm px-6 py-3 border border-white/20">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">$35+<span className="text-lg text-emerald-200">/hr</span></div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <div className="text-lg font-bold text-white">Flexible hours</div>
              </div>
              <div className="w-px h-8 bg-white/20 hidden sm:block" />
              <div className="text-center hidden sm:block">
                <div className="text-lg font-bold text-white">Australia based</div>
              </div>
            </div>
          </motion.div>

          {/* Benefits grid - compact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8"
          >
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4 flex items-start gap-3"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                  <item.icon className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-xs text-emerald-100/70 leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <Link
              href="/driver/register"
              className="group inline-flex items-center justify-center gap-3 py-3.5 px-8 bg-white text-emerald-700 font-bold text-base rounded-2xl shadow-xl shadow-black/10 transition hover:bg-emerald-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              Continue to sign up
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <Link href="/driver/login" className="font-medium text-white hover:text-emerald-200 transition">
                Already have an account? Sign in
              </Link>
              <span className="text-white/30">·</span>
              <Link href="/" className="inline-flex items-center gap-1 text-white/60 hover:text-white transition">
                <ArrowLeft className="h-3.5 w-3.5" /> Home
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}