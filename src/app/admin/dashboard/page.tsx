// src/app/admin/dashboard/page.tsx
// Widget-style dashboard (2026-08-07 redesign, NeuroBank-inspired layout,
// Drivlet emerald/teal theme). Light surfaces to match the rest of admin,
// with a single dark emerald hero card. All numbers come from
// /api/admin/stats?range= — nothing fabricated; every card degrades to an
// honest empty state when data is thin.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  ClipboardList,
  Gauge,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";

type RangeKey = "week" | "month" | "year";

interface SeriesPoint {
  bucket: string;
  bookings: number;
  revenue: number;
}

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
    paymentStatus: string;
    paymentAmount?: number;
    createdAt: string;
  }>;
  range: {
    key: RangeKey;
    bookings: number;
    revenue: number;
    prevBookings: number;
    prevRevenue: number;
    series: SeriesPoint[];
    completed: number;
    completionTotal: number;
    driversOnShift: number;
  };
}

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; prevLabel: string }> = [
  { key: "week", label: "This Week", prevLabel: "last week" },
  { key: "month", label: "This Month", prevLabel: "last month" },
  { key: "year", label: "This Year", prevLabel: "last year" },
];

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
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

const STATUS_CHIP: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-teal-50 text-teal-700 border-teal-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

function statusChip(status: string) {
  return STATUS_CHIP[status] || "bg-slate-50 text-slate-600 border-slate-200";
}

/** Percentage delta vs previous period; null when there's no baseline. */
function delta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function bucketLabel(bucket: string, rangeKey: RangeKey): string {
  // bucket is "YYYY-MM-DD" (week/month) or "YYYY-MM" (year)
  const parts = bucket.split("-").map(Number);
  if (rangeKey === "year") {
    return new Date(parts[0], (parts[1] || 1) - 1, 1).toLocaleDateString("en-AU", {
      month: "short",
    });
  }
  return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1).toLocaleDateString(
    "en-AU",
    { day: "numeric", month: "short" }
  );
}

/** Hand-rolled bar chart (no chart dependency): revenue per bucket. */
function MiniBarChart({
  series,
  rangeKey,
}: {
  series: SeriesPoint[];
  rangeKey: RangeKey;
}) {
  const max = Math.max(...series.map((s) => s.revenue), 1);
  const width = 260;
  const height = 72;
  const gap = 3;
  const barW = Math.max((width - gap * (series.length - 1)) / series.length, 2);

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-20 w-full"
        role="img"
        aria-label="Revenue per day"
        preserveAspectRatio="none"
      >
        {series.map((point, i) => {
          const h = Math.max((point.revenue / max) * (height - 6), 2);
          const isPeak = point.revenue === max && point.revenue > 0;
          return (
            <rect
              key={point.bucket}
              x={i * (barW + gap)}
              y={height - h}
              width={barW}
              height={h}
              rx={Math.min(2.5, barW / 2)}
              className={isPeak ? "fill-emerald-500" : "fill-emerald-200"}
            >
              <title>
                {bucketLabel(point.bucket, rangeKey)}: {formatCurrency(point.revenue)}{" "}
                · {point.bookings} booking{point.bookings === 1 ? "" : "s"}
              </title>
            </rect>
          );
        })}
      </svg>
      {/* Day markers: first / middle / last */}
      {series.length > 1 && (
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>{bucketLabel(series[0].bucket, rangeKey)}</span>
          {series.length > 2 && (
            <span>
              {bucketLabel(series[Math.floor(series.length / 2)].bucket, rangeKey)}
            </span>
          )}
          <span>{bucketLabel(series[series.length - 1].bucket, rangeKey)}</span>
        </div>
      )}
    </div>
  );
}

/** SVG donut gauge for the completion rate. */
function CompletionGauge({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const filled = (pct / 100) * circumference;
  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          strokeWidth="12"
          className="stroke-emerald-100"
        />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          className="stroke-emerald-500 transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900">{pct}%</span>
        <span className="text-[11px] text-slate-500">completed</span>
      </div>
    </div>
  );
}

/** Card shell with title row + expand arrow linking to an admin page. */
function Card({
  title,
  href,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon className="h-4 w-4 text-emerald-600" />
          {title}
        </div>
        <Link
          href={href}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-emerald-200 hover:text-emerald-600"
          aria-label={`Open ${title}`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      {children}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [range, setRange] = useState<RangeKey>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Guards the range-switch race (re-audit): a slow response for the OLD
  // range must never overwrite widgets after the user has switched
  const requestedRangeRef = useRef<RangeKey>("month");

  const fetchStats = useCallback(
    async (rangeKey: RangeKey) => {
      requestedRangeRef.current = rangeKey;
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/stats?range=${rangeKey}`);
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        // Drop stale responses: only apply if this is still the active range
        if (data?.range?.key !== requestedRangeRef.current) return;
        setStats(data);
        setError("");
      } catch {
        if (rangeKey === requestedRangeRef.current) setError("Failed to load statistics");
      } finally {
        if (rangeKey === requestedRangeRef.current) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStats(range);
    const interval = setInterval(() => fetchStats(range), 30000);
    return () => clearInterval(interval);
  }, [range, fetchStats]);

  const rangeOption =
    RANGE_OPTIONS.find((o) => o.key === range) || RANGE_OPTIONS[1];

  // Loading skeleton (first load only)
  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-9 w-64 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white lg:col-span-2" />
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !stats) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="mb-2 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Failed to load data</span>
            </div>
            <p className="mb-3 text-sm text-red-600">{error}</p>
            <button
              onClick={() => fetchStats(range)}
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

  const r = stats?.range;
  const bookingsDelta = r ? delta(r.bookings, r.prevBookings) : null;
  const revenueDelta = r ? delta(r.revenue, r.prevRevenue) : null;
  const hasRevenue = (r?.revenue || 0) > 0 || (r?.series || []).some((s) => s.revenue > 0);
  const pendingCount = stats?.overview.pendingBookings || 0;
  const activeCount = stats?.overview.activeBookings || 0;

  // Hero copy — honest in every data state
  let heroHeadline: string;
  let heroSub: string;
  let HeroTrendIcon = TrendingUp;
  if (!r || r.bookings === 0) {
    heroHeadline = `No bookings yet ${rangeOption.label.toLowerCase()}`;
    heroSub = "New bookings will show up here the moment they land.";
  } else if (bookingsDelta === null) {
    heroHeadline = `${r.bookings} booking${r.bookings === 1 ? "" : "s"} ${rangeOption.label.toLowerCase()}`;
    heroSub = `No ${rangeOption.prevLabel} data to compare against yet.`;
  } else if (bookingsDelta >= 0) {
    heroHeadline = `Bookings up ${bookingsDelta}% since ${rangeOption.prevLabel}`;
    heroSub = `${r.bookings} booking${r.bookings === 1 ? "" : "s"} so far, compared with ${r.prevBookings} ${rangeOption.prevLabel}.`;
  } else {
    heroHeadline = `Bookings down ${Math.abs(bookingsDelta)}% since ${rangeOption.prevLabel}`;
    heroSub = `${r.bookings} booking${r.bookings === 1 ? "" : "s"} so far, compared with ${r.prevBookings} ${rangeOption.prevLabel}.`;
    HeroTrendIcon = TrendingDown;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Top bar: range selector left, refresh right */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => setRange(option.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  range === option.key
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchStats(range)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Row 1: hero insight · revenue overview · gauge */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Hero insight — the one dark surface */}
          <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/15 p-2">
                <HeroTrendIcon className="h-5 w-5" />
              </span>
              <Link
                href="/admin/bookings"
                className="rounded-lg border border-white/20 p-1.5 text-emerald-100 transition hover:bg-white/10 hover:text-white"
                aria-label="Open Bookings"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6">
              <h2 className="text-2xl font-bold leading-snug">{heroHeadline}</h2>
              <p className="mt-2 text-sm text-emerald-100">{heroSub}</p>
            </div>
          </div>

          {/* Revenue overview */}
          <Card title="Revenue" href="/admin/bookings" icon={TrendingUp}>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {formatCurrency(r?.revenue || 0)}
              </span>
              {revenueDelta !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    revenueDelta >= 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {revenueDelta >= 0 ? "+" : ""}
                  {revenueDelta}%
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {revenueDelta !== null
                ? `vs ${formatCurrency(r?.prevRevenue || 0)} ${rangeOption.prevLabel}`
                : `${rangeOption.label} · paid bookings`}
            </p>
            <div className="mt-4 flex-1">
              {hasRevenue && r ? (
                // rangeKey must come from the FETCHED data, not UI state —
                // during a switch the old series briefly renders and the
                // bucket labels would parse with the wrong format
                <MiniBarChart series={r.series} rangeKey={r.key} />
              ) : (
                <div className="flex h-20 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">
                  No paid bookings in this period yet
                </div>
              )}
            </div>
          </Card>

          {/* Completion gauge */}
          <Card title="Completion Rate" href="/admin/tracking" icon={Gauge}>
            {r && r.completionTotal > 0 ? (
              <>
                <CompletionGauge completed={r.completed} total={r.completionTotal} />
                <p className="mt-2 text-center text-xs text-slate-500">
                  {r.completed} of {r.completionTotal} booking
                  {r.completionTotal === 1 ? "" : "s"} delivered{" "}
                  {rangeOption.label.toLowerCase()}
                </p>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center py-8 text-xs text-slate-400">
                No bookings this period yet
              </div>
            )}
          </Card>
        </div>

        {/* Row 2: recent bookings (wide) · operations */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Transactions-style recent bookings */}
          <Card
            title="Recent Bookings"
            href="/admin/bookings"
            icon={ClipboardList}
            className="lg:col-span-2"
          >
            {stats?.recentBookings && stats.recentBookings.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {stats.recentBookings.slice(0, 6).map((booking) => (
                  <li key={booking._id}>
                    <Link
                      href={`/admin/bookings?view=${booking._id}`}
                      className="flex items-center gap-3 py-2.5 transition hover:bg-slate-50"
                    >
                      {/* Plate badge */}
                      <span className="w-20 shrink-0 rounded-md border border-slate-300 bg-slate-50 px-1.5 py-1 text-center font-mono text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {booking.vehicleRegistration}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-slate-900">
                            {booking.userName}
                          </span>
                          {booking.isGuest && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              Guest
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {getRelativeTime(booking.createdAt)}
                        </span>
                      </div>
                      <span className="hidden text-sm font-semibold text-slate-900 sm:block">
                        {booking.paymentStatus === "paid" &&
                        typeof booking.paymentAmount === "number"
                          ? formatCurrency(booking.paymentAmount)
                          : "—"}
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${statusChip(booking.status)}`}
                      >
                        {booking.status.replace("_", " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-10">
                <ClipboardList className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">No bookings yet</p>
              </div>
            )}
          </Card>

          {/* Operations stat card */}
          <Card title="Operations" href="/admin/dispatch" icon={Truck}>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{activeCount}</span>
              <span className="text-sm text-slate-500">
                active job{activeCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/admin/bookings?status=pending"
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  pendingCount > 0
                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                }`}
              >
                {pendingCount} pending
              </Link>
              <Link
                href="/admin/dispatch"
                className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 transition hover:border-teal-300"
              >
                {r?.driversOnShift ?? 0} driver
                {(r?.driversOnShift ?? 0) === 1 ? "" : "s"} on shift
              </Link>
              <Link
                href="/admin/users"
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:border-emerald-300"
              >
                {stats?.overview.totalUsers || 0} users
              </Link>
            </div>
            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <Users className="h-4 w-4 text-slate-400" />
                  Completed today
                </span>
                <span className="font-semibold text-slate-900">
                  {stats?.overview.completedToday || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <ClipboardList className="h-4 w-4 text-slate-400" />
                  Completed this week
                </span>
                <span className="font-semibold text-slate-900">
                  {stats?.overview.completedThisWeek || 0}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
