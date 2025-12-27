// src/app/payment/cancelled/page.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { XCircle, ArrowLeft, Phone, Loader2 } from "lucide-react";

function PaymentCancelledContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Image
              src="/images/drivlet-logo.png"
              alt="drivlet"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
        </div>

        {/* Cancelled Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <XCircle className="h-10 w-10 text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Payment Cancelled
          </h1>

          <p className="text-slate-600 mb-6">
            Your payment was not completed. Your car is still waiting and will 
            be ready for delivery once payment is made.
          </p>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6">
            <p className="text-sm text-amber-700">
              <strong>Important:</strong> You'll need to complete payment before
              our driver can return your car.
            </p>
          </div>

          <div className="space-y-3">
            {bookingId && (
              <Link
                href={`/track?bookingId=${bookingId}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 w-full"
              >
                Try Payment Again
              </Link>
            )}

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 w-full"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Home
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-500 mb-2">
            Having trouble with payment?
          </p>
          <a
            href="tel:+61400000000"
            className="inline-flex items-center gap-2 text-emerald-600 hover:underline text-sm font-medium"
          >
            <Phone className="h-4 w-4" />
            Call us for help
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelledPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <PaymentCancelledContent />
    </Suspense>
  );
}