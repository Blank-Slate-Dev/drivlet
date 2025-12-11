"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  MapPin,
  Calendar,
  Car,
  Wrench,
  ChevronRight,
  Loader2,
  Plus,
  AlertCircle,
} from "lucide-react";

type JourneyStage =
  | "Booking Confirmed"
  | "Driver En Route To You"
  | "Car Picked Up"
  | "At Garage"
  | "Service In Progress"
  | "Driver En Route Back"
  | "Delivered";

interface JourneyEvent {
  stage: JourneyStage;
  timestamp: string | null;
  completed: boolean;
  notes?: string;
}

interface Booking {
  _id: string;
  vehicle: {
    make: string;
    model: string;
    plate: string;
    state: string;
  };
  serviceType: string;
  currentStage: JourneyStage;
  overallProgress: number;
  pickupDate: string;
  pickupTimeStart: string;
  pickupTimeEnd: string;
  garageName: string;
  garageAddress: string;
  etaReturn?: string;
  statusMessage: string;
  journeyEvents: JourneyEvent[];
  status: string;
  updatedAt: string;
}

interface CarHeaderProps {
  booking: Booking;
}

function CarHeader({ booking }: CarHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600">Your Car Journey</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {booking.vehicle.make} {booking.vehicle.model}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Car className="h-4 w-4 text-slate-400" />
              {booking.vehicle.plate} ({booking.vehicle.state})
            </span>
          </div>
        </div>
        <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <Car className="h-8 w-8 text-emerald-600" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        Sit back while we handle the pick-up, drop-off, and return.
      </p>
    </div>
  );
}

interface StatusSummaryProps {
  booking: Booking;
}

function StatusSummary({ booking }: StatusSummaryProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pickupWindow = `${formatDate(booking.pickupDate)}, ${booking.pickupTimeStart}–${booking.pickupTimeEnd}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700"
          role="status"
          aria-label={`Current stage: ${booking.currentStage}`}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {booking.currentStage}
        </span>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
          {booking.serviceType}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Calendar className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Pickup Window
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {pickupWindow}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Wrench className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Garage
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {booking.garageName || "To be assigned"}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
            <MapPin className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Location
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {booking.garageAddress || "TBD"}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Clock className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Est. Return
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {booking.etaReturn ? formatDateTime(booking.etaReturn) : "TBD"}
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

      {booking.statusMessage && (
        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            What's Happening Now
          </p>
          <p className="mt-1 text-sm text-emerald-800">{booking.statusMessage}</p>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Last updated: {formatDateTime(booking.updatedAt)}
      </p>
    </div>
  );
}

interface ActivityTimelineProps {
  events: JourneyEvent[];
}

function ActivityTimeline({ events }: ActivityTimelineProps) {
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });
  };

  const eventTitles: Record<JourneyStage, string> = {
    "Booking Confirmed": "Confirmed",
    "Driver En Route To You": "En Route",
    "Car Picked Up": "Picked Up",
    "At Garage": "At Garage",
    "Service In Progress": "In Progress",
    "Driver En Route Back": "Returning",
    "Delivered": "Delivered",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Live Updates</h2>

      <div className="relative flex w-full items-start justify-between">
        {events.map((event, index) => (
          <div
            key={event.stage}
            className="relative flex flex-1 flex-col items-center"
          >
            <div
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full sm:h-7 sm:w-7 ${
                event.completed
                  ? "bg-emerald-500"
                  : "border-2 border-slate-300 bg-white"
              }`}
            >
              {event.completed && (
                <CheckCircle2 className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
              )}
            </div>

            {index < events.length - 1 && (
              <div
                className={`absolute top-3 left-[50%] h-0.5 w-full sm:top-3.5 ${
                  event.completed ? "bg-emerald-300" : "bg-slate-200"
                }`}
                style={{ zIndex: 0 }}
              />
            )}

            <div className="mt-2 w-full px-0.5 text-center">
              <p
                className={`text-[9px] font-medium leading-tight sm:text-[10px] ${
                  event.completed ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {eventTitles[event.stage]}
              </p>
              <p className="mt-0.5 hidden text-[8px] text-slate-400 sm:block">
                {formatTimestamp(event.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoBookings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <Car className="mx-auto h-12 w-12 text-slate-300" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        No Active Bookings
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        You don't have any car service bookings yet. Book your first service to get started!
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        <Plus className="h-4 w-4" />
        Book a Service
      </Link>
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

  useEffect(() => {
    if (authStatus === "loading") return;

    if (!session?.user) {
      router.push("/login");
      return;
    }

    fetchBookings();
  }, [session, authStatus, router]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/bookings");
      if (!response.ok) throw new Error("Failed to fetch bookings");
      const data = await response.json();
      setBookings(data);
      setError("");
    } catch {
      setError("Failed to load your bookings");
    } finally {
      setLoading(false);
    }
  };

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
              onClick={fetchBookings}
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
    (b) => b.status === "active" || b.status === "pending"
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <DashboardHeader />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {activeBooking ? (
          <>
            <CarHeader booking={activeBooking} />
            <StatusSummary booking={activeBooking} />
            <ActivityTimeline events={activeBooking.journeyEvents} />

            {/* Past Bookings */}
            {bookings.filter((b) => b._id !== activeBooking._id).length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Previous Bookings
                </h2>
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
                            {booking.vehicle.make} {booking.vehicle.model}
                          </p>
                          <p className="text-xs text-slate-500">
                            {booking.serviceType} •{" "}
                            {new Date(booking.pickupDate).toLocaleDateString()}
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
          <NoBookings />
        )}
      </div>
    </main>
  );
}
