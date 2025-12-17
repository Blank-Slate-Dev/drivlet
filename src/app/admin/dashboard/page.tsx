// src/app/admin/dashboard/page.tsx
// Redesigned: Compact, minimalist dashboard with reduced visual clutter
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Car,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Activity,
  Calendar,
  CalendarDays,
  DollarSign,
  UserPlus,
  XCircle,
  CreditCard,
  Building2,
  MessageSquare,
} from "lucide-react";

interface Stats {
  overview: {
    totalBookings: number;
    pendingBookings: number;
    activeBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    completedToday: number;
    completedThisWeek: number;
    totalUsers: number;
    guestBookings: number;
    paidBookings: number;
    todaysBookings: number;
    weeklyRevenue: number;
  };
  stageStats: Record<string, number>;
  recentBookings: Array<{
    _id: string;
    userName: string;
    userEmail: string;
    vehicleRegistration: string;
    vehicleState: string;
    serviceType: string;
    currentStage: string;
    status: string;
    isGuest: boolean;
    isManualTransmission?: boolean;
    paymentStatus: string;
    createdAt: string;
  }>;
}

const STAGE_LABELS: Record<string, string> = {
  booking_confirmed: "Confirmed",
  driver_en_route: "En Route",
  car_picked_up: "Picked Up",
  at_garage: "At Garage",
  service_in_progress: "In Progress",
  driver_returning: "Returning",
  delivered: "Delivered",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
      setError("");
    } catch {
      setError("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(cents / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 text-amber-700";
      case "in_progress":
        return "bg-emerald-50 text-emerald-700";
      case "completed":
        return "bg-green-50 text-green-700";
      case "cancelled":
        return "bg-red-50 text-red-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-50 text-green-700";
      case "pending":
        return "bg-amber-50 text-amber-700";
      case "failed":
        return "bg-red-50 text-red-700";
      case "refunded":
        return "bg-blue-50 text-blue-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getStageLabel = (stage: string) => {
    return STAGE_LABELS[stage] || stage;
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-48 rounded-lg bg-slate-200" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-slate-200" />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-slate-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
            <p className="mt-3 text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header - Compact */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Overview of bookings and activity</p>
          </div>
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Revenue & Key Metrics - Compact row */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Revenue card - Primary accent, still prominent but compact */}
          <div className="rounded-lg bg-emerald-600 p-3">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-emerald-100" />
              <div>
                <p className="text-xs text-emerald-100">Weekly Revenue</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(stats?.overview.weeklyRevenue || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Today's bookings */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Today</p>
                <p className="text-xl font-bold text-slate-900">{stats?.overview.todaysBookings || 0}</p>
              </div>
            </div>
          </div>

          {/* Completed this week */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Week Completed</p>
                <p className="text-xl font-bold text-slate-900">{stats?.overview.completedThisWeek || 0}</p>
              </div>
            </div>
          </div>

          {/* Paid bookings */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Paid</p>
                <p className="text-xl font-bold text-slate-900">{stats?.overview.paidBookings || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Status Row - Compact inline stats */}
        <div className="mb-4 grid gap-3 grid-cols-3 sm:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-500">Total</span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{stats?.overview.totalBookings || 0}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-slate-500">Pending</span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{stats?.overview.pendingBookings || 0}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500">Active</span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{stats?.overview.activeBookings || 0}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-slate-500">Done</span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{stats?.overview.completedBookings || 0}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-xs text-slate-500">Cancelled</span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{stats?.overview.cancelledBookings || 0}</p>
          </div>
        </div>

        {/* Users & Action Required - Compact */}
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-500">Registered Users</span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{stats?.overview.totalUsers || 0}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-500">Guest Bookings</span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{stats?.overview.guestBookings || 0}</p>
          </div>

          {/* Action Required - Simplified, less attention-grabbing */}
          <Link
            href="/admin/bookings?status=pending"
            className="group flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3 transition hover:bg-amber-50"
          >
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Action Required</span>
              </div>
              <p className="mt-1 text-lg font-bold text-amber-800">{stats?.overview.pendingBookings || 0} pending</p>
            </div>
            <ArrowRight className="h-4 w-4 text-amber-500 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Quick Links - Single row, compact cards */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <Link
            href="/admin/bookings"
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/50"
          >
            <ClipboardList className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
            <span className="truncate text-sm font-medium text-slate-700 group-hover:text-emerald-700">Bookings</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
          </Link>

          <Link
            href="/admin/users"
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/50"
          >
            <Users className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
            <span className="truncate text-sm font-medium text-slate-700 group-hover:text-emerald-700">Users</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
          </Link>

          <Link
            href="/admin/bookings?status=in_progress"
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/50"
          >
            <Car className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
            <span className="truncate text-sm font-medium text-slate-700 group-hover:text-emerald-700">Active</span>
            <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{stats?.overview.activeBookings || 0}</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
          </Link>

          <Link
            href="/admin/garages"
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/50"
          >
            <Building2 className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
            <span className="truncate text-sm font-medium text-slate-700 group-hover:text-emerald-700">Garages</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
          </Link>

          <Link
            href="/admin/inquiries"
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/50"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
            <span className="truncate text-sm font-medium text-slate-700 group-hover:text-emerald-700">Inquiries</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
          </Link>
        </div>

        {/* Recent Bookings - Compact table */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Recent Bookings</h2>
            </div>
            <Link
              href="/admin/bookings"
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 transition hover:text-emerald-500"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {stats?.recentBookings && stats.recentBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Vehicle</th>
                    <th className="px-4 py-2">Service</th>
                    <th className="px-4 py-2">Stage</th>
                    <th className="px-4 py-2">Payment</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.recentBookings.map((booking) => (
                    <tr key={booking._id} className="transition hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-900">{booking.userName}</p>
                          {booking.isGuest && (
                            <span className="rounded bg-amber-50 px-1 py-0.5 text-[10px] font-medium text-amber-600">
                              Guest
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{booking.userEmail}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-900">{booking.vehicleRegistration}</p>
                          {booking.isManualTransmission && (
                            <span className="rounded bg-amber-50 px-1 py-0.5 text-[10px] font-medium text-amber-600" title="Manual transmission">
                              M
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{booking.vehicleState}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{booking.serviceType}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {getStageLabel(booking.currentStage)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus || 'pending')}`}>
                          {booking.paymentStatus || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">
                        {formatDate(booking.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-12 text-center">
              <Car className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No bookings yet</p>
              <p className="text-xs text-slate-400">Bookings will appear here once customers start booking</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
