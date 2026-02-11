// src/app/driver/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Car,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Calendar,
  ChevronRight,
  CheckCircle,
  TrendingUp,
  Navigation,
  RefreshCw,
  Briefcase,
  Settings,
  Play,
  Square,
  Loader2,
} from "lucide-react";

interface ClockStatus {
  isClockedIn: boolean;
  lastClockIn: string | null;
  lastClockOut: string | null;
  currentTimeEntryId: string | null;
  canAcceptJobs: boolean;
  onboardingStatus: string;
  todaySummary: {
    hoursWorked: number;
    minutesWorked: number;
    jobsCompleted: number;
  };
}

export default function DriverDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Fetch clock status
  const fetchClockStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/clock");
      if (res.ok) {
        const data = await res.json();
        setClockStatus(data);
      }
    } catch (error) {
      console.error("Error fetching clock status:", error);
    }
  }, []);

  useEffect(() => {
    // Check if driver is approved by admin
    if (status === "authenticated" && !session?.user?.isApproved) {
      router.push("/driver/pending");
    }
    // CRITICAL: Check if driver has completed onboarding
    if (status === "authenticated" && session?.user?.onboardingStatus !== "active") {
      router.push("/driver/onboarding");
    }
  }, [session, status, router]);

  // Fetch clock status on mount
  useEffect(() => {
    if (status === "authenticated") {
      fetchClockStatus();
    }
  }, [status, fetchClockStatus]);

  // Live timer when clocked in
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (clockStatus?.isClockedIn && clockStatus.lastClockIn) {
      const updateElapsed = () => {
        const clockInTime = new Date(clockStatus.lastClockIn!).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - clockInTime) / 1000));
      };

      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [clockStatus?.isClockedIn, clockStatus?.lastClockIn]);

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle clock in/out
  const handleClockAction = async () => {
    setClockLoading(true);
    try {
      const action = clockStatus?.isClockedIn ? "clock_out" : "clock_in";
      const res = await fetch("/api/driver/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        await fetchClockStatus();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to process clock action");
      }
    } catch (error) {
      console.error("Error with clock action:", error);
      alert("Failed to process clock action");
    } finally {
      setClockLoading(false);
    }
  };

  if (status === "loading") {
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
          </div>
        </div>
      </div>
    );
  }

  // Mock data - replace with actual API calls
  const stats = {
    todayJobs: clockStatus?.todaySummary?.jobsCompleted ?? 0,
    weekEarnings: 420,
    rating: 4.9,
    completedJobs: 127,
  };

  const upcomingJobs = [
    {
      id: "1",
      customerName: "John Smith",
      pickupAddress: "123 George St, Sydney",
      dropoffAddress: "AutoCare Plus, Parramatta",
      pickupTime: "9:30 AM",
      status: "confirmed",
      payout: 28,
    },
    {
      id: "2",
      customerName: "Sarah Wilson",
      pickupAddress: "45 Queen St, Newcastle",
      dropoffAddress: "City Motors, Maitland",
      pickupTime: "11:00 AM",
      status: "pending",
      payout: 32,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header with Clock Button */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back, {session?.user?.username}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Clock In/Out Button */}
          {clockStatus && (
            <button
              onClick={handleClockAction}
              disabled={clockLoading || !clockStatus.canAcceptJobs}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                clockStatus.isClockedIn
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              } ${(!clockStatus.canAcceptJobs || clockLoading) && "opacity-50 cursor-not-allowed"}`}
            >
              {clockLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : clockStatus.isClockedIn ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {clockStatus.isClockedIn ? "Clock Out" : "Clock In"}
            </button>
          )}
          <button
            onClick={fetchClockStatus}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Clock Status Banner */}
      {clockStatus && (
        <div
          className={`mb-4 rounded-lg p-4 ${
            clockStatus.isClockedIn
              ? "bg-emerald-50 border border-emerald-200"
              : "bg-slate-100 border border-slate-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  clockStatus.isClockedIn ? "bg-emerald-100" : "bg-slate-200"
                }`}
              >
                <Clock
                  className={`h-6 w-6 ${
                    clockStatus.isClockedIn ? "text-emerald-600" : "text-slate-500"
                  }`}
                />
              </div>
              <div>
                <p
                  className={`text-sm font-medium ${
                    clockStatus.isClockedIn ? "text-emerald-800" : "text-slate-700"
                  }`}
                >
                  {clockStatus.isClockedIn ? "Currently Clocked In" : "Not Clocked In"}
                </p>
                {clockStatus.isClockedIn && clockStatus.lastClockIn && (
                  <p className="text-xs text-emerald-600">
                    Since {new Date(clockStatus.lastClockIn).toLocaleTimeString()}
                  </p>
                )}
                {!clockStatus.isClockedIn && clockStatus.lastClockOut && (
                  <p className="text-xs text-slate-500">
                    Last clocked out: {new Date(clockStatus.lastClockOut).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            {/* Elapsed Timer */}
            {clockStatus.isClockedIn && (
              <div className="text-right">
                <p className="text-xs text-emerald-600 font-medium">Elapsed Time</p>
                <p className="text-2xl font-mono font-bold text-emerald-700">
                  {formatElapsedTime(elapsedTime)}
                </p>
              </div>
            )}

            {/* Today's Summary */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-xs text-slate-500">Today&apos;s Hours</p>
                <p className="font-semibold text-slate-900">
                  {clockStatus.todaySummary.hoursWorked}h {clockStatus.todaySummary.minutesWorked}m
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Jobs Completed</p>
                <p className="font-semibold text-slate-900">
                  {clockStatus.todaySummary.jobsCompleted}
                </p>
              </div>
            </div>
          </div>

          {!clockStatus.isClockedIn && clockStatus.canAcceptJobs && (
            <p className="mt-3 text-xs text-slate-600">
              Clock in to start accepting jobs
            </p>
          )}

          {!clockStatus.canAcceptJobs && (
            <p className="mt-3 text-xs text-red-600">
              You must complete onboarding before you can clock in
            </p>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Earnings card */}
        <div className="rounded-lg bg-emerald-600 p-3">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-emerald-100" />
            <div>
              <p className="text-xs text-emerald-100">This Week</p>
              <p className="text-xl font-bold text-white">${stats.weekEarnings}</p>
            </div>
          </div>
        </div>

        {/* Today's jobs */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Today&apos;s Jobs</p>
              <p className="text-xl font-bold text-slate-900">{stats.todayJobs}</p>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xs text-slate-500">Rating</p>
              <p className="text-xl font-bold text-slate-900">{stats.rating}</p>
            </div>
          </div>
        </div>

        {/* Completed jobs */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Completed</p>
              <p className="text-xl font-bold text-slate-900">{stats.completedJobs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Link
          href="/driver/jobs"
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/50"
        >
          <Briefcase className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
          <span className="truncate text-sm font-medium text-slate-700 group-hover:text-emerald-700">Available Jobs</span>
          <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
        </Link>

        <Link
          href="/driver/earnings"
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/50"
        >
          <DollarSign className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
          <span className="truncate text-sm font-medium text-slate-700 group-hover:text-emerald-700">Earnings</span>
          <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
        </Link>

        <Link
          href="/driver/history"
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/50"
        >
          <Clock className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
          <span className="truncate text-sm font-medium text-slate-700 group-hover:text-emerald-700">History</span>
          <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
        </Link>

        <Link
          href="/driver/settings"
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/50"
        >
          <Settings className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
          <span className="truncate text-sm font-medium text-slate-700 group-hover:text-emerald-700">Settings</span>
          <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
        </Link>
      </div>

      {/* Upcoming Jobs */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">Upcoming Jobs</h2>
          </div>
          <Link
            href="/driver/jobs"
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 transition hover:text-emerald-500"
          >
            View all
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {upcomingJobs.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Car className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No upcoming jobs</p>
            <p className="text-xs text-slate-400">New jobs will appear here when assigned</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 hover:bg-slate-50/50 transition cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                        {job.customerName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-900">
                          {job.customerName}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded ${
                            job.status === "confirmed"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full ${
                            job.status === "confirmed" ? "bg-emerald-500" : "bg-amber-500"
                          }`} />
                          {job.status === "confirmed" ? "Confirmed" : "Pending"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin className="h-3 w-3 text-emerald-500" />
                        <span className="text-slate-500">From:</span>
                        <span className="font-medium">{job.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Navigation className="h-3 w-3 text-red-500" />
                        <span className="text-slate-500">To:</span>
                        <span className="font-medium">{job.dropoffAddress}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">{job.pickupTime}</span>
                    </div>
                    <div className="mt-2 text-lg font-bold text-emerald-600">
                      ${job.payout}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
