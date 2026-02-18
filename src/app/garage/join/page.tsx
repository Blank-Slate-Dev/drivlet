// src/app/garage/join/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  TrendingUp,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
  BarChart3,
  Handshake,
} from "lucide-react";

const benefits = [
  {
    icon: Users,
    title: "New customers delivered to you",
    description: "Car owners in your area book through drivlet. We pick up their vehicle and bring it straight to your workshop — no marketing needed.",
  },
  {
    icon: TrendingUp,
    title: "Grow your revenue",
    description: "Fill empty bays with a steady stream of bookings. More cars through your doors means more revenue without extra overheads.",
  },
  {
    icon: Zap,
    title: "Zero disruption",
    description: "Our drivers handle all pick-ups and drop-offs. You focus on what you do best — servicing vehicles.",
  },
  {
    icon: BarChart3,
    title: "Dashboard & analytics",
    description: "Track incoming bookings, manage your schedule, view revenue analytics, and respond to customer reviews — all in one place.",
  },
  {
    icon: Shield,
    title: "Fully insured transport",
    description: "Every vehicle is covered by our commercial insurance during transport. Your customers' cars are in safe hands.",
  },
  {
    icon: Handshake,
    title: "Simple partnership",
    description: "No lock-in contracts. No upfront fees. We only succeed when you do. Join the network and start receiving bookings.",
  },
];

const howItWorks = [
  { step: "1", title: "Customer books", description: "A car owner near you books a service through drivlet and selects your workshop." },
  { step: "2", title: "We pick up", description: "Our insured driver picks up the vehicle from the customer and delivers it to you." },
  { step: "3", title: "You service it", description: "Complete the service as normal. The customer pays you directly for your work." },
  { step: "4", title: "We return it", description: "Once you're done, our driver brings the vehicle back to the customer." },
];

export default function GarageJoinPage() {
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
            <Building2 className="h-5 w-5 text-emerald-300" />
            <span className="text-sm font-medium text-white">Garage Portal</span>
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
              <span className="text-sm font-medium text-emerald-200">Partnering with workshops in Newcastle</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              More cars through your doors.<br />
              <span className="text-emerald-300">Zero extra effort.</span>
            </h1>
            <p className="mt-4 text-lg text-emerald-100 max-w-2xl mx-auto">
              Join the drivlet partner network and receive a steady stream of customers. We handle pick-up and delivery — you handle the servicing.
            </p>
          </motion.div>
        </div>

        {/* How it works */}
        <div className="mx-auto max-w-4xl px-4 py-10">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white text-center mb-10"
          >
            How it works
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {howItWorks.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
                className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 text-center"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/30 text-lg font-bold text-emerald-300 mb-3">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-emerald-100/80 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="mx-auto max-w-5xl px-4 py-12">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white text-center mb-10"
          >
            Why partner with drivlet?
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
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

        {/* CTA */}
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link
              href="/garage/register"
              className="group w-full inline-flex items-center justify-center gap-3 py-4 px-8 bg-white text-emerald-700 font-bold text-lg rounded-2xl shadow-xl shadow-black/10 transition hover:bg-emerald-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              Register your garage
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="mt-4 text-sm text-emerald-200">
              Free to join. No lock-in contracts. Takes about 5 minutes.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-emerald-100 text-sm">
                Already a partner?{" "}
                <Link href="/garage/login" className="font-semibold text-white hover:text-emerald-200 transition">
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