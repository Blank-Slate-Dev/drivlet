// src/app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  AlertCircle,
  ArrowRight,
  RefreshCw,
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
    totalEarnings: number;
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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500";
      case "in_progress":
        return "bg-blue-500";
      case "pending":
        return "bg-amber-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-slate-400";
    }
  };

  // Loading skeleton
  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-7 w-32 rounded bg-slate-200 animate-pulse" />
            <div className="h-9 w-20 rounded-lg bg-slate-200 animate-pulse" />
          </div>
          {/* Metric cards skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mt-2" />
              </div>
            ))}
          </div>
          {/* Table skeleton */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-50 rounded animate-pulse mb-2" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !stats) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Failed to load data</span>
            </div>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchStats}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = stats?.overview.pendingBookings || 0;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Section 1: Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Bookings */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-2xl font-bold text-slate-900">
              {stats?.overview.totalBookings || 0}
            </div>
            <div className="text-sm text-slate-500 mt-1">Total Bookings</div>
          </div>

          {/* Active */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-2xl font-bold text-slate-900">
              {stats?.overview.activeBookings || 0}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Active
            </div>
          </div>

          {/* Today */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-2xl font-bold text-slate-900">
              {stats?.overview.todaysBookings || 0}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Today
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats?.overview.totalEarnings || 0)}
            </div>
            <div className="text-sm text-slate-500 mt-1">Revenue</div>
          </div>
        </div>

        {/* Section 2: Recent Bookings Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Recent Bookings</h2>
            <Link
              href="/admin/bookings"
              className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
            >
              View all →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {stats?.recentBookings && stats.recentBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                        Vehicle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.recentBookings.slice(0, 10).map((booking) => (
                      <tr
                        key={booking._id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${getStatusDot(booking.status)}`}
                            title={booking.status.replace("_", " ")}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {booking.userName}
                            </span>
                            {booking.isGuest && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                Guest
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{booking.userEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-slate-700 uppercase">
                            {booking.vehicleRegistration}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {getRelativeTime(booking.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/bookings/${booking._id}`}
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <ClipboardList className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No bookings yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: At-a-Glance Summary Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Pending Action */}
          <Link href="/admin/bookings?status=pending">
            <div
              className={`rounded-xl border p-4 transition-colors ${
                pendingCount > 0
                  ? "border-amber-200 bg-amber-50/50 hover:border-amber-300"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="text-lg font-semibold text-slate-900">{pendingCount}</div>
              <div className="text-xs text-slate-500">Pending action</div>
            </div>
          </Link>

          {/* Registered Users */}
          <Link href="/admin/users">
            <div className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
              <div className="text-lg font-semibold text-slate-900">
                {stats?.overview.totalUsers || 0}
              </div>
              <div className="text-xs text-slate-500">Registered users</div>
            </div>
          </Link>

          {/* Completed This Week */}
          <Link href="/admin/bookings">
            <div className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
              <div className="text-lg font-semibold text-slate-900">
                {stats?.overview.completedThisWeek || 0}
              </div>
              <div className="text-xs text-slate-500">Completed this week</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
