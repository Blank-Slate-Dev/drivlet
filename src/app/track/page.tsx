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
    setEmail("");
    setRegistration("");
  };

  const getStageIndex = (stageId: string) => {
    return STAGES.findIndex((s) => s.id === stageId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-700";
      case "in_progress": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const currentStageIndex = booking ? getStageIndex(booking.currentStage) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
      {/* Header */}
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center">
          <div className="relative h-10 w-32">
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
          className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-xl px-4 pb-4">
        {/* Search Form - Hidden when booking is found */}
        {!booking && (
          <div className="rounded-2xl bg-white/95 backdrop-blur-sm p-5 shadow-xl">
            <div className="text-center mb-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <Search className="h-6 w-6 text-emerald-600" />
              </div>
              <h1 className="mt-3 text-xl font-bold text-slate-900">Track Your Booking</h1>
              <p className="mt-1 text-sm text-slate-500">Enter your email and vehicle registration</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={registration}
                onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                placeholder="Vehicle registration (e.g. ABC123)"
                maxLength={7}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm uppercase focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Track Booking"
                )}
              </button>
            </form>

            {error && hasSearched && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Booking Result */}
        {booking && (
          <div className="rounded-2xl bg-white/95 backdrop-blur-sm p-5 shadow-xl">
            {/* Header with search again option */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{booking.vehicleRegistration}</h2>
                <p className="text-sm text-slate-500">{booking.vehicleState}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status.replace("_", " ")}
                </span>
                {booking.paymentStatus === "paid" && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CreditCard className="h-3 w-3" />
                    paid
                  </span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span className="font-medium text-emerald-600">{booking.overallProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${booking.overallProgress}%` }}
                />
              </div>
            </div>

            {/* Stage Indicators - Compact */}
            <div className="flex justify-between mb-4">
              {STAGES.map((stage, index) => (
                <div key={stage.id} className="flex flex-col items-center flex-1">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center ${
                      index <= currentStageIndex
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200"
                    } ${index === currentStageIndex ? "ring-2 ring-emerald-200" : ""}`}
                  >
                    {index <= currentStageIndex && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                  <span className={`text-[8px] mt-1 text-center leading-tight ${
                    index <= currentStageIndex ? "text-slate-600" : "text-slate-400"
                  }`}>
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Details - Compact Grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="flex items-center gap-1 text-slate-500 text-xs">
                  <Clock className="h-3 w-3" />
                  Pickup
                </div>
                <p className="font-medium text-slate-900">{booking.pickupTime}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="flex items-center gap-1 text-slate-500 text-xs">
                  <Clock className="h-3 w-3" />
                  Return
                </div>
                <p className="font-medium text-slate-900">{booking.dropoffTime}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 col-span-2">
                <div className="flex items-center gap-1 text-slate-500 text-xs">
                  <MapPin className="h-3 w-3" />
                  Pickup Location
                </div>
                <p className="font-medium text-slate-900 text-xs">{booking.pickupAddress}</p>
              </div>
              {booking.hasExistingBooking && booking.garageName && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-2 col-span-2">
                  <div className="flex items-center gap-1 text-blue-600 text-xs">
                    <Building className="h-3 w-3" />
                    Taking to
                  </div>
                  <p className="font-medium text-blue-900 text-xs">{booking.garageName}</p>
                </div>
              )}
            </div>

            {/* Updates - Collapsed by default, show latest only */}
            {booking.updates && booking.updates.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-600">{booking.updates[booking.updates.length - 1].message}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={clearBooking}
                className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1"
              >
                <ChevronDown className="h-3 w-3" />
                New Search
              </button>
            </div>
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