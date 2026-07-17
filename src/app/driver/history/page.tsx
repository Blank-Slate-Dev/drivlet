// src/app/driver/history/page.tsx
// Driver job history — pickups and returns (drop-offs) in separate tabs,
// including upcoming/assigned legs as well as completed and cancelled ones.
// REDESIGNED 2026-07-17: earnings hero, segmented leg tabs, status chips,
// plate-badge cards with route preview + expandable timeline.
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Navigation,
  RefreshCw,
  Loader2,
  DollarSign,
  Star,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Home,
  Package,
  Truck,
  History as HistoryIcon,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

interface JobUpdate {
  stage: string;
  timestamp: string;
  message: string;
  updatedBy?: string;
}

type Leg = "pickup" | "return";
type LegStatus = "assigned" | "in_progress" | "completed" | "cancelled";

interface HistoryJob {
  _id: string;
  leg: Leg;
  legStatus: LegStatus;
  customerName: string;
  vehicleRegistration: string;
  vehicleState: string;
  vehicleModel: string | null;
  vehicleYear: string | null;
  serviceType: string;
  pickupAddress: string;
  garageName: string | null;
  garageAddress: string | null;
  pickupTime: string;
  dropoffTime: string;
  serviceDate: string | null;
  trackingCode: string | null;
  isManualTransmission: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  payout: number;
  updates: JobUpdate[];
}

interface HistoryStats {
  completedPickups: number;
  completedReturns: number;
  activeAssigned: number;
  cancelled: number;
  totalEarnings: number;
  completionRate: number;
}

interface DriverMetrics {
  totalJobs: number;
  completedJobs: number;
  averageRating: number;
  totalRatings: number;
}

type StatusFilter = "all" | "assigned" | "in_progress" | "completed" | "cancelled";
type SortBy = "recent" | "oldest";

// ─── Status chip config (matches app-wide 3-tone badge system) ──

const STATUS_META: Record<LegStatus, { label: string; chip: string; dot: string }> = {
  assigned: {
    label: "Upcoming",
    chip: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  in_progress: {
    label: "In Progress",
    chip: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  completed: {
    label: "Completed",
    chip: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    chip: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "assigned", label: "Upcoming" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

// ─── Page ──────────────────────────────────────────────────────

export default function DriverHistoryPage() {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [driverMetrics, setDriverMetrics] = useState<DriverMetrics | null>(null);
  const [counts, setCounts] = useState<{ pickup: number; return: number }>({
    pickup: 0,
    return: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leg, setLeg] = useState<Leg>("pickup");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/driver/history?leg=${leg}&status=${statusFilter}&sortBy=${sortBy}&page=${page}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch history");

      setJobs(data.jobs || []);
      setStats(data.stats || null);
      setDriverMetrics(data.driverMetrics || null);
      setCounts(data.counts || { pickup: 0, return: 0 });
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch history");
    } finally {
      setLoading(false);
    }
  }, [leg, statusFilter, sortBy, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const switchLeg = (next: Leg) => {
    if (next === leg) return;
    setLeg(next);
    setPage(1);
    setExpandedJob(null);
  };

  const switchStatus = (next: StatusFilter) => {
    setStatusFilter(next);
    setPage(1);
    setExpandedJob(null);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const completedLegs = stats ? stats.completedPickups + stats.completedReturns : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* ─── Header ─── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">History</h1>
            <p className="text-sm text-slate-500">
              Your pickups &amp; drop-offs, past and upcoming
            </p>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
            aria-label="Refresh history"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ─── Earnings hero ─── */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/20"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-100">Total earned</p>
                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {formatCurrency(stats.totalEarnings)}
                </p>
              </div>
              <div className="rounded-xl bg-white/15 p-2.5">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-100">
              <span>
                <span className="font-semibold text-white">{completedLegs}</span> legs completed
              </span>
              <span>
                <span className="font-semibold text-white">{stats.completionRate}%</span> completion
              </span>
              {driverMetrics && driverMetrics.totalRatings > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  <span className="font-semibold text-white">
                    {driverMetrics.averageRating.toFixed(1)}
                  </span>
                  ({driverMetrics.totalRatings})
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Quick stats ─── */}
        {stats && (
          <div className="mb-6 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{stats.completedPickups}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Pickups done
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{stats.completedReturns}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Drop-offs done
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{stats.activeAssigned}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Active now
              </p>
            </div>
          </div>
        )}

        {/* ─── Leg tabs (Pickups / Drop-offs) ─── */}
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => switchLeg("pickup")}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              leg === "pickup"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Package className={`h-4 w-4 ${leg === "pickup" ? "text-emerald-600" : ""}`} />
            Pickups
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                leg === "pickup" ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500"
              }`}
            >
              {counts.pickup}
            </span>
          </button>
          <button
            onClick={() => switchLeg("return")}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              leg === "return"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Truck className={`h-4 w-4 ${leg === "return" ? "text-emerald-600" : ""}`} />
            Drop-offs
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                leg === "return" ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500"
              }`}
            >
              {counts.return}
            </span>
          </button>
        </div>

        {/* ─── Status chips + sort ─── */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => switchStatus(f.key)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                statusFilter === f.key
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortBy);
              setPage(1);
            }}
            className="ml-auto flex-shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
            aria-label="Sort order"
          >
            <option value="recent">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        {/* ─── Error ─── */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ─── Jobs list ─── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="mt-2 text-sm text-slate-500">Loading history…</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
            <HistoryIcon className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">
              No {leg === "pickup" ? "pickups" : "drop-offs"} here yet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {statusFilter === "all"
                ? `${leg === "pickup" ? "Pickup" : "Drop-off"} jobs assigned to you will appear here`
                : "Try a different filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {jobs.map((job) => {
                const meta = STATUS_META[job.legStatus];
                const isExpanded = expandedJob === job._id;
                const dateLabel =
                  job.completedAt || job.cancelledAt || job.serviceDate || job.createdAt;
                // Route direction depends on the leg
                const fromLabel = job.leg === "pickup" ? job.pickupAddress : job.garageName || "Workshop";
                const toLabel = job.leg === "pickup" ? job.garageName || "Workshop" : job.pickupAddress;

                return (
                  <motion.div
                    key={`${job.leg}-${job._id}`}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* Card header */}
                    <button
                      onClick={() => setExpandedJob(isExpanded ? null : job._id)}
                      className="w-full px-5 py-4 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex flex-shrink-0 items-center rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-white">
                            {job.vehicleRegistration}
                          </span>
                          <span
                            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.chip}`}
                          >
                            {meta.label}
                          </span>
                          {job.isManualTransmission && (
                            <span className="flex-shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              Manual
                            </span>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          {job.legStatus === "completed" && job.payout > 0 && (
                            <span className="text-base font-bold text-emerald-600">
                              +{formatCurrency(job.payout)}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      <p className="mt-1.5 truncate text-sm text-slate-500">
                        {job.customerName} &middot; {job.serviceType}
                      </p>

                      {/* Compact route line */}
                      <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
                        <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${meta.dot}`} />
                        <span className="truncate">{fromLabel}</span>
                        <ChevronRight className="h-3 w-3 flex-shrink-0 text-slate-300" />
                        <span className="truncate">{toLabel}</span>
                      </div>

                      <p className="mt-1.5 text-xs text-slate-400">
                        {formatDate(dateLabel)}
                        {job.completedAt && ` · ${leg === "pickup" ? "dropped at workshop" : "delivered"} ${formatTime(job.completedAt)}`}
                      </p>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 px-5 py-4">
                            {/* Full route */}
                            <div className="space-y-2 text-sm text-slate-700">
                              <div className="flex items-start gap-2.5">
                                {job.leg === "pickup" ? (
                                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                                ) : (
                                  <Navigation className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                                )}
                                <div>
                                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                    From
                                  </p>
                                  <p>{job.leg === "pickup" ? job.pickupAddress : job.garageName || "Workshop"}</p>
                                  {job.leg === "return" && job.garageAddress && (
                                    <p className="text-xs text-slate-500">{job.garageAddress}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-start gap-2.5">
                                {job.leg === "pickup" ? (
                                  <Navigation className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                                ) : (
                                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                                )}
                                <div>
                                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                    To
                                  </p>
                                  <p>{job.leg === "pickup" ? job.garageName || "Workshop" : job.pickupAddress}</p>
                                  {job.leg === "pickup" && job.garageAddress && (
                                    <p className="text-xs text-slate-500">{job.garageAddress}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <Clock className="h-4 w-4 flex-shrink-0 text-slate-400" />
                                <span>
                                  {job.leg === "pickup"
                                    ? `Pickup window: ${job.pickupTime}`
                                    : `Return window: ${job.dropoffTime || job.pickupTime}`}
                                </span>
                              </div>
                            </div>

                            {/* Vehicle + reference */}
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                              {(job.vehicleYear || job.vehicleModel) && (
                                <div>
                                  <span className="text-slate-500">Vehicle:</span>{" "}
                                  <span className="font-medium text-slate-700">
                                    {[job.vehicleYear, job.vehicleModel].filter(Boolean).join(" ")}
                                  </span>
                                </div>
                              )}
                              {job.trackingCode && (
                                <div>
                                  <span className="text-slate-500">Ref:</span>{" "}
                                  <span className="font-mono text-xs font-medium text-slate-700">
                                    {job.trackingCode}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Cancellation reason */}
                            {job.legStatus === "cancelled" && job.cancellationReason && (
                              <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3">
                                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                                <p className="text-sm text-red-700">
                                  <span className="font-medium">Cancelled:</span>{" "}
                                  {job.cancellationReason}
                                </p>
                              </div>
                            )}

                            {/* Timeline */}
                            {job.updates && job.updates.length > 0 && (
                              <div className="mt-4">
                                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                  Recent activity
                                </p>
                                <div className="space-y-2.5 border-l-2 border-slate-100 pl-4">
                                  {job.updates.map((update, index) => (
                                    <div key={index} className="relative text-sm">
                                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                                      <p className="text-slate-700">{update.message}</p>
                                      <p className="text-xs text-slate-400">
                                        {formatDate(update.timestamp)} · {formatTime(update.timestamp)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ─── Pagination ─── */}
        {!loading && totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {total} job{total === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Return to Home ─── */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/driver/dashboard"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95"
          >
            <Home className="h-4 w-4" />
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
