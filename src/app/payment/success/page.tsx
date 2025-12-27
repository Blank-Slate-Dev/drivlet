// src/app/payment/success/page.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Car, ArrowRight, Loader2 } from "lucide-react";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking");
  const paymentType = searchParams.get("type");

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
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

        {/* Success Card */}
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Payment Successful!
          </h1>

          {paymentType === "service" ? (
            <>
              <p className="text-slate-600 mb-6">
                Thank you for your payment. Your car is ready and our driver will
                deliver it back to you shortly.
              </p>

              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-emerald-700">
                  <Car className="h-5 w-5" />
                  <span className="font-medium">Your car is on its way!</span>
                </div>
                <p className="text-sm text-emerald-600 mt-1">
                  The driver will contact you when they arrive.
                </p>
              </div>
            </>
          ) : (
            <p className="text-slate-600 mb-6">
              Your payment has been processed successfully.
            </p>
          )}

          {bookingId && (
            <Link
              href={`/track?bookingId=${bookingId}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 mb-4 w-full"
            >
              Track Your Booking
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 w-full"
          >
            Return to Home
          </Link>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Questions? Contact us at{" "}
          <a
            href="mailto:support@drivlet.com.au"
            className="text-emerald-600 hover:underline"
          >
            support@drivlet.com.au
          </a>
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}