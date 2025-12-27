// src/app/track/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Car,
  Clock,
  MapPin,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Building,
  CreditCard,
  XCircle,
  DollarSign,
} from "lucide-react";

// Stage definitions
const STAGES = [
  { id: "booking_confirmed", label: "Confirmed", icon: CheckCircle2 },
  { id: "driver_en_route", label: "Driver En Route", icon: Car },
  { id: "car_picked_up", label: "Car Picked Up", icon: Car },
  { id: "at_garage", label: "At Garage", icon: Building },
  { id: "service_in_progress", label: "Service In Progress", icon: Clock },
  { id: "awaiting_payment", label: "Awaiting Payment", icon: CreditCard },
  { id: "ready_for_return", label: "Ready for Return", icon: Car },
  { id: "driver_returning", label: "Driver Returning", icon: Car },
  { id: "delivered", label: "Delivered", icon: CheckCircle2 },
];

interface Update {
  stage: string;
  timestamp: string;
  message: string;
  updatedBy: string;
}

interface Booking {
  _id: string;
  vehicleRegistration: string;
  vehicleState: string;
  serviceType: string;
  pickupAddress: string;
  pickupTime: string;
  dropoffTime: string;
  currentStage: string;
  overallProgress: number;
  status: string;
  hasExistingBooking: boolean;
  garageName?: string;
  paymentStatus?: string;
  servicePaymentAmount?: number;
  servicePaymentUrl?: string;
  servicePaymentStatus?: string;
  updates: Update[];
  createdAt: string;
  updatedAt: string;
  cancellation?: {
    cancelledAt: string;
    reason?: string;
    refundAmount: number;
    refundPercentage: number;
    refundStatus: 'pending' | 'succeeded' | 'failed' | 'not_applicable';
  };
}

function TrackingContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [registration, setRegistration] = useState(searchParams.get("rego") || "");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-search if URL params present
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const regoParam = searchParams.get("rego");
    if (emailParam && regoParam) {
      setEmail(emailParam);
      setRegistration(regoParam);
      handleSearch(emailParam, regoParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-refresh every 30 seconds if booking is in progress
  useEffect(() => {
    if (booking && booking.status === "in_progress") {
      const interval = setInterval(() => {
        handleSearch(email, registration);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [booking, email, registration]);

  const handleSearch = async (searchEmail?: string, searchRego?: string) => {
    const emailToSearch = searchEmail || email;
    const regoToSearch = searchRego || registration;

    if (!emailToSearch || !regoToSearch) {
      setError("Please enter both email and registration");
      return;
    }

    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const response = await fetch("/api/bookings/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToSearch,
          registration: regoToSearch,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setBooking(data.booking);
      } else {
        setError(data.error || "Booking not found");
        setBooking(null);
      }
    } catch (err) {
      setError("Failed to search. Please try again.");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const getStageIndex = (stage: string) => {
    return STAGES.findIndex((s) => s.id === stage);
  };

  const needsPayment = booking && 
    booking.servicePaymentUrl && 
    booking.servicePaymentStatus === "pending";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/drivlet-logo.png"
                alt="drivlet"
                width={100}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Track Your Booking</h1>
          <p className="mt-2 text-slate-600">
            Enter your details to see real-time updates
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vehicle Registration
                </label>
                <input
                  type="text"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 uppercase"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? "Searching..." : "Track Booking"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mb-6 mx-auto max-w-xl flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Booking Result */}
        {booking && (
          <div className="mx-auto max-w-2xl">
            {/* Service Payment Required Banner */}
            {needsPayment && (
              <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-1">Your car is ready!</h2>
                    <p className="text-amber-100 mb-4">
                      Service is complete. Pay now to have your car delivered back to you.
                    </p>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-3xl font-bold">
                        ${((booking.servicePaymentAmount || 0) / 100).toFixed(2)}
                      </div>
                      <span className="text-amber-200">AUD</span>
                    </div>
                    <a
                      href={booking.servicePaymentUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3 text-base font-semibold text-amber-600 shadow-lg transition hover:bg-amber-50"
                    >
                      <CreditCard className="h-5 w-5" />
                      Pay Now & Get Your Car
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Service Payment Completed Banner */}
            {booking.servicePaymentStatus === "paid" && booking.currentStage !== "delivered" && (
              <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-1">Payment Received!</h2>
                    <p className="text-emerald-100">
                      Thank you for your payment of ${((booking.servicePaymentAmount || 0) / 100).toFixed(2)}. 
                      Our driver is on the way to deliver your car.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Booking Card */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                      <Car className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{booking.vehicleRegistration}</h2>
                      <p className="text-emerald-100">{booking.vehicleState}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSearch()}
                    className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition"
                  >
                    <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Cancelled State */}
              {booking.status === "cancelled" && (
                <div className="p-6 bg-red-50 border-b border-red-100">
                  <div className="flex items-center gap-3 text-red-700">
                    <XCircle className="h-6 w-6" />
                    <div>
                      <p className="font-semibold">Booking Cancelled</p>
                      {booking.cancellation?.reason && (
                        <p className="text-sm text-red-600">{booking.cancellation.reason}</p>
                      )}
                    </div>
                  </div>
                  {booking.cancellation && booking.cancellation.refundAmount > 0 && (
                    <div className="mt-3 rounded-lg bg-white p-3">
                      <p className="text-sm text-slate-600">
                        Refund: ${(booking.cancellation.refundAmount / 100).toFixed(2)} 
                        ({booking.cancellation.refundPercentage}%)
                        {booking.cancellation.refundStatus === "succeeded" && (
                          <span className="ml-2 text-emerald-600">✓ Processed</span>
                        )}
                        {booking.cancellation.refundStatus === "pending" && (
                          <span className="ml-2 text-amber-600">Processing...</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                {/* Service Info */}
                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Service</p>
                      <p className="font-medium text-slate-900">{booking.serviceType}</p>
                      {booking.garageName && (
                        <p className="text-sm text-slate-600">{booking.garageName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Pickup</p>
                      <p className="font-medium text-slate-900">{booking.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Pickup Window</p>
                      <p className="font-medium text-slate-900">
                        {booking.pickupTime} - {booking.dropoffTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Status</p>
                      <p className={`font-medium ${
                        booking.status === "completed" ? "text-emerald-600" :
                        booking.status === "cancelled" ? "text-red-600" :
                        "text-blue-600"
                      }`}>
                        {booking.status === "completed" ? "Completed" :
                         booking.status === "cancelled" ? "Cancelled" :
                         booking.status === "in_progress" ? "In Progress" :
                         "Pending"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {booking.status !== "cancelled" && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium text-slate-700">Progress</span>
                      <span className="font-semibold text-emerald-600">
                        {booking.overallProgress}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-3 rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${booking.overallProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Stage Timeline */}
                {booking.status !== "cancelled" && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Journey Progress</h3>
                    <div className="relative flex flex-wrap justify-between gap-2">
                      {STAGES.filter(s => !["awaiting_payment", "ready_for_return"].includes(s.id) || 
                        booking.currentStage === s.id).map((stage, index) => {
                        const currentStageIndex = getStageIndex(booking.currentStage);
                        const stageIndex = getStageIndex(stage.id);
                        const isCompleted = stageIndex <= currentStageIndex;
                        const isCurrent = stage.id === booking.currentStage;
                        const Icon = stage.icon;

                        return (
                          <div key={stage.id} className="flex flex-col items-center">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                                isCompleted
                                  ? isCurrent
                                    ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                                    : "bg-emerald-500 text-white"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className={`mt-2 text-xs text-center max-w-[80px] ${
                              isCurrent ? "font-semibold text-emerald-600" : "text-slate-500"
                            }`}>
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Updates */}
                {booking.updates && booking.updates.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Updates</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {booking.updates.slice().reverse().slice(0, 5).map((update, index) => (
                        <div key={index} className="flex gap-3 text-sm">
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
                            <div className="h-2 w-2 rounded-full bg-slate-400" />
                          </div>
                          <div>
                            <p className="text-slate-700">{update.message}</p>
                            <p className="text-xs text-slate-400">
                              {new Date(update.timestamp).toLocaleString("en-AU", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Results */}
        {hasSearched && !booking && !loading && !error && (
          <div className="mx-auto max-w-xl text-center py-12">
            <Car className="mx-auto h-16 w-16 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No booking found</h3>
            <p className="mt-2 text-slate-500">
              Please check your email and registration number are correct.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
