// src/app/garage/analytics/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Star,
  Users,
  Clock,
  CheckCircle2,
  BarChart3,
  ArrowLeft,
  Loader2,
  Lock,
  Crown,
  RefreshCw,
} from "lucide-react";

interface BasicStats {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  totalReviews: number;
  averageRating: number;
  completionRate: number;
}

interface RevenueData {
  dailyRevenue: { date: string; revenue: number; bookings: number }[];
  totalRevenue: number;
  previousPeriodRevenue: number;
  revenueChange: number;
  averageBookingValue: number;
}

interface BookingTrend {
  date: string;
  completed: number;
  pending: number;
  cancelled: number;
  total: number;
}

interface ServiceBreakdown {
  service: string;
  count: number;
  revenue: number;
  completionRate: number;
}

interface CustomerInsights {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  returnRate: number;
  topCustomers: { email: string; bookings: number; totalSpent: number }[];
}

interface ComparisonData {
  bookings: { current: number; previous: number; change: number };
  revenue: { current: number; previous: number; change: number };
  completionRate: { current: number; previous: number; change: number };
}

interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  categoryAverages: {
    quality: number;
    communication: number;
    timeliness: number;
    value: number;
  };
}

export default function GarageAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(30);
  const [hasAccess, setHasAccess] = useState(false);

  // Data states
  const [basicStats, setBasicStats] = useState<BasicStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [bookingTrends, setBookingTrends] = useState<BookingTrend[]>([]);
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceBreakdown[]>([]);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/garage/analytics?period=${period}`);
      const data = await res.json();

      if (res.ok) {
        setHasAccess(data.hasAnalyticsAccess);
        setBasicStats(data.basicStats);

        if (data.hasAnalyticsAccess) {
          setRevenueData(data.revenueData);
          setBookingTrends(data.bookingTrends || []);
          setServiceBreakdown(data.serviceBreakdown || []);
          setCustomerInsights(data.customerInsights);
          setComparisonData(data.comparisonData);
          setRatingStats(data.ratingStats);
        }
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "garage") {
      router.push("/garage/login");
      return;
    }
    fetchAnalytics();
  }, [session, status, router, fetchAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/garage/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
              <p className="text-sm text-slate-500">
                {hasAccess ? "Track your business performance" : "Basic stats"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Basic Stats - Available to all */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Total Bookings"
            value={basicStats?.totalBookings || 0}
            icon={Calendar}
            color="blue"
          />
          <StatCard
            title="Completed"
            value={basicStats?.completedBookings || 0}
            icon={CheckCircle2}
            color="emerald"
            suffix={`${basicStats?.completionRate || 0}%`}
          />
          <StatCard
            title="Reviews"
            value={basicStats?.totalReviews || 0}
            icon={Star}
            color="amber"
          />
          <StatCard
            title="Avg Rating"
            value={basicStats?.averageRating || 0}
            icon={Star}
            color="purple"
            decimals={1}
            suffix="/5"
          />
        </div>

        {/* Upgrade prompt if no access */}
        {!hasAccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 p-8 text-white mb-8"
          >
            <div className="flex items-start gap-6">
              <div className="rounded-full bg-white/20 p-4">
                <Lock className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">Unlock Full Analytics</h2>
                <p className="text-purple-100 mb-4">
                  Upgrade to Analytics or Premium to access detailed revenue tracking, customer
                  insights, trend reports, and more.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => router.push("/garage/subscription")}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-50 transition"
                  >
                    <Crown className="h-4 w-4" />
                    View Plans
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Full Analytics - Paid tiers only */}
        {hasAccess && (
          <>
            {/* Revenue Section */}
            <div className="grid gap-6 lg:grid-cols-3 mb-8">
              {/* Revenue Chart Area */}
              <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  Revenue Overview
                </h3>
                {revenueData && revenueData.dailyRevenue.length > 0 ? (
                  <div className="space-y-4">
                    {/* Simple bar representation */}
                    <div className="flex items-end gap-1 h-40">
                      {revenueData.dailyRevenue.slice(-14).map((day, i) => {
                        const maxRevenue = Math.max(
                          ...revenueData.dailyRevenue.map((d) => d.revenue)
                        );
                        const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-emerald-500 rounded-t transition-all hover:bg-emerald-400"
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={`${day.date}: $${day.revenue.toFixed(0)}`}
                          />
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                      <div>
                        <p className="text-sm text-slate-500">Total Revenue</p>
                        <p className="text-2xl font-bold text-slate-900">
                          ${revenueData.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Change</p>
                        <p
                          className={`text-2xl font-bold flex items-center gap-1 ${
                            revenueData.revenueChange >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {revenueData.revenueChange >= 0 ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : (
                            <TrendingDown className="h-5 w-5" />
                          )}
                          {Math.abs(revenueData.revenueChange)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Avg Booking</p>
                        <p className="text-2xl font-bold text-slate-900">
                          ${revenueData.averageBookingValue}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-slate-400">
                    No revenue data for this period
                  </div>
                )}
              </div>

              {/* Comparison Cards */}
              <div className="space-y-4">
                {comparisonData && (
                  <>
                    <ComparisonCard
                      title="Bookings"
                      current={comparisonData.bookings.current}
                      previous={comparisonData.bookings.previous}
                      change={comparisonData.bookings.change}
                    />
                    <ComparisonCard
                      title="Revenue"
                      current={comparisonData.revenue.current}
                      previous={comparisonData.revenue.previous}
                      change={comparisonData.revenue.change}
                      prefix="$"
                    />
                    <ComparisonCard
                      title="Completion Rate"
                      current={comparisonData.completionRate.current}
                      previous={comparisonData.completionRate.previous}
                      change={comparisonData.completionRate.change}
                      suffix="%"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Service Breakdown & Customer Insights */}
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              {/* Service Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Service Breakdown
                </h3>
                {serviceBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {serviceBreakdown.map((service, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{service.service}</p>
                          <p className="text-sm text-slate-500">
                            {service.count} bookings · {service.completionRate}% completed
                          </p>
                        </div>
                        <p className="font-semibold text-slate-900">${service.revenue.toFixed(0)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    No service data for this period
                  </div>
                )}
              </div>

              {/* Customer Insights */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Customer Insights
                </h3>
                {customerInsights ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Total Customers</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {customerInsights.totalCustomers}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Return Rate</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {customerInsights.returnRate}%
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1 text-center py-3 rounded-lg bg-emerald-50">
                        <p className="text-2xl font-bold text-emerald-700">
                          {customerInsights.newCustomers}
                        </p>
                        <p className="text-xs text-emerald-600">New</p>
                      </div>
                      <div className="flex-1 text-center py-3 rounded-lg bg-blue-50">
                        <p className="text-2xl font-bold text-blue-700">
                          {customerInsights.returningCustomers}
                        </p>
                        <p className="text-xs text-blue-600">Returning</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    No customer data for this period
                  </div>
                )}
              </div>
            </div>

            {/* Ratings Breakdown */}
            {ratingStats && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Rating Breakdown
                </h3>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Distribution */}
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = ratingStats.ratingDistribution[rating] || 0;
                      const percentage =
                        ratingStats.totalReviews > 0
                          ? (count / ratingStats.totalReviews) * 100
                          : 0;
                      return (
                        <div key={rating} className="flex items-center gap-3">
                          <span className="w-8 text-sm text-slate-600">{rating}★</span>
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-8 text-sm text-slate-500">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Category Averages */}
                  <div className="space-y-3">
                    {Object.entries(ratingStats.categoryAverages).map(([category, value]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 capitalize">{category}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= value ? "text-amber-400 fill-amber-400" : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  decimals = 0,
  suffix,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: "blue" | "emerald" | "amber" | "purple";
  decimals?: number;
  suffix?: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2.5 ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">
          {decimals > 0 ? value.toFixed(decimals) : value.toLocaleString()}
          {suffix && <span className="text-lg font-normal text-slate-400 ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  );
}

// Comparison Card Component
function ComparisonCard({
  title,
  current,
  previous,
  change,
  prefix = "",
  suffix = "",
}: {
  title: string;
  current: number;
  previous: number;
  change: number;
  prefix?: string;
  suffix?: string;
}) {
  const isPositive = change >= 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500 mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-xl font-bold text-slate-900">
          {prefix}
          {typeof current === "number" ? current.toLocaleString() : current}
          {suffix}
        </p>
        <div
          className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        vs {prefix}
        {typeof previous === "number" ? previous.toLocaleString() : previous}
        {suffix} prev
      </p>
    </div>
  );
}
