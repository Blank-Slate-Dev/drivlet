// src/app/garage/register/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Building2,
  ArrowRight,
  Star,
  Users,
  TrendingUp,
  Shield,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react";
import RegistrationForm from "@/components/garage/RegistrationForm";

export default function GarageRegisterPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Floating decorative shapes */}
      <div className="absolute top-40 left-20 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-40 right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-emerald-900/50 backdrop-blur-md border-b border-white/10">
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
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/20">
              <Building2 className="h-5 w-5 text-emerald-300" />
              <span className="text-sm font-medium text-white">Garage Portal</span>
            </div>
            <Link
              href="/garage/login"
              className="text-sm font-medium text-white/80 hover:text-white transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 backdrop-blur-sm px-4 py-2 border border-emerald-500/30 mb-6">
              <Star className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-emerald-200">Join our partner network</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Partner with <span className="text-emerald-300">drivlet</span>
            </h1>
            <p className="text-lg text-emerald-100 max-w-2xl mx-auto">
              Register your garage and start receiving bookings from customers in your area.
              Grow your business with our trusted referral network.
            </p>
          </motion.div>

          {/* Benefits Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-12"
          >
            {[
              { icon: Users, value: "New Customers", label: "Steady referrals", color: "emerald" },
              { icon: TrendingUp, value: "Grow Revenue", label: "Increase bookings", color: "blue" },
              { icon: Shield, value: "Vetted Partners", label: "Quality assured", color: "amber" },
              { icon: MapPin, value: "Newcastle", label: "& surrounds", color: "purple" },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-5 text-center hover:bg-white/15 transition"
              >
                <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
                  item.color === 'emerald' ? 'bg-emerald-500/20' :
                  item.color === 'blue' ? 'bg-blue-500/20' :
                  item.color === 'amber' ? 'bg-amber-500/20' : 'bg-purple-500/20'
                }`}>
                  <item.icon className={`h-6 w-6 ${
                    item.color === 'emerald' ? 'text-emerald-300' :
                    item.color === 'blue' ? 'text-blue-300' :
                    item.color === 'amber' ? 'text-amber-300' : 'text-purple-300'
                  }`} />
                </div>
                <div className="text-lg font-bold text-white">{item.value}</div>
                <div className="text-sm text-emerald-200/70">{item.label}</div>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Left sidebar - Why partner */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="hidden lg:block"
            >
              <div className="sticky top-24 space-y-6">
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Why partner with us?</h3>
                  <ul className="space-y-3">
                    {[
                      "Access to local car owners",
                      "No upfront costs or fees",
                      "Easy booking management",
                      "Reliable customer flow",
                      "Marketing support included",
                    ].map((benefit, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-emerald-100">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-sm border border-emerald-500/30 p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">How it works</h3>
                  <ol className="space-y-4">
                    {[
                      "Complete registration form",
                      "We verify your business",
                      "Get approved (1-2 days)",
                      "Start receiving bookings!",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="text-sm text-emerald-100">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-semibold text-white">Quick approval</h3>
                  </div>
                  <p className="text-sm text-emerald-200/70">
                    Most applications are reviewed and approved within 1-2 business days.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Center - Registration Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="rounded-3xl bg-white shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
                  <h2 className="text-xl font-bold text-white">Garage Registration</h2>
                  <p className="text-emerald-100 text-sm mt-1">
                    Fill out the form below to join our partner network
                  </p>
                </div>
                <div className="p-6 sm:p-8">
                  <RegistrationForm />
                </div>
              </div>

              {/* Already have account */}
              <div className="mt-6 text-center">
                <p className="text-emerald-200/80">
                  Already have an account?{" "}
                  <Link
                    href="/garage/login"
                    className="font-semibold text-white hover:text-emerald-300 transition"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Back to home */}
              <div className="mt-4 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Back to home
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
