// src/app/driver/jobs/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  MapPin,
  Clock,
  Car,
  Navigation,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Play,
  ChevronRight,
  Star,
  Zap,
  Filter,
} from "lucide-react";

interface Job {
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
  isManualTransmission: boolean;
  hasExistingBooking: boolean;
  status: string;
  currentStage?: string;
  createdAt: string;
  payout: number;
  isPreferredArea: boolean;
}

type TabType = "available" | "accepted" | "in_progress";

export default function DriverJobsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("available");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/driver/jobs?status=${activeTab}&page=${page}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch jobs");
      }

      setJobs(data.jobs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleJobAction = async (jobId: string, action: "accept" | "decline" | "start" | "complete") => {
    setActionLoading(jobId);
    try {
      const res = await fetch("/api/driver/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: jobId, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }

      // Refresh jobs list
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: "available", label: "Available", icon: Briefcase },
    { key: "accepted", label: "Accepted", icon: CheckCircle },
    { key: "in_progress", label: "In Progress", icon: Play },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
          <p className="text-sm text-slate-500">
            Find and manage your pickup &amp; delivery jobs
          </p>
        </div>
        <button
          onClick={fetchJobs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {activeTab === tab.key && total > 0 && (
              <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {error}
          <button onClick={() => setError("")} className="ml-auto">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Jobs List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-2 text-sm text-slate-500">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">
            {activeTab === "available"
              ? "No available jobs"
              : activeTab === "accepted"
              ? "No accepted jobs"
              : "No jobs in progress"}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {activeTab === "available"
              ? "Check back soon for new pickup & delivery opportunities"
              : "Accept jobs from the Available tab to see them here"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {jobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
                activeTab={activeTab}
                actionLoading={actionLoading}
                onAction={handleJobAction}
              />
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
    </div>
  );
}

function JobCard({
  job,
  activeTab,
  actionLoading,
  onAction,
}: {
  job: Job;
  activeTab: TabType;
  actionLoading: string | null;
  onAction: (jobId: string, action: "accept" | "decline" | "start" | "complete") => void;
}) {
  const isLoading = actionLoading === job._id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-xl border bg-white overflow-hidden transition-shadow hover:shadow-md ${
        job.isPreferredArea ? "border-emerald-200 ring-1 ring-emerald-100" : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-slate-400" />
          <span className="font-mono font-semibold text-slate-900">
            {job.vehicleRegistration}
          </span>
          <span className="text-xs text-slate-500">({job.vehicleState})</span>
        </div>
        <div className="flex items-center gap-2">
          {job.isPreferredArea && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Star className="h-3 w-3" />
              Your Area
            </span>
          )}
          {job.isManualTransmission && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              <Zap className="h-3 w-3" />
              Manual
            </span>
          )}
          <span className="text-lg font-bold text-emerald-600">${job.payout}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Pickup Location */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase">
              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
              Pickup
            </div>
            <p className="text-sm font-medium text-slate-900">{job.pickupAddress}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {job.pickupTime}
            </div>
          </div>

          {/* Drop-off Location */}
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

        {/* Service Type */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-500">Service:</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {job.serviceType}
          </span>
        </div>

        {/* Customer */}
        <div className="mt-2 text-xs text-slate-500">
          Customer: <span className="font-medium text-slate-700">{job.customerName}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
        {activeTab === "available" && (
          <>
            <button
              onClick={() => onAction(job._id, "decline")}
              disabled={isLoading}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={() => onAction(job._id, "accept")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Accept Job
            </button>
          </>
        )}

        {activeTab === "accepted" && (
          <>
            <button
              onClick={() => onAction(job._id, "decline")}
              disabled={isLoading}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onAction(job._id, "start")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Pickup
            </button>
          </>
        )}

        {activeTab === "in_progress" && (
          <>
            <div className="mr-auto flex items-center gap-2 text-sm text-blue-600">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              {job.currentStage === "driver_en_route"
                ? "En route to pickup"
                : job.currentStage === "car_picked_up"
                ? "Car picked up"
                : job.currentStage === "at_garage"
                ? "At garage"
                : "In progress"}
            </div>
            <button
              onClick={() => onAction(job._id, "complete")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Complete Delivery
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
