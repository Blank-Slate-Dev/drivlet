// src/app/dashboard/bookings/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ClipboardList,
  Car,
  Loader2,
  Home,
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700">
        <div className="absolute inset-0 z-0 opacity-10">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
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
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-white">
              <ClipboardList className="h-3.5 w-3.5" />
              Booking History
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-white/10 hover:text-white"
            >
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Active Booking</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-white/10 hover:text-white"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Booking History
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              View and track all your past and current bookings
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Stats Summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">
              {stats.total}
            </div>
            <div className="text-sm text-slate-500">Total Bookings</div>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <div className="text-2xl font-bold text-blue-700">
              {stats.in_progress}
            </div>
            <div className="text-sm text-blue-600">In Progress</div>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="text-2xl font-bold text-emerald-700">
              {stats.completed}
            </div>
            <div className="text-sm text-emerald-600">Completed</div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="text-2xl font-bold text-amber-700">
              {stats.pending}
            </div>
            <div className="text-sm text-amber-600">Pending</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
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
