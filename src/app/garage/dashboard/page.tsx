// src/app/garage/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  MapPin,
  Clock,
  User,
  Phone,
  RefreshCw,
  CheckCircle,
  ClipboardList,
  DollarSign,
  Star,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
  X,
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
  createdAt: string;
}

interface DashboardStats {
  pendingBookings: number;
  acceptedBookings: number;
  completedThisMonth: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
}

export default function GarageDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [garageName, setGarageName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Welcome modal
  const [showWelcome, setShowWelcome] = useState(false);

  const isGarage = session?.user?.role === "garage";
  const isApproved = Boolean(session?.user?.isApproved);
  const userId = session?.user?.id;

  const welcomeParam = searchParams.get("welcome") === "1";

  const welcomeKey = useMemo(() => {
    if (!userId) return null;
    return `drivlet:garage_welcome_seen:${userId}`;
  }, [userId]);

  // Redirect if not authenticated or wrong role
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/garage/login");
      return;
    }

    if (!isGarage) {
      router.push("/");
      return;
    }

    // If garage isn't approved, keep them on pending page
    if (!isApproved) {
      router.push("/garage/pending");
      return;
    }
  }, [session, status, isGarage, isApproved, router]);

  // Show welcome modal:
  // - if coming from pending redirect (?welcome=1), OR
  // - first time an approved garage reaches dashboard (localStorage flag)
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!isGarage || !isApproved) return;
    if (!welcomeKey) return;

    try {
      const seen = localStorage.getItem(welcomeKey) === "1";

      if (welcomeParam && !seen) {
        setShowWelcome(true);
        localStorage.setItem(welcomeKey, "1");
        return;
      }

      if (!seen) {
        setShowWelcome(true);
        localStorage.setItem(welcomeKey, "1");
      }
    } catch (e) {
      // If localStorage is blocked, still show it once this session.
      setShowWelcome(true);
    }
  }, [status, isGarage, isApproved, welcomeKey, welcomeParam]);

  // Fetch data
  useEffect(() => {
    if (session?.user.role === "garage" && isApproved) {
      fetchData();
      const interval = setInterval(() => fetchData(false), 30000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isApproved]);

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const [incomingRes, statsRes] = await Promise.all([
        fetch("/api/garage/dashboard/incoming"),
        fetch("/api/garage/stats"),
      ]);

      if (incomingRes.ok) {
        const data = await incomingRes.json();
        setBookings(data.bookings || []);
        setGarageName(data.garageName || "");
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const handleAcknowledge = async (bookingId: string) => {
    setAcknowledging(bookingId);

    try {
      const res = await fetch("/api/garage/acknowledge-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b._id !== bookingId));
        const statsRes = await fetch("/api/garage/stats");
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to acknowledge booking");
      }
    } catch (err) {
      console.error("Failed to acknowledge:", err);
      alert("Failed to acknowledge booking");
    } finally {
      setAcknowledging(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

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
      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 240, damping: 20 }}
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 relative">
                <button
                  onClick={() => setShowWelcome(false)}
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition"
                  aria-label="Close welcome"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 border border-white/30">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Welcome to Drivlet!</h2>
                    <p className="text-sm text-emerald-100">Your garage is approved and ready.</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <p className="text-sm text-slate-700">
                  You can now receive incoming bookings, acknowledge them, and manage your workflow from the dashboard.
                </p>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setShowWelcome(false);
                    }}
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    Let’s go
                  </button>
                  <button
                    onClick={() => {
                      setShowWelcome(false);
                      router.push("/garage/bookings");
                    }}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    View bookings
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Welcome back, {garageName}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/garage/bookings")}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              View All Bookings
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-emerald-600 p-3">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-emerald-100" />
              <div>
                <p className="text-xs text-emerald-100">Revenue (Month)</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Pending Bookings</p>
                <p className="text-xl font-bold text-slate-900">{stats?.pendingBookings || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Completed (Month)</p>
                <p className="text-xl font-bold text-slate-900">{stats?.completedThisMonth || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-xs text-slate-500">Rating</p>
                <p className="text-xl font-bold text-slate-900">
                  {stats?.averageRating?.toFixed(1) || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Incoming Bookings Section */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Incoming Bookings</h2>
              {bookings.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-medium text-emerald-700">
                  {bookings.length} new
                </span>
              )}
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 font-medium text-slate-900">All caught up!</p>
              <p className="mt-1 text-sm text-slate-500">
                No new incoming bookings at the moment
              </p>
              <button
                onClick={() => router.push("/garage/bookings")}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                View all bookings
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bookings.map((booking) => (
                <div key={booking._id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Car className="h-6 w-6 text-emerald-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {booking.vehicleRegistration} ({booking.vehicleState})
                            </h3>
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              NEW
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{booking.serviceType}</p>
                        </div>

                        <button
                          onClick={() => handleAcknowledge(booking._id)}
                          disabled={acknowledging === booking._id}
                          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                        >
                          {acknowledging === booking._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Acknowledge
                        </button>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{booking.userName}</span>
                        </div>

                        {booking.guestPhone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <a href={`tel:${booking.guestPhone}`} className="hover:text-emerald-600">
                              {booking.guestPhone}
                            </a>
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
    </div>
  );
}
