// src/app/admin/dashboard/page.tsx
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
    // Auto-refresh every 30 seconds
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
        return "bg-amber-100 text-amber-700";
      case "in_progress":
        return "bg-emerald-100 text-emerald-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "failed":
        return "bg-red-100 text-red-700";
      case "refunded":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStageLabel = (stage: string) => {
    return STAGE_LABELS[stage] || stage;
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-16 w-64 rounded-2xl bg-slate-200" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-200" />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-slate-200" />
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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <p className="mt-4 text-lg font-medium text-red-700">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-red-500"
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-slate-600">
              Overview of all bookings and activity
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 transition-transform group-hover:rotate-180 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Revenue & Activity Row */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-500 to-teal-600 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-100">This Week&apos;s Revenue</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.overview.weeklyRevenue || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <Calendar className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Today&apos;s Bookings</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.overview.todaysBookings || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
                <CalendarDays className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Completed This Week</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.overview.completedThisWeek || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Paid Bookings</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.overview.paidBookings || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Stats Row */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <ClipboardList className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.overview.totalBookings || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.overview.pendingBookings || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">In Progress</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.overview.activeBookings || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.overview.completedBookings || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Cancelled</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.overview.cancelledBookings || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Stats Row */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Registered Users</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.overview.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                <UserPlus className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Guest Bookings</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.overview.guestBookings || 0}</p>
              </div>
            </div>
          </div>

          <Link
            href="/admin/bookings?status=pending"
            className="group rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm transition hover:shadow-md hover:border-amber-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-200">
                  <Clock className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-700">Action Required</p>
                  <p className="text-2xl font-bold text-amber-900">{stats?.overview.pendingBookings || 0} pending</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-amber-600 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/bookings"
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <ClipboardList className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Manage Bookings</p>
                <p className="text-sm text-slate-500">View and edit all bookings</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-600" />
          </Link>

          <Link
            href="/admin/users"
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Manage Users</p>
                <p className="text-sm text-slate-500">View all users & guests</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-600" />
          </Link>

          <Link
            href="/admin/bookings?status=in_progress"
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Car className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Active Pickups</p>
                <p className="text-sm text-slate-500">{stats?.overview.activeBookings || 0} in progress</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
          </Link>

          <Link
            href="/admin/garages"
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Partner Applications</p>
                <p className="text-sm text-slate-500">Review garage submissions</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-purple-600" />
          </Link>
        </div>

        {/* Recent Bookings */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Bookings
              </h2>
            </div>
            <Link
              href="/admin/bookings"
              className="group flex items-center gap-1 text-sm font-medium text-emerald-600 transition hover:text-emerald-500"
            >
              View all
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {stats?.recentBookings && stats.recentBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Vehicle</th>
                    <th className="px-6 py-3">Service</th>
                    <th className="px-6 py-3">Stage</th>
                    <th className="px-6 py-3">Payment</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentBookings.map((booking) => (
                    <tr key={booking._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">
                            {booking.userName}
                          </p>
                          {booking.isGuest && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              Guest
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {booking.userEmail}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {booking.vehicleRegistration}
                          </p>
                          {booking.isManualTransmission && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" title="Manual transmission">
                              M
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {booking.vehicleState}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {booking.serviceType}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {getStageLabel(booking.currentStage)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus || 'pending')}`}
                        >
                          {booking.paymentStatus || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}
                        >
                          {booking.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(booking.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Car className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">No bookings yet</p>
              <p className="mt-1 text-xs text-slate-400">Bookings will appear here once customers start booking</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
