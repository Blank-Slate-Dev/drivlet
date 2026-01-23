// src/app/admin/dashboard/page.tsx
// Redesigned: Modern dashboard with clear visual hierarchy and actionable insights
"use client";

import { useEffect, useState, useMemo } from "react";
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
  DollarSign,
  XCircle,
  Building2,
  MessageSquare,
  ArrowUpRight,
  Zap,
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

type StatusFilter = "all" | "pending" | "in_progress" | "completed" | "cancelled";

const STAGE_LABELS: Record<string, string> = {
  booking_confirmed: "Confirmed",
  driver_en_route: "En Route",
  car_picked_up: "Picked Up",
  at_garage: "At Garage",
  service_in_progress: "In Progress",
  driver_returning: "Returning",
  delivered: "Delivered",
};

const STATUS_CONFIG: Record<StatusFilter, {
  label: string;
  icon: React.ElementType;
  activeClass: string;
  dotColor: string;
}> = {
  all: {
    label: "All",
    icon: ClipboardList,
    activeClass: "bg-slate-900 text-white border-slate-900",
    dotColor: "bg-slate-500",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    activeClass: "bg-amber-500 text-white border-amber-500",
    dotColor: "bg-amber-500",
  },
  in_progress: {
    label: "Active",
    icon: Activity,
    activeClass: "bg-blue-500 text-white border-blue-500",
    dotColor: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    activeClass: "bg-green-500 text-white border-green-500",
    dotColor: "bg-green-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    activeClass: "bg-red-500 text-white border-red-500",
    dotColor: "bg-red-500",
  },
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");

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

  const filteredBookings = useMemo(() => {
    if (!stats?.recentBookings) return [];
    if (activeFilter === "all") return stats.recentBookings;
    return stats.recentBookings.filter((b) => b.status === activeFilter);
  }, [stats?.recentBookings, activeFilter]);

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
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "in_progress":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "completed":
        return "bg-green-50 text-green-700 border border-green-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
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

  const getStatusCount = (status: StatusFilter): number => {
    if (!stats) return 0;
    switch (status) {
      case "all":
        return stats.overview.totalBookings;
      case "pending":
        return stats.overview.pendingBookings;
      case "in_progress":
        return stats.overview.activeBookings;
      case "completed":
        return stats.overview.completedBookings;
      case "cancelled":
        return stats.overview.cancelledBookings;
      default:
        return 0;
    }
  };

  // Loading skeleton
  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-8 w-48 rounded-lg bg-slate-200" />
                <div className="mt-2 h-4 w-64 rounded bg-slate-200" />
              </div>
              <div className="h-10 w-24 rounded-lg bg-slate-200" />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="h-40 rounded-xl bg-slate-200" />
              <div className="h-40 rounded-xl bg-slate-200" />
              <div className="h-40 rounded-xl bg-slate-200" />
            </div>
            <div className="h-24 rounded-xl bg-slate-200" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-slate-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !stats) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-8">
            <div className="flex items-center gap-3 text-red-700 mb-3">
              <AlertCircle className="h-6 w-6" />
              <span className="font-semibold text-lg">Failed to load data</span>
            </div>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchStats}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-slate-600">Real-time overview of operations</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* SECTION 1: Hero Metrics */}
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          {/* Weekly Revenue Card - Primary, prominent */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-white shadow-lg">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="h-full w-full"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-emerald-200" />
                <span className="text-emerald-100 text-sm font-medium">Weekly Revenue</span>
              </div>

              <div className="text-4xl sm:text-5xl font-bold mb-2">
                {formatCurrency(stats?.overview.weeklyRevenue || 0)}
              </div>

              <div className="text-emerald-100 text-sm">
                from {stats?.overview.completedThisWeek || 0} completed bookings
              </div>

              <div className="mt-4 flex items-center gap-1 text-emerald-200 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                <span>This week&apos;s performance</span>
              </div>
            </div>
          </div>

          {/* Today's Activity Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-slate-500" />
              <h3 className="font-semibold text-slate-900">Today&apos;s Activity</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">
                  {stats?.overview.todaysBookings || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">Bookings</div>
              </div>
              <div className="text-center border-x border-slate-100">
                <div className="text-3xl font-bold text-green-600">
                  {stats?.overview.completedToday || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats?.overview.activeBookings || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">Active Now</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total paid</span>
                <span className="font-semibold text-slate-900">
                  {stats?.overview.paidBookings || 0} bookings
                </span>
              </div>
            </div>
          </div>

          {/* Action Required Card */}
          <Link href="/admin/bookings?status=pending">
            <div
              className={`relative rounded-xl p-6 transition-all duration-200 h-full ${
                pendingCount > 0
                  ? "bg-amber-50 border-2 border-amber-400 shadow-lg shadow-amber-100 hover:shadow-xl hover:shadow-amber-200"
                  : "bg-slate-50 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Pulse animation if items pending */}
              {pendingCount > 0 && (
                <div className="absolute top-4 right-4">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <Clock className={`h-5 w-5 ${pendingCount > 0 ? "text-amber-600" : "text-slate-500"}`} />
                <span className={`text-sm font-semibold ${pendingCount > 0 ? "text-amber-700" : "text-slate-600"}`}>
                  Action Required
                </span>
              </div>

              <div className={`text-4xl font-bold mb-1 ${pendingCount > 0 ? "text-amber-900" : "text-slate-700"}`}>
                {pendingCount}
              </div>

              <div className={`text-sm ${pendingCount > 0 ? "text-amber-700" : "text-slate-500"}`}>
                {pendingCount === 1 ? "booking" : "bookings"} awaiting review
              </div>

              <div className={`mt-4 flex items-center gap-1 text-sm font-medium ${pendingCount > 0 ? "text-amber-600" : "text-slate-500"}`}>
                Review Now <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </div>

        {/* SECTION 2: Status Pipeline */}
        <div className="mb-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Booking Status
            </h3>

            <div className="flex flex-wrap gap-3">
              {(["all", "pending", "in_progress", "completed", "cancelled"] as StatusFilter[]).map(
                (status) => {
                  const config = STATUS_CONFIG[status];
                  const Icon = config.icon;
                  const count = getStatusCount(status);
                  const isActive = activeFilter === status;

                  return (
                    <button
                      key={status}
                      onClick={() => setActiveFilter(status)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all border ${
                        isActive
                          ? config.activeClass
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <div className="text-left">
                        <div className={`text-xs ${isActive ? "opacity-80" : "text-slate-500"}`}>
                          {config.label}
                        </div>
                        <div className="text-xl font-bold">{count}</div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Quick Actions */}
        <div className="mb-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Quick Actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Bookings Management */}
            <Link href="/admin/bookings">
              <div className="group relative rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md hover:border-emerald-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-lg p-3 bg-emerald-500">
                    <ClipboardList className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Bookings</h3>
                <p className="text-sm text-slate-600 mb-4">Manage all service bookings</p>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                  Manage{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            {/* Users & Drivers */}
            <Link href="/admin/users">
              <div className="group relative rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md hover:border-emerald-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-lg p-3 bg-blue-500">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {stats?.overview.totalUsers || 0}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">All Users</h3>
                <p className="text-sm text-slate-600 mb-4">Manage user accounts</p>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                  Manage{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            {/* Garages */}
            <Link href="/admin/garages">
              <div className="group relative rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md hover:border-emerald-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-lg p-3 bg-purple-500">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Garages</h3>
                <p className="text-sm text-slate-600 mb-4">Manage garage partners</p>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                  Manage{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            {/* Inquiries */}
            <Link href="/admin/inquiries">
              <div className="group relative rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md hover:border-emerald-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-lg p-3 bg-amber-500">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Inquiries</h3>
                <p className="text-sm text-slate-600 mb-4">Customer support requests</p>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                  Manage{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* SECTION 4: Recent Bookings Table */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Recent Bookings
              {activeFilter !== "all" && (
                <span className="ml-2 text-xs font-normal normal-case text-slate-400">
                  (Filtered: {STATUS_CONFIG[activeFilter].label})
                </span>
              )}
            </h2>
            <Link
              href="/admin/bookings"
              className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-500 transition"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {filteredBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Stage
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.slice(0, 5).map((booking) => (
                      <tr
                        key={booking._id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">
                                {booking.userName}
                              </span>
                              {booking.isGuest && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                  Guest
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-500">
                              {booking.userEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {booking.vehicleRegistration}
                            </span>
                            {booking.isManualTransmission && (
                              <span
                                className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                                title="Manual transmission"
                              >
                                M
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500">
                            {booking.vehicleState}
                          </div>
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
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPaymentStatusColor(
                              booking.paymentStatus || "pending"
                            )}`}
                          >
                            {booking.paymentStatus || "pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(
                              booking.status
                            )}`}
                          >
                            {booking.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatDate(booking.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/bookings/${booking._id}`}
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                          >
                            View <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <ClipboardList className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No bookings to display</p>
                <p className="text-sm text-slate-500 mt-1">
                  {activeFilter !== "all"
                    ? `No ${STATUS_CONFIG[activeFilter].label.toLowerCase()} bookings found`
                    : "Bookings will appear here once customers start booking"}
                </p>
                {activeFilter !== "all" && (
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
