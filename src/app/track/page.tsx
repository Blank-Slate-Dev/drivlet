// src/app/track/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Clock,
  MapPin,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Building,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const STAGES = [
  { id: "booking_confirmed", label: "Confirmed" },
  { id: "driver_en_route", label: "En Route" },
  { id: "car_picked_up", label: "Picked Up" },
  { id: "at_garage", label: "At Garage" },
  { id: "service_in_progress", label: "Service" },
  { id: "driver_returning", label: "Returning" },
  { id: "delivered", label: "Delivered" },
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
}

function TrackingContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [registration, setRegistration] = useState(searchParams.get("rego") || "");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);

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

  const currentStageIndex = booking ? getStageIndex(booking.currentStage) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-4">
      {/* Header */}
      <header className="mx-auto flex max-w-md items-center justify-between mb-4">
        <Link href="/" className="flex items-center">
          <div className="relative h-8 w-24">
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
          className="flex items-center gap-1 text-sm text-white/80 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
      </header>

      {/* Main Card */}
      <div className="mx-auto max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
        {/* Search Section */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Search className="h-5 w-5 text-emerald-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Track Booking</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={registration}
              onChange={(e) => setRegistration(e.target.value.toUpperCase())}
              placeholder="REGO"
              maxLength={7}
              className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase text-center focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </form>

          {error && hasSearched && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {booking && (
          <div className="p-4">
            {/* Vehicle & Status */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900">{booking.vehicleRegistration}</span>
                <span className="text-sm text-slate-400">{booking.vehicleState}</span>
              </div>
              <div className="flex items-center gap-2">
                {booking.paymentStatus === "paid" && (
                  <CreditCard className="h-4 w-4 text-green-500" />
                )}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  booking.status === "completed" 
                    ? "bg-green-100 text-green-700"
                    : booking.status === "in_progress"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {booking.status.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-3">
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${booking.overallProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                {STAGES.map((stage, index) => (
                  <div
                    key={stage.id}
                    className={`w-2 h-2 rounded-full ${
                      index <= currentStageIndex ? "bg-emerald-500" : "bg-slate-200"
                    } ${index === currentStageIndex ? "ring-2 ring-emerald-200" : ""}`}
                    title={stage.label}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {STAGES[currentStageIndex]?.label || "Pending"} • {booking.overallProgress}%
              </p>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{booking.pickupTime} - {booking.dropoffTime}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 col-span-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{booking.pickupAddress}</span>
              </div>
              {booking.hasExistingBooking && booking.garageName && (
                <div className="flex items-center gap-2 text-blue-600 col-span-2">
                  <Building className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{booking.garageName}</span>
                </div>
              )}
            </div>

            {/* Updates */}
            {booking.updates && booking.updates.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <button
                  onClick={() => setShowUpdates(!showUpdates)}
                  className="flex items-center justify-between w-full text-xs text-slate-500 hover:text-slate-700"
                >
                  <span>Updates ({booking.updates.length})</span>
                  {showUpdates ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showUpdates && (
                  <div className="mt-2 space-y-1.5">
                    {[...booking.updates].reverse().map((update, index) => (
                      <div key={index} className="flex gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-600">{update.message}</p>
                          <p className="text-slate-400">{formatDateTime(update.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Refresh */}
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        )}

        {/* Empty State */}
        {!booking && !error && hasSearched && !loading && (
          <div className="p-8 text-center text-slate-400 text-sm">
            No booking found
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
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}