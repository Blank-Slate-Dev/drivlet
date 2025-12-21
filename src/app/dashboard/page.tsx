// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  MapPin,
  Car,
  ChevronRight,
  Loader2,
  Plus,
  AlertCircle,
  Bell,
  X,
  ClipboardList,
} from "lucide-react";
import { BookingModal } from "@/components/homepage";

const POLLING_INTERVAL = 30000; // 30 seconds

// Stage definitions
const STAGES = [
  { id: "booking_confirmed", label: "Confirmed" },
  { id: "driver_en_route", label: "En Route" },
  { id: "car_picked_up", label: "Picked Up" },
  { id: "at_garage", label: "At Garage" },
  { id: "service_in_progress", label: "In Progress" },
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
  currentStage: string;
  overallProgress: number;
  pickupTime: string;
  dropoffTime: string;
  pickupAddress: string;
  status: string;
  updates: Update[];
  createdAt: string;
  updatedAt: string;
}

interface BookingHeaderProps {
  booking: Booking;
}

function BookingHeader({ booking }: BookingHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600">Your Car Service</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {booking.vehicleRegistration}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Car className="h-4 w-4 text-slate-400" />
              {booking.vehicleState}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" />
              {booking.pickupAddress}
            </span>
          </div>
        </div>
        <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <Car className="h-8 w-8 text-emerald-600" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        Sit back while we handle the pick-up, service, and return.
      </p>
    </div>
  );
}

interface StatusSummaryProps {
  booking: Booking;
}

function StatusSummary({ booking }: StatusSummaryProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStageLabel = (stageId: string) => {
    const stage = STAGES.find(s => s.id === stageId);
    return stage?.label || stageId;
  };

  const latestUpdate = booking.updates[booking.updates.length - 1];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700"
          role="status"
          aria-label={`Current stage: ${getStageLabel(booking.currentStage)}`}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {getStageLabel(booking.currentStage)}
        </span>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
          {booking.serviceType}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Clock className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Pickup Time
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {booking.pickupTime}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Clock className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Dropoff Time
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {booking.dropoffTime}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Overall Progress</span>
          <span className="font-semibold text-emerald-600">
            {booking.overallProgress}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${booking.overallProgress}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={booking.overallProgress}
            aria-label={`Journey progress: ${booking.overallProgress}%`}
          />
        </div>
      </div>

      {latestUpdate && (
        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Latest Update
          </p>
          <p className="mt-1 text-sm text-emerald-800">{latestUpdate.message}</p>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Last updated: {formatDateTime(booking.updatedAt)}
      </p>
    </div>
  );
}

interface ActivityTimelineProps {
  currentStage: string;
  updates: Update[];
}

function ActivityTimeline({ currentStage, updates }: ActivityTimelineProps) {
  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });
  };

  // Find which stages are completed based on currentStage
  const currentStageIndex = STAGES.findIndex(s => s.id === currentStage);

  // Create a map of updates by stage for timestamps
  const updatesByStage = updates.reduce((acc, update) => {
    acc[update.stage] = update;
    return acc;
  }, {} as Record<string, Update>);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Live Updates</h2>

      <div className="relative flex w-full items-start justify-between">
        {STAGES.map((stage, index) => {
          const isCompleted = index <= currentStageIndex;
          const update = updatesByStage[stage.id];

          return (
            <div
              key={stage.id}
              className="relative flex flex-1 flex-col items-center"
            >
              <div
                className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full sm:h-7 sm:w-7 ${
                  isCompleted
                    ? "bg-emerald-500"
                    : "border-2 border-slate-300 bg-white"
                }`}
              >
                {isCompleted && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
                )}
              </div>

              {index < STAGES.length - 1 && (
                <div
                  className={`absolute top-3 left-[50%] h-0.5 w-full sm:top-3.5 ${
                    isCompleted ? "bg-emerald-300" : "bg-slate-200"
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
                <p className="mt-0.5 hidden text-[8px] text-slate-400 sm:block">
                  {formatTimestamp(update?.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface NoBookingsProps {
  onBookingClick: () => void;
}

function NoBookings({ onBookingClick }: NoBookingsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <Car className="mx-auto h-12 w-12 text-slate-300" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        No Active Bookings
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        You don't have any car service bookings yet. Book your first service to get started!
      </p>
      <button
        type="button"
        onClick={onBookingClick}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        <Plus className="h-4 w-4" />
        Book a Service
      </button>
    </div>
  );
}

function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-emerald-600">
          drivlet
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 transition hover:text-emerald-600"
          >
            Home
          </Link>
          <Link
            href="/dashboard/bookings"
            className="flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-emerald-600"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Booking History</span>
          </Link>
          <Link
            href="/account"
            className="flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-emerald-600"
          >
            Account
            <ChevronRight className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [updateNotification, setUpdateNotification] = useState<string | null>(null);

  // Track previous booking state for comparison
  const previousBookingsRef = useRef<Booking[]>([]);
  const isInitialLoadRef = useRef(true);

  const openBookingModal = () => setShowBookingModal(true);
  const closeBookingModal = () => setShowBookingModal(false);

  // Check if booking has been updated
  const detectBookingChanges = useCallback((newBookings: Booking[]) => {
    if (isInitialLoadRef.current || previousBookingsRef.current.length === 0) {
      return null;
    }

    for (const newBooking of newBookings) {
      const prevBooking = previousBookingsRef.current.find(b => b._id === newBooking._id);

      if (prevBooking) {
        // Check if stage changed
        if (newBooking.currentStage !== prevBooking.currentStage) {
          const newStage = STAGES.find(s => s.id === newBooking.currentStage);
          return `Your booking has progressed to: ${newStage?.label || newBooking.currentStage}`;
        }

        // Check if status changed
        if (newBooking.status !== prevBooking.status) {
          if (newBooking.status === "completed") {
            return "Your car service has been completed!";
          }
          if (newBooking.status === "cancelled") {
            return "Your booking has been cancelled";
          }
        }

        // Check if there are new updates
        if (newBooking.updates.length > prevBooking.updates.length) {
          const latestUpdate = newBooking.updates[newBooking.updates.length - 1];
          return latestUpdate.message;
        }
      }
    }

    return null;
  }, []);

  const fetchBookings = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) {
        setLoading(true);
      }

      const response = await fetch("/api/bookings");
      if (!response.ok) throw new Error("Failed to fetch bookings");
      const data = await response.json();

      // Check for changes if polling
      if (isPolling) {
        const changeMessage = detectBookingChanges(data);
        if (changeMessage) {
          setUpdateNotification(changeMessage);
        }
      }

      // Store current bookings for future comparison
      previousBookingsRef.current = data;
      setBookings(data);
      setError("");

      if (!isPolling) {
        isInitialLoadRef.current = false;
      }
    } catch {
      if (!isPolling) {
        setError("Failed to load your bookings");
      }
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
    }
  }, [detectBookingChanges]);

  // Initial load effect
  useEffect(() => {
    if (authStatus === "loading") return;

    if (!session?.user) {
      router.push("/login");
      return;
    }

    fetchBookings(false);
  }, [session, authStatus, router, fetchBookings]);

  // Polling effect - check for updates every 30 seconds
  useEffect(() => {
    if (authStatus !== "authenticated" || !session?.user) return;

    const pollInterval = setInterval(() => {
      fetchBookings(true);
    }, POLLING_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [authStatus, session, fetchBookings]);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (updateNotification) {
      const timer = setTimeout(() => setUpdateNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [updateNotification]);

  if (authStatus === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <DashboardHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
            <p className="mt-2 text-sm text-slate-600">Loading your dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <DashboardHeader />
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-red-700">{error}</p>
            <button
              onClick={() => fetchBookings(false)}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Get the most recent active booking (not completed or cancelled)
  const activeBooking = bookings.find(
    (b) => b.status === "in_progress" || b.status === "pending"
  );

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Booking Modal */}
      <BookingModal isOpen={showBookingModal} onClose={closeBookingModal} />

      {/* Update Notification Toast */}
      {updateNotification && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">Booking Updated</p>
              <p className="text-sm text-emerald-700">{updateNotification}</p>
            </div>
            <button
              onClick={() => setUpdateNotification(null)}
              className="ml-2 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <DashboardHeader />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {activeBooking ? (
          <>
            <BookingHeader booking={activeBooking} />
            <StatusSummary booking={activeBooking} />
            <ActivityTimeline
              currentStage={activeBooking.currentStage}
              updates={activeBooking.updates}
            />

            {/* Past Bookings */}
            {bookings.filter((b) => b._id !== activeBooking._id).length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Previous Bookings
                  </h2>
                  <Link
                    href="/dashboard/bookings"
                    className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-500"
                  >
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {bookings
                    .filter((b) => b._id !== activeBooking._id)
                    .slice(0, 5)
                    .map((booking) => (
                      <div
                        key={booking._id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {booking.vehicleRegistration} ({booking.vehicleState})
                          </p>
                          <p className="text-xs text-slate-500">
                            {booking.serviceType} •{" "}
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            booking.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : booking.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <NoBookings onBookingClick={openBookingModal} />
        )}
      </div>
    </main>
  );
}
