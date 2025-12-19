// src/app/driver/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
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
  TrendingUp,
  Navigation,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="flex items-center gap-2 text-white">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="relative h-10 w-32">
                  <Image
                    src="/logo.png"
                    alt="drivlet"
                    fill
                    className="object-contain brightness-0 invert"
                    priority
                  />
                </div>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-white/20" />
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 border border-white/20">
                <Car className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-white">Driver</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition">
                <Bell className="h-5 w-5" />
              </button>
              <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition">
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/driver/login" })}
                className="p-2 text-white/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 pb-32 pt-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-emerald-400 text-sm font-medium">Good morning!</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Welcome back, {session?.user?.username}
            </h1>
            <p className="text-slate-400 mt-2">Here&apos;s your driver dashboard overview</p>
          </motion.div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-24 pb-12">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: "Today's Jobs", value: stats.todayJobs, icon: Calendar, color: "emerald", trend: "+2 from yesterday" },
            { label: "This Week", value: `$${stats.weekEarnings}`, icon: DollarSign, color: "blue", trend: "+15% vs last week" },
            { label: "Rating", value: stats.rating, icon: Star, color: "amber", trend: "Excellent!" },
            { label: "Total Jobs", value: stats.completedJobs, icon: CheckCircle, color: "purple", trend: "All time" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    {stat.trend.startsWith('+') && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                    {stat.trend}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                  stat.color === 'emerald' ? 'bg-emerald-100' :
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'amber' ? 'bg-amber-100' : 'bg-purple-100'
                }`}>
                  <stat.icon className={`h-6 w-6 ${
                    stat.color === 'emerald' ? 'text-emerald-600' :
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'amber' ? 'text-amber-600' : 'text-purple-600'
                  }`} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Upcoming Jobs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Jobs</h2>
              <p className="text-sm text-slate-500">Your scheduled pickups</p>
            </div>
            <Link
              href="/driver/jobs"
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full transition"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {upcomingJobs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Car className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mt-4">No upcoming jobs</h3>
              <p className="text-slate-500 mt-1">
                New jobs will appear here when they&apos;re assigned to you.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                  className="p-6 hover:bg-slate-50 transition cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-semibold">
                          {job.customerName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {job.customerName}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                              job.status === "confirmed"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              job.status === "confirmed" ? "bg-emerald-500" : "bg-amber-500"
                            }`} />
                            {job.status === "confirmed" ? "Confirmed" : "Pending"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-start gap-3 text-sm">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <div>
                            <span className="text-slate-500">Pickup:</span>{" "}
                            <span className="text-slate-700 font-medium">{job.pickupAddress}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                            <Navigation className="h-3.5 w-3.5 text-red-600" />
                          </div>
                          <div>
                            <span className="text-slate-500">Drop-off:</span>{" "}
                            <span className="text-slate-700 font-medium">{job.dropoffAddress}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">{job.pickupTime}</span>
                      </div>
                      <div className="mt-3 text-2xl font-bold text-emerald-600">
                        ${job.payout}
                      </div>
                      <p className="text-xs text-slate-400">payout</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { href: "/driver/jobs", icon: Car, title: "Available Jobs", desc: "Find new jobs nearby", color: "emerald" },
            { href: "/driver/earnings", icon: DollarSign, title: "Earnings", desc: "View your earnings", color: "blue" },
            { href: "/driver/settings", icon: Settings, title: "Settings", desc: "Manage your profile", color: "slate" },
          ].map((action, index) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-lg shadow-slate-200/50 transition group"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                action.color === 'emerald' ? 'bg-emerald-100 group-hover:bg-emerald-200' :
                action.color === 'blue' ? 'bg-blue-100 group-hover:bg-blue-200' : 'bg-slate-100 group-hover:bg-slate-200'
              } transition`}>
                <action.icon className={`h-6 w-6 ${
                  action.color === 'emerald' ? 'text-emerald-600' :
                  action.color === 'blue' ? 'text-blue-600' : 'text-slate-600'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition">{action.title}</h3>
                <p className="text-sm text-slate-500">{action.desc}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 ml-auto group-hover:text-emerald-500 group-hover:translate-x-1 transition" />
            </Link>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
