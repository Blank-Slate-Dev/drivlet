// src/app/booking/success/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Car, Clock, MapPin, ArrowRight, Loader2 } from "lucide-react";

interface BookingDetails {
  customerName: string;
  customerEmail: string;
  vehicleRegistration: string;
  vehicleState: string;
  pickupAddress: string;
  serviceType: string;
  earliestPickup: string;
  latestDropoff: string;
  amountPaid: number;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionId) {
      fetchBookingDetails();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/stripe/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setBooking(data);
      } else {
        setError("Could not load booking details");
      }
    } catch {
      setError("Could not load booking details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
          <p className="mt-2 text-emerald-100">Loading your booking...</p>
        </div>
      </div>
    );
  }

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
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm p-8 shadow-2xl">
          {/* Success Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>

          {/* Title */}
          <h1 className="mt-6 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Booking Confirmed!
          </h1>
          <p className="mt-2 text-center text-slate-600">
            Thank you for choosing drivlet. We&apos;ve received your booking and payment.
          </p>

          {/* Booking Details */}
          {booking && (
            <div className="mt-8 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-3 text-slate-700">
                  <Car className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm text-slate-500">Vehicle</p>
                    <p className="font-semibold">
                      {booking.vehicleRegistration} ({booking.vehicleState})
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-3 text-slate-700">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm text-slate-500">Pickup Address</p>
                    <p className="font-semibold">{booking.pickupAddress}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-3 text-slate-700">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm text-slate-500">Time Window</p>
                    <p className="font-semibold">
                      Pickup: {booking.earliestPickup} • Return by: {booking.latestDropoff}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-emerald-700">Amount Paid</p>
                  <p className="text-xl font-bold text-emerald-700">
                    ${(booking.amountPaid / 100).toFixed(2)} AUD
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-sm text-amber-700">
                {error}. Don&apos;t worry - your booking is confirmed. 
                Check your email for details.
              </p>
            </div>
          )}

          {/* What's Next */}
          <div className="mt-8 rounded-2xl bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-900">What happens next?</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                You&apos;ll receive a confirmation email with booking details
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Our driver will arrive at your pickup location during your selected time window
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                We&apos;ll keep you updated on your car&apos;s status throughout the service
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="flex-1 rounded-full bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
            >
              Back to Home
            </Link>
            <Link
              href="/track"
              className="group flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Track Your Booking
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}