// src/app/booking/cancelled/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { XCircle, ArrowLeft, HelpCircle } from "lucide-react";

export default function BookingCancelledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
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
      </header>

      {/* Content */}
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm p-8 shadow-2xl text-center">
          {/* Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>

          {/* Title */}
          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Booking Cancelled
          </h1>
          <p className="mt-2 text-slate-600">
            Your payment was not completed and no booking was made.
          </p>

          {/* Info Box */}
          <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-left">
            <div className="flex items-start gap-3">
              <HelpCircle className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-700">Changed your mind?</p>
                <p className="mt-1 text-sm text-slate-500">
                  No worries! You can start a new booking anytime. Your information 
                  wasn&apos;t saved, so you&apos;ll need to enter it again.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/"
              className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="group flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}