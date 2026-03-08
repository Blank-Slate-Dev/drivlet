// src/app/driver/dashboard/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase,
  DollarSign,
  Clock,
  Settings,
  LogOut,
  RefreshCw,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

interface ClockStatus {
  isClockedIn: boolean;
  todaySummary: {
    hoursWorked: number;
    minutesWorked: number;
    jobsCompleted: number;
  };
}

interface EarningsData {
  totalEarnings: number;
  totalJobs: number;
  pendingEarnings: number;
  earnings: {
    _id: string;
    vehicleRegistration: string;
    garageName?: string;
    payout: number;
    completedAt: string;
  }[];
}

interface UpcomingJob {
  _id: string;
  customerName?: string;
  userName?: string;
  vehicleRegistration: string;
  pickupAddress?: string;
  garageAddress?: string;
  pickupTime?: string;
  pickupTimeSlot?: string;
  status: string;
  payout?: number;
  paymentAmount?: number;
}

export default function DriverDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [acceptedCount, setAcceptedCount] = useState<number | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [upcomingJobs, setUpcomingJobs] = useState<UpcomingJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch clock status
  const fetchClockStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/clock");
      if (res.ok) {
        const data = await res.json();
        setClockStatus(data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Fetch job counts + upcoming jobs
  const fetchJobCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/jobs?status=all");
      if (res.ok) {
        const data = await res.json();
        const allJobs = Object.values(data.myJobs as Record<string, UpcomingJob[]>).flat();
        setAcceptedCount(allJobs.length);

        // Extract upcoming jobs (pending or in_progress, sorted by date)
        const upcoming = allJobs
          .filter((j: UpcomingJob) => j.status !== "completed" && j.status !== "cancelled")
          .slice(0, 5);
        setUpcomingJobs(upcoming);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Fetch earnings
  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    try {
      const res = await fetch("/api/driver/earnings?period=week");
      if (res.ok) {
        const data = await res.json();
        setEarningsData(data);
      }
    } catch {
      // Silently fail
    } finally {
      setEarningsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && !session?.user?.isApproved) {
      router.push("/driver/pending");
    }
    if (
      status === "authenticated" &&
      session?.user?.onboardingStatus !== "active"
    ) {
      router.push("/driver/onboarding");
    }
  }, [session, status, router]);

  // Fetch data on mount
  useEffect(() => {
    if (status === "authenticated") {
      fetchClockStatus();
      fetchJobCounts();
      fetchEarnings();
    }
  }, [status, fetchClockStatus, fetchJobCounts, fetchEarnings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchClockStatus(), fetchJobCounts(), fetchEarnings()]);
    setRefreshing(false);
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
        <div className="animate-pulse space-y-6 w-full max-w-4xl px-6">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // Derive stats from existing data
  const weekEarnings = earningsData?.totalEarnings ?? 0;
  const todayJobs = clockStatus?.todaySummary?.jobsCompleted ?? 0;
  const completedJobs = earningsData?.totalJobs ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Driver Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Welcome back, {session?.user?.username || "Driver"}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Stats row (4 cards) */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

        {/* Earnings - primary accent card */}
        <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 p-4 shadow-sm shadow-emerald-500/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">This Week</p>
          {earningsLoading ? (
            <div className="mt-1.5 h-8 w-20 bg-emerald-500/40 rounded animate-pulse" />
          ) : (
            <p className="mt-1.5 text-2xl font-bold text-white">${weekEarnings}</p>
          )}
          <p className="text-xs text-emerald-200 mt-1">Earnings</p>
        </div>

        {/* Today's jobs */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Today</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{todayJobs}</p>
          <p className="text-xs text-slate-400 mt-1">Jobs completed</p>
        </div>

        {/* Active jobs */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{acceptedCount ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">Assigned jobs</p>
        </div>

        {/* Completed */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Completed</p>
          {earningsLoading ? (
            <div className="mt-1.5 h-8 w-12 bg-slate-200 rounded animate-pulse" />
          ) : (
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{completedJobs}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">This week</p>
        </div>

      </div>

      {/* Two-column layout: job list + sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* LEFT: Upcoming jobs panel (takes 2/3 width on lg) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Upcoming Jobs</h2>
            </div>
            <Link
              href="/driver/jobs"
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-500 transition"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Job rows */}
          {upcomingJobs.length === 0 ? (
            <div className="py-12 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">No upcoming jobs</p>
              <p className="text-xs text-slate-400 mt-1">New jobs will appear here once assigned.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingJobs.map((job) => (
                <div key={job._id} className="flex items-start gap-4 px-4 py-4 hover:bg-slate-50 transition">

                  {/* Time */}
                  <div className="min-w-[48px] text-center pt-0.5">
                    <p className="text-xs font-bold text-slate-800 leading-none">
                      {job.pickupTimeSlot || job.pickupTime?.split(",")[0] || "--"}
                    </p>
                  </div>

                  {/* Route indicator */}
                  <div className="flex flex-col items-center gap-0.5 pt-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white ring-offset-1 ring-offset-emerald-100" />
                    <div className="w-px flex-1 bg-slate-200 min-h-[28px]" />
                    <div className="h-2 w-2 rounded-sm border-2 border-emerald-500 bg-white" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        job.status === "in_progress"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      }`}>
                        {job.status === "in_progress" ? "In Progress" : "Pending"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {job.customerName || job.userName || "Customer"}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{job.vehicleRegistration}</p>
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-xs text-slate-500 truncate">{job.pickupAddress || "Pickup address"}</p>
                      <p className="text-xs text-slate-500 truncate">{job.garageAddress || "Drop-off address"}</p>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {(job.payout || job.paymentAmount) && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">
                          ${job.payout || ((job.paymentAmount ?? 0) / 100).toFixed(0)}
                        </p>
                        <p className="text-[10px] text-slate-400">payout</p>
                      </div>
                    )}
                    <Link
                      href="/driver/jobs"
                      className="text-xs font-semibold text-slate-500 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 rounded-md px-2.5 py-1 transition"
                    >
                      View
                    </Link>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar (takes 1/3 width on lg) */}
        <div className="flex flex-col gap-4">

          {/* Quick links */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Quick Access</p>
            <div className="space-y-2">
              {[
                { href: "/driver/jobs",     label: "My Jobs",     icon: Briefcase,  meta: `${acceptedCount ?? 0} assigned` },
                { href: "/driver/payments", label: "Payments",    icon: DollarSign,  meta: `$${weekEarnings} this week` },
                { href: "/driver/history",  label: "Job History",  icon: Clock,       meta: `${completedJobs} completed` },
                { href: "/driver/settings", label: "Settings",     icon: Settings,    meta: "" },
              ].map(({ href, label, icon: Icon, meta }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 hover:border-emerald-200 hover:bg-emerald-50 transition"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 group-hover:border-emerald-300 group-hover:bg-emerald-50 transition">
                    <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 group-hover:text-emerald-800">{label}</p>
                    {meta && <p className="text-xs text-slate-400">{meta}</p>}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Earnings summary card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Earnings Summary</p>
              <Link href="/driver/payments" className="text-xs font-semibold text-emerald-600 hover:text-emerald-500">
                Details
              </Link>
            </div>
            {earningsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-xs text-slate-500">This Week</span>
                  <span className="text-sm font-bold text-slate-800">${weekEarnings}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-xs text-slate-500">Pending</span>
                  <span className="text-sm font-bold text-slate-800">${earningsData?.pendingEarnings ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-slate-500">Jobs</span>
                  <span className="text-sm font-bold text-slate-800">{completedJobs}</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent earnings */}
          {earningsData && earningsData.earnings.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-900">Recent Earnings</p>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {earningsData.earnings.slice(0, 3).map((txn) => (
                  <div key={txn._id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-700">
                        {txn.vehicleRegistration}
                        {txn.garageName && (
                          <span className="text-slate-400"> &middot; {txn.garageName}</span>
                        )}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center gap-2 text-right">
                      <span className="text-sm font-medium text-emerald-600">${txn.payout}</span>
                      <span className="text-xs text-slate-400">{formatDate(txn.completedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/driver/login" })}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>

        </div>
      </div>
    </div>
  );
}
