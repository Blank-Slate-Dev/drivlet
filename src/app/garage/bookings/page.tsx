// src/app/garage/bookings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Car,
  MapPin,
  Clock,
  User,
  Phone,
  RefreshCw,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Mail,
  CheckCircle2,
  PlayCircle,
  X,
  Calendar,
  FileText,
} from "lucide-react";

interface Booking {
  _id: string;
  userName: string;
  userEmail: string;
  vehicleRegistration: string;
  vehicleState: string;
  serviceType: string;
  pickupAddress: string;
  pickupTime: string;
  guestPhone?: string;
  isManualTransmission: boolean;
  hasExistingBooking: boolean;
  existingBookingRef?: string;
  status: string;
  garageStatus: string;
  createdAt: string;
  assignedAt?: string;
  notes?: string;
  updates?: Array<{
    stage: string;
    timestamp: string;
    message: string;
  }>;
}

interface BookingCounts {
  all: number;
  acknowledged: number;
  inProgress: number;
  completed: number;
}

type TabType = "all" | "acknowledged" | "in_progress" | "completed";

export default function GarageBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [counts, setCounts] = useState<BookingCounts>({
    all: 0,
    acknowledged: 0,
    inProgress: 0,
    completed: 0,
  });
  const [garageName, setGarageName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Redirect if not authenticated or not a garage user
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/garage/login");
      return;
    }

    if (session.user.role !== "garage") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch data when tab changes
  useEffect(() => {
    if (session?.user.role === "garage") {
      fetchBookings();
    }
  }, [session, activeTab]);

  const fetchBookings = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/garage/bookings?status=${activeTab}`);

      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setCounts(data.counts || { all: 0, acknowledged: 0, inProgress: 0, completed: 0 });
        setGarageName(data.garageName || "");
      } else {
        setError("Failed to load bookings");
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings(false);
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    setUpdatingStatus(bookingId);

    try {
      const res = await fetch("/api/garage/update-booking-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status: newStatus }),
      });

      if (res.ok) {
        // Refresh the list
        await fetchBookings(false);
        setSelectedBooking(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (booking: Booking) => {
    if (booking.status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );
    }
    if (booking.status === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          <PlayCircle className="h-3 w-3" />
          In Progress
        </span>
      );
    }
    if (booking.garageStatus === "acknowledged") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          <Clock className="h-3 w-3" />
          Acknowledged
        </span>
      );
    }
    return null;
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "acknowledged", label: "Acknowledged", count: counts.acknowledged },
    { key: "in_progress", label: "In Progress", count: counts.inProgress },
    { key: "completed", label: "Completed", count: counts.completed },
  ];

  // Loading state
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/garage/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Bookings</h1>
              <p className="text-sm text-slate-500">{garageName}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="-mb-px flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activeTab === tab.key
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Bookings List */}
        <div className="rounded-lg border border-slate-200 bg-white">
          {bookings.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 font-medium text-slate-900">No bookings found</p>
              <p className="mt-1 text-sm text-slate-500">
                {activeTab === "all"
                  ? "You don't have any acknowledged bookings yet"
                  : `No ${activeTab.replace("_", " ")} bookings`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bookings.map((booking) => (
                <div
                  key={booking._id}
                  className="p-4 hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => setSelectedBooking(booking)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
                      <Car className="h-6 w-6 text-slate-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {booking.vehicleRegistration} ({booking.vehicleState})
                            </h3>
                            {getStatusBadge(booking)}
                          </div>
                          <p className="text-sm text-slate-600">{booking.serviceType}</p>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{booking.userName}</span>
                        </div>

                        {booking.guestPhone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span>{booking.guestPhone}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{booking.pickupAddress}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>
                            {new Date(booking.pickupTime).toLocaleString("en-AU", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Tags */}
                      {(booking.hasExistingBooking || booking.isManualTransmission) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {booking.hasExistingBooking && booking.existingBookingRef && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                              Ref: {booking.existingBookingRef}
                            </span>
                          )}
                          {booking.isManualTransmission && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                              Manual Transmission
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <Car className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {selectedBooking.vehicleRegistration} ({selectedBooking.vehicleState})
                  </h2>
                  <p className="text-sm text-slate-500">{selectedBooking.serviceType}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Current Status</span>
                {getStatusBadge(selectedBooking)}
              </div>

              {/* Customer Info */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="mb-3 font-medium text-slate-900">Customer Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">{selectedBooking.userName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a
                      href={`mailto:${selectedBooking.userEmail}`}
                      className="text-emerald-600 hover:underline"
                    >
                      {selectedBooking.userEmail}
                    </a>
                  </div>
                  {selectedBooking.guestPhone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <a
                        href={`tel:${selectedBooking.guestPhone}`}
                        className="text-emerald-600 hover:underline"
                      >
                        {selectedBooking.guestPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Details */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="mb-3 font-medium text-slate-900">Booking Details</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <span className="text-slate-600">{selectedBooking.pickupAddress}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">
                      {new Date(selectedBooking.pickupTime).toLocaleString("en-AU", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {selectedBooking.isManualTransmission && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Manual Transmission
                      </span>
                    </div>
                  )}
                  {selectedBooking.hasExistingBooking && selectedBooking.existingBookingRef && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        Existing Booking Ref: {selectedBooking.existingBookingRef}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline/Updates */}
              {selectedBooking.updates && selectedBooking.updates.length > 0 && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="mb-3 font-medium text-slate-900">Activity Timeline</h3>
                  <div className="space-y-3">
                    {selectedBooking.updates.map((update, index) => (
                      <div key={index} className="flex gap-3 text-sm">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
                          <div className="h-2 w-2 rounded-full bg-slate-400" />
                        </div>
                        <div>
                          <p className="text-slate-600">{update.message}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(update.timestamp).toLocaleString("en-AU")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedBooking.status !== "completed" && (
                <div className="flex gap-3 pt-2">
                  {selectedBooking.garageStatus === "acknowledged" &&
                    selectedBooking.status === "pending" && (
                      <button
                        onClick={() => handleStatusUpdate(selectedBooking._id, "in_progress")}
                        disabled={updatingStatus === selectedBooking._id}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-50"
                      >
                        {updatingStatus === selectedBooking._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )}
                        Start Service
                      </button>
                    )}
                  {selectedBooking.status === "in_progress" && (
                    <button
                      onClick={() => handleStatusUpdate(selectedBooking._id, "completed")}
                      disabled={updatingStatus === selectedBooking._id}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                    >
                      {updatingStatus === selectedBooking._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Mark Complete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
