// src/app/dashboard/bookings/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Car,
  Loader2,
  Calendar,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import BookingCard from "@/components/dashboard/BookingCard";
import BookingFilters from "@/components/dashboard/BookingFilters";

interface IUpdate {
  stage: string;
  timestamp: string;
  message: string;
  updatedBy: string;
}

interface IFlag {
  type: "manual_transmission" | "high_value_vehicle" | "other";
  reason: string;
  createdAt: string;
}

interface SignedFormRef {
  formId: string;
  formType: "pickup_consent" | "return_confirmation" | "claim_lodgement";
  submittedAt: string;
}

interface DriverInfo {
  firstName: string;
  profilePhoto: string | null;
  rating: number;
  totalRatings: number;
  completedJobs: number;
  memberSince: string;
}

interface BookingData {
  _id: string;
  pickupTime: string;
  dropoffTime: string;
  pickupAddress: string;
  vehicleRegistration: string;
  vehicleState: string;
  vehicleYear?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  serviceType: string;
  hasExistingBooking: boolean;
  garageName?: string;
  garageAddress?: string;
  existingBookingRef?: string;
  transmissionType: "automatic" | "manual";
  isManualTransmission: boolean;
  flags: IFlag[];
  currentStage: string;
  overallProgress: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  updates: IUpdate[];
  createdAt: string;
  paymentAmount?: number;
  userName?: string;
  userEmail?: string;
  driver?: DriverInfo | null;
  signedForms?: SignedFormRef[];
}

interface BookingStats {
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total: number;
}

export default function BookingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [stats, setStats] = useState<BookingStats>({
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      params.append("sortBy", sortBy);

      const response = await fetch(`/api/bookings/user?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      setBookings(data.bookings);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, sortBy]);

  useEffect(() => {
    if (authStatus === "loading") return;

    if (!session?.user) {
      router.push("/login");
      return;
    }

    fetchBookings();
  }, [session, authStatus, router, fetchBookings]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
          <p className="mt-2 text-sm text-emerald-100">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Slim top bar — matches the customer dashboard (2026-08-08 redesign;
          the old gradient hero header and four stat boxes are gone) */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-slate-900">Booking history</h1>
            <Link
              href="/dashboard"
              className="hidden text-xs font-medium text-slate-400 transition hover:text-emerald-600 sm:block"
            >
              ← Dashboard
            </Link>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {/* Filters */}
        <div className="mb-4">
          <BookingFilters
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            stats={stats}
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={handleRefresh}
                className="ml-auto text-sm font-medium text-red-600 hover:text-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Bookings List */}
        {bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                onFormsUpdated={fetchBookings}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No bookings found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {statusFilter === "all"
                ? "You haven't made any bookings yet."
                : `No ${statusFilter.replace("_", " ")} bookings found.`}
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
            >
              <Car className="h-4 w-4" />
              Book a Service
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
