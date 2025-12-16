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
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";

export default function DriverDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/driver/login");
    }
    if (status === "authenticated" && session?.user?.role !== "driver") {
      router.push("/");
    }
    if (status === "authenticated" && !session?.user?.isApproved) {
      router.push("/driver/pending");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-600">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Driver Dashboard</h1>
                <p className="text-xs text-slate-500">
                  Welcome back, {session?.user?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                <Bell className="h-5 w-5" />
              </button>
              <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/driver/login" })}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Today&apos;s Jobs</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.todayJobs}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">This Week</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ${stats.weekEarnings}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Rating</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.rating}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Jobs</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.completedJobs}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Jobs */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Jobs</h2>
            <Link
              href="/driver/jobs"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {upcomingJobs.length === 0 ? (
            <div className="p-12 text-center">
              <Car className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No upcoming jobs</h3>
              <p className="text-slate-500 mt-1">
                New jobs will appear here when they&apos;re assigned to you.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {upcomingJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-6 hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900">
                          {job.customerName}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            job.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {job.status === "confirmed" ? "Confirmed" : "Pending"}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-slate-500">Pickup:</span>{" "}
                            <span className="text-slate-700">{job.pickupAddress}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-slate-500">Drop-off:</span>{" "}
                            <span className="text-slate-700">{job.dropoffAddress}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{job.pickupTime}</span>
                      </div>
                      <div className="mt-2 text-lg font-semibold text-emerald-600">
                        ${job.payout}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/driver/jobs"
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition"
          >
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Car className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Available Jobs</h3>
              <p className="text-sm text-slate-500">Find new jobs nearby</p>
            </div>
          </Link>

          <Link
            href="/driver/earnings"
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition"
          >
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Earnings</h3>
              <p className="text-sm text-slate-500">View your earnings</p>
            </div>
          </Link>

          <Link
            href="/driver/settings"
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition"
          >
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Settings className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Settings</h3>
              <p className="text-sm text-slate-500">Manage your profile</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
