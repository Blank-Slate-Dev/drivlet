// src/app/garage/pending/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Mail,
  Phone,
  Building2,
  LogOut,
  RefreshCw,
  ArrowRight,
  Loader2,
  FileCheck,
  Shield,
  Briefcase,
  Sparkles,
} from "lucide-react";

export default function GaragePendingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [checking, setChecking] = useState(false);
  const [acceptedAnim, setAcceptedAnim] = useState(false);
  const [notice, setNotice] = useState<string>("");

  const isGarage = session?.user?.role === "garage";
  const isApproved = Boolean(session?.user?.isApproved);

  // Minute hand: 3 seconds per full rotation
  // Hour hand: 36 seconds per full rotation
  const MINUTE_HAND_DURATION = 3;
  const HOUR_HAND_DURATION = MINUTE_HAND_DURATION * 12;

  // Steps: automatically mark later steps as done once approved
  const steps = useMemo(
    () => [
      { num: 1, text: "Our team reviews your application", time: "1-2 business days", done: true },
      { num: 2, text: "We verify your business details and insurance", time: "Part of review", done: isApproved },
      { num: 3, text: "You'll receive an email once approved", time: "", done: isApproved },
      { num: 4, text: "Start accepting bookings through drivlet!", time: "", done: isApproved },
    ],
    [isApproved]
  );

  // Guard routes
  useEffect(() => {
    if (status !== "authenticated") return;

    if (!isGarage) {
      router.push("/");
      return;
    }

    // If already approved, go straight to the correct dashboard.
    // Pass welcome=1 so the dashboard can show a nice first-time welcome modal.
    if (isApproved) {
      router.push("/garage/dashboard?welcome=1");
    }
  }, [status, isGarage, isApproved, router]);

  const handleCheckStatus = async () => {
    if (checking) return;
    setChecking(true);
    setNotice("");

    try {
      // IMPORTANT: do NOT reload the page. Refresh the session in-place.
      // Your NextAuth jwt callback supports trigger === "update" for garages.
      await update();

      // If approval flipped to true, play animation then redirect.
      // (We also handle it via the effect below.)
      setNotice("Status refreshed.");
    } catch (err) {
      console.error(err);
      setNotice("Couldn’t refresh status right now. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  // When approval becomes true while on this page:
  // show quick approved animation -> redirect to dashboard
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!isGarage) return;
    if (!isApproved) return;

    setAcceptedAnim(true);

    const t = setTimeout(() => {
      router.push("/garage/dashboard?welcome=1");
    }, 1600);

    return () => clearTimeout(t);
  }, [status, isGarage, isApproved, router]);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/garage/login" });
  };

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
      <div className="absolute top-20 right-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />

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

      {/* Main content */}
      <div className="relative z-10 flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl"
        >
          <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm shadow-2xl overflow-hidden relative">
            {/* Approved overlay */}
            <AnimatePresence>
              {acceptedAnim && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center bg-emerald-900/70 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                    className="mx-6 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
                  >
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                      <Sparkles className="h-7 w-7 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">You&apos;re approved!</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Taking you to your dashboard…
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-emerald-700">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm font-semibold">Loading</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header with animated clock */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
              </div>

              {/* Animated Clock */}
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/40">
                <div className="absolute inset-2 rounded-full bg-white/10" />

                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <div
                    key={deg}
                    className="absolute w-0.5 h-1.5 bg-white/40 rounded-full"
                    style={{ transform: `rotate(${deg}deg) translateY(-24px)` }}
                  />
                ))}

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: HOUR_HAND_DURATION, repeat: Infinity, ease: "linear" }}
                  className="absolute w-0.5 h-4 bg-white rounded-full origin-bottom"
                  style={{ bottom: "50%" }}
                />

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: MINUTE_HAND_DURATION, repeat: Infinity, ease: "linear" }}
                  className="absolute w-0.5 h-6 bg-white/90 rounded-full origin-bottom"
                  style={{ bottom: "50%" }}
                />

                <div className="absolute w-2.5 h-2.5 bg-white rounded-full z-10 shadow-sm" />
              </div>

              <h1 className="mt-4 text-2xl font-bold text-white">Application Under Review</h1>
              <p className="text-emerald-100 mt-1">
                We&apos;re reviewing your garage registration
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {/* Thank you message */}
              <div className="mb-6 text-center">
                <p className="text-slate-600">
                  Thank you for registering your garage with drivlet! Our team is currently reviewing your application.
                </p>
              </div>

              {/* Notice */}
              {notice && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {notice}
                </div>
              )}

              {/* Status Timeline */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  What happens next?
                </h3>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <motion.div
                      key={step.num}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-start gap-4"
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                          step.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {step.done ? <CheckCircle className="h-4 w-4" /> : step.num}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`text-sm ${step.done ? "text-slate-900 font-medium" : "text-slate-600"}`}>
                          {step.text}
                        </p>
                        {step.time && <p className="text-xs text-slate-400 mt-0.5">{step.time}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* What we're verifying */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { icon: Briefcase, label: "Business", color: "emerald" },
                  { icon: Shield, label: "Insurance", color: "teal" },
                  { icon: FileCheck, label: "Licenses", color: "cyan" },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                    className="rounded-xl bg-slate-50 p-4 text-center border border-slate-200 hover:border-slate-300 transition"
                  >
                    <item.icon
                      className={`h-6 w-6 mx-auto ${
                        item.color === "emerald"
                          ? "text-emerald-500"
                          : item.color === "teal"
                          ? "text-teal-500"
                          : "text-cyan-500"
                      }`}
                    />
                    <p className="mt-2 text-xs text-slate-600 font-medium">{item.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Contact Info */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Questions? Contact us</h3>
                <div className="space-y-2">
                  <a
                    href="mailto:partners@drivlet.com"
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-emerald-600 transition p-2 rounded-lg hover:bg-white"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                      <Mail className="h-4 w-4 text-emerald-600" />
                    </div>
                    partners@drivlet.com
                  </a>
                  <a
                    href="tel:1300123456"
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-emerald-600 transition p-2 rounded-lg hover:bg-white"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                      <Phone className="h-4 w-4 text-emerald-600" />
                    </div>
                    1300 123 456
                  </a>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleCheckStatus}
                  disabled={checking || acceptedAnim}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
                >
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Check Application Status
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Back to home link */}
          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition">
              <ArrowRight className="h-4 w-4 rotate-180" />
              Back to drivlet
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
