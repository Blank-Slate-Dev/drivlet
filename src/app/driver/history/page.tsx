// src/app/driver/history/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Clock,
  CheckCircle,
  XCircle,
  Car,
  MapPin,
  Navigation,
  RefreshCw,
  Loader2,
  Calendar,
  DollarSign,
  Star,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  TrendingUp,
  Home,
} from "lucide-react";

interface JobUpdate {
  stage: string;
  timestamp: string;
  message: string;
  updatedBy?: string;
}

interface HistoryJob {
  _id: string;
  customerName: string;
  vehicleRegistration: string;
  vehicleState: string;
  serviceType: string;
  pickupAddress: string;
  garageName?: string;
  garageAddress?: string;
  pickupTime: string;
  dropoffTime: string;
  status: string;
  currentStage?: string;
  isManualTransmission: boolean;
  hasExistingBooking: boolean;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  payout: number;
  updates: JobUpdate[];
}

interface HistoryStats {
  completed: number;
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

type StatusFilter = "all" | "completed" | "cancelled";
type SortBy = "recent" | "oldest";

export default function DriverHistoryPage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [driverMetrics, setDriverMetrics] = useState<DriverMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
        `/api/driver/history?status=${statusFilter}&sortBy=${sortBy}&page=${page}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch history");
      }

      setJobs(data.jobs || []);
      setStats(data.stats || null);
      setDriverMetrics(data.driverMetrics || null);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch history");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Job History</h1>
          <p className="text-sm text-slate-500">
            View your completed and cancelled jobs
          </p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-3">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-emerald-100">Total Earned</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-100 p-3">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Cancelled</p>
                <p className="text-2xl font-bold text-slate-900">{stats.cancelled}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completion Rate</p>
                <p className="text-2xl font-bold text-slate-900">{stats.completionRate}%</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Driver Metrics */}
      {driverMetrics && driverMetrics.totalRatings > 0 && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            <span className="text-lg font-bold text-amber-700">
              {driverMetrics.averageRating.toFixed(1)}
            </span>
          </div>
          <span className="text-sm text-amber-700">
            Average rating from {driverMetrics.totalRatings} reviews
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-500">Filter:</span>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(["all", "completed", "cancelled"] as StatusFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setStatusFilter(filter);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                statusFilter === filter
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {filter === "all" ? "All" : filter === "completed" ? "Completed" : "Cancelled"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-slate-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortBy);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Jobs List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-2 text-sm text-slate-500">Loading history...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">No job history</h3>
          <p className="mt-2 text-sm text-slate-500">
            Completed and cancelled jobs will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {jobs.map((job) => (
              <motion.div
                key={job._id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                {/* Job Header */}
                <div
                  className="flex cursor-pointer items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
                  onClick={() => setExpandedJob(expandedJob === job._id ? null : job._id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-xl p-3 ${
                        job.status === "completed"
                          ? "bg-emerald-100"
                          : "bg-red-100"
                      }`}
                    >
                      {job.status === "completed" ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900">
                          {job.vehicleRegistration}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            job.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {job.status === "completed" ? "Completed" : "Cancelled"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {job.garageName || job.serviceType} •{" "}
                        {formatDate(job.completedAt || job.cancelledAt || job.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {job.status === "completed" && (
                      <span className="text-lg font-bold text-emerald-600">
                        +{formatCurrency(job.payout)}
                      </span>
                    )}
                    {expandedJob === job._id ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedJob === job._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 px-5 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* Pickup */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase">
                              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                              Pickup
                            </div>
                            <p className="text-sm font-medium text-slate-900">
                              {job.pickupAddress}
                            </p>
                            <p className="text-xs text-slate-500">{job.pickupTime}</p>
                          </div>

                          {/* Drop-off */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase">
                              <Navigation className="h-3.5 w-3.5 text-red-500" />
                              Drop-off
                            </div>
                            <p className="text-sm font-medium text-slate-900">
                              {job.garageName || "Service Centre"}
                            </p>
                            {job.garageAddress && (
                              <p className="text-xs text-slate-500">{job.garageAddress}</p>
                            )}
                          </div>
                        </div>

                        {/* Customer & Service */}
                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Customer:</span>{" "}
                            <span className="font-medium text-slate-700">
                              {job.customerName}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Service:</span>{" "}
                            <span className="font-medium text-slate-700">
                              {job.serviceType}
                            </span>
                          </div>
                        </div>

                        {/* Cancellation Reason */}
                        {job.status === "cancelled" && job.cancellationReason && (
                          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3">
                            <p className="text-sm text-red-700">
                              <span className="font-medium">Cancellation reason:</span>{" "}
                              {job.cancellationReason}
                            </p>
                          </div>
                        )}

                        {/* Timeline */}
                        {job.updates && job.updates.length > 0 && (
                          <div className="mt-4">
                            <p className="mb-2 text-xs font-medium text-slate-500 uppercase">
                              Timeline
                            </p>
                            <div className="space-y-2">
                              {job.updates.map((update, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-3 text-sm"
                                >
                                  <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                                  <div>
                                    <p className="text-slate-700">{update.message}</p>
                                    <p className="text-xs text-slate-400">
                                      {formatDate(update.timestamp)} at{" "}
                                      {formatTime(update.timestamp)}
                                    </p>
                                  </div>
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
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Return to Home Button */}
      <div className="mt-8 flex justify-center pb-8">
        <Link
          href="/driver/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200 active:scale-95"
        >
          <Home className="h-4 w-4" />
          Return to Home
        </Link>
      </div>
    </div>
  );
}
