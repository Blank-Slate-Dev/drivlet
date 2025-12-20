// src/app/driver/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
} from "lucide-react";

export default function DriverDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Check if driver is approved by admin
    if (status === "authenticated" && !session?.user?.isApproved) {
      router.push("/driver/pending");
    }
    // CRITICAL: Check if driver has completed onboarding
    // This enforces the state machine - approved ≠ can work
    // insuranceEligible is derived from onboardingStatus === "active"
    if (status === "authenticated" && session?.user?.onboardingStatus !== "active") {
      router.push("/driver/onboarding");
    }
  }, [session, status, router]);

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
    todayJobs: 3,
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
      {/* Page Header - Compact, matches admin */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back, {session?.user?.username}</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats Row - Compact, matches admin style */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Earnings card - Primary accent */}
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

      {/* Quick Links - Single row, compact cards */}
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

      {/* Upcoming Jobs - Compact table style */}
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
