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

  const handleSearch = async (searchEmail?: string, searchRego?: string) => {
    const emailToUse = searchEmail || email;
    const regoToUse = searchRego || registration;

    if (!emailToUse.trim() || !regoToUse.trim()) {
      setError("Please enter both email and registration number");
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
          email: emailToUse.trim(),
          registration: regoToUse.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Booking not found");
        setBooking(null);
        return;
      }

      setBooking(data.booking);
      setError("");
    } catch {
      setError("Something went wrong. Please try again.");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const clearBooking = () => {
    setBooking(null);
    setHasSearched(false);
  };

  const getStageIndex = (stageId: string) => {
    return STAGES.findIndex((s) => s.id === stageId);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "in_progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
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
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search Form - Only show when no booking */}
        {!booking && (
          <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm p-6 shadow-2xl sm:p-8">
            <div className="text-center mb-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Search className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-slate-900">
                Track Your Booking
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Vehicle Registration
                </label>
                <input
                  type="text"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={7}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase tracking-wider text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Track Booking
                  </span>
                )}
              </button>
            </form>

            {error && hasSearched && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">{error}</p>
                  <p className="mt-1 text-xs text-red-600">
                    Make sure you&apos;re using the email address and registration number from your booking.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Booking Status */}
        {booking && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Status Card */}
            <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm p-6 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {booking.vehicleRegistration}
                  </h2>
                  <p className="text-sm text-slate-600">{booking.vehicleState}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full border px-3 py-1 text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status.replace("_", " ")}
                  </span>
                  {booking.paymentStatus && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                      <CreditCard className="inline-block h-3 w-3 mr-1" />
                      {booking.paymentStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* Cancelled Booking Notice */}
              {booking.status === "cancelled" && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900">Booking Cancelled</h3>
                      {booking.cancellation?.cancelledAt && (
                        <p className="mt-1 text-sm text-red-700">
                          Cancelled on {new Date(booking.cancellation.cancelledAt).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {booking.cancellation?.reason && (
                        <p className="mt-2 text-sm text-red-600">
                          Reason: {booking.cancellation.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Refund Information */}
                  {booking.cancellation && booking.cancellation.refundAmount > 0 && (
                    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">
                            Refund: ${(booking.cancellation.refundAmount / 100).toFixed(2)} AUD
                            <span className="ml-1 text-sm font-normal text-green-700">
                              ({booking.cancellation.refundPercentage}% refund)
                            </span>
                          </p>
                          <p className="text-sm text-green-700">
                            {booking.cancellation.refundStatus === "succeeded"
                              ? "Refund processed - will appear on your card in 5-10 business days"
                              : booking.cancellation.refundStatus === "pending"
                                ? "Refund is being processed"
                                : booking.cancellation.refundStatus === "failed"
                                  ? "Refund failed - please contact support"
                                  : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {booking.cancellation && booking.cancellation.refundAmount === 0 && booking.cancellation.refundStatus !== "not_applicable" && (
                    <p className="mt-3 text-sm text-red-600">
                      No refund was issued for this cancellation.
                    </p>
                  )}
                </div>
              )}

              {/* Progress Bar - only show for non-cancelled bookings */}
              {booking.status !== "cancelled" && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700">Progress</span>
                    <span className="font-semibold text-emerald-600">
                      {booking.overallProgress}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${booking.overallProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stage Timeline - only show for non-cancelled bookings */}
              {booking.status !== "cancelled" && <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Journey Progress</h3>
                <div className="relative flex w-full items-start justify-between">
                  {STAGES.map((stage, index) => {
                    const currentStageIndex = getStageIndex(booking.currentStage);
                    const isCompleted = index <= currentStageIndex;
                    const isCurrent = index === currentStageIndex;

                    return (
                      <div key={stage.id} className="relative flex flex-1 flex-col items-center">
                        <div
                          className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                            isCompleted
                              ? isCurrent
                                ? "bg-emerald-500 ring-4 ring-emerald-100"
                                : "bg-emerald-500"
                              : "border-2 border-slate-300 bg-white"
                          }`}
                        >
                          {isCompleted && (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          )}
                        </div>

                        {index < STAGES.length - 1 && (
                          <div
                            className={`absolute top-4 left-[50%] h-0.5 w-full ${
                              isCompleted && index < currentStageIndex
                                ? "bg-emerald-400"
                                : "bg-slate-200"
                            }`}
                            style={{ zIndex: 0 }}
                          />
                        )}

                        <div className="mt-2 w-full px-0.5 text-center">
                          <p
                            className={`text-[9px] font-medium leading-tight sm:text-[10px] ${
                              isCompleted ? "text-slate-700" : "text-slate-400"
                            }`}
                          >
                            {stage.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>}

              {/* Booking Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    Pickup Time
                  </div>
                  <p className="font-semibold text-slate-900">{booking.pickupTime}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    Return By
                  </div>
                  <p className="font-semibold text-slate-900">{booking.dropoffTime}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    Pickup Location
                  </div>
                  <p className="font-medium text-slate-900">{booking.pickupAddress}</p>
                </div>
                {booking.hasExistingBooking && booking.garageName && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 sm:col-span-2">
                    <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
                      <Building className="h-4 w-4" />
                      Taking to Garage
                    </div>
                    <p className="font-semibold text-blue-900">{booking.garageName}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="flex-1 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className={`inline-block h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh Status
                </button>
                <button
                  onClick={clearBooking}
                  className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Search className="inline-block h-4 w-4 mr-2" />
                  New Search
                </button>
              </div>
            </div>

            {/* Updates Timeline */}
            {booking.updates && booking.updates.length > 0 && (
              <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm p-6 shadow-2xl sm:p-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Updates</h3>
                <div className="space-y-4">
                  {[...booking.updates].reverse().map((update, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        {index < booking.updates.length - 1 && (
                          <div className="mt-2 h-full w-0.5 bg-slate-200" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-slate-900">{update.message}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(update.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
