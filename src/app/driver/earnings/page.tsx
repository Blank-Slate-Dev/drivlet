// src/app/driver/earnings/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Briefcase,
  RefreshCw,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Car,
  CheckCircle,
  CreditCard,
  AlertTriangle,
  Home,
} from "lucide-react";

interface EarningTransaction {
  _id: string;
  customerName: string;
  vehicleRegistration: string;
  serviceType: string;
  pickupAddress: string;
  garageName?: string;
  completedAt: string;
  payout: number;
}

interface DailyData {
  date: string;
  jobs: number;
  earnings: number;
}

interface EarningsData {
  period: string;
  totalEarnings: number;
  totalJobs: number;
  pendingEarnings: number;
  pendingJobs: number;
  stats: {
    today: { jobs: number; earnings: number };
    week: { jobs: number; earnings: number };
    month: { jobs: number; earnings: number };
  };
  earnings: EarningTransaction[];
  dailyData: DailyData[];
  averagePerJob: number;
}

type PeriodType = "today" | "week" | "month" | "year" | "all";

export default function DriverEarningsPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<PeriodType>("week");
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/driver/earnings?period=${period}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to fetch earnings");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch earnings");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const periods: { key: PeriodType; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "year", label: "This Year" },
    { key: "all", label: "All Time" },
  ];

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
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Earnings</h1>
          <p className="text-sm text-slate-500">
            Track your income and completed jobs
          </p>
        </div>
        <button
          onClick={fetchEarnings}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Period Selector */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              period === p.key
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-2 text-sm text-slate-500">Loading earnings...</p>
        </div>
      ) : data ? (
        <>
          {/* Stats Cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Earnings - Primary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-emerald-100">Total Earnings</p>
                  <p className="mt-1 text-3xl font-bold">
                    {formatCurrency(data.totalEarnings)}
                  </p>
                  <p className="mt-1 text-sm text-emerald-200">
                    {data.totalJobs} job{data.totalJobs !== 1 ? "s" : ""} completed
                  </p>
                </div>
                <div className="rounded-xl bg-white/20 p-3">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </motion.div>

            {/* Pending Earnings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pending</p>
                  <p className="mt-1 text-2xl font-bold text-amber-600">
                    {formatCurrency(data.pendingEarnings)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {data.pendingJobs} active job{data.pendingJobs !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-100 p-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </motion.div>

            {/* Average Per Job */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Avg Per Job</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(data.averagePerJob)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">per delivery</p>
                </div>
                <div className="rounded-xl bg-blue-100 p-3">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </motion.div>

            {/* This Week Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">This Week</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(data.stats.week.earnings)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {data.stats.week.jobs} job{data.stats.week.jobs !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="rounded-xl bg-purple-100 p-3">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Stats Row */}
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
              <div className="rounded-lg bg-emerald-100 p-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Today</p>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(data.stats.today.earnings)}{" "}
                  <span className="font-normal text-slate-500">
                    ({data.stats.today.jobs} jobs)
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
              <div className="rounded-lg bg-blue-100 p-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">This Week</p>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(data.stats.week.earnings)}{" "}
                  <span className="font-normal text-slate-500">
                    ({data.stats.week.jobs} jobs)
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
              <div className="rounded-lg bg-purple-100 p-2">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">This Month</p>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(data.stats.month.earnings)}{" "}
                  <span className="font-normal text-slate-500">
                    ({data.stats.month.jobs} jobs)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Daily Breakdown Chart */}
          {data.dailyData.length > 0 && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 font-semibold text-slate-900">Daily Breakdown</h3>
              <div className="space-y-2">
                {data.dailyData.slice(0, 7).map((day, index) => {
                  const maxEarnings = Math.max(...data.dailyData.map((d) => d.earnings));
                  const percentage = maxEarnings > 0 ? (day.earnings / maxEarnings) * 100 : 0;

                  return (
                    <div key={day.date} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-slate-500">{formatDate(day.date)}</div>
                      <div className="flex-1">
                        <div className="h-6 rounded-full bg-slate-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ delay: index * 0.05, duration: 0.5 }}
                            className="flex h-6 items-center justify-end rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2"
                          >
                            {day.earnings > 0 && (
                              <span className="text-xs font-medium text-white">
                                {formatCurrency(day.earnings)}
                              </span>
                            )}
                          </motion.div>
                        </div>
                      </div>
                      <div className="w-16 text-right text-sm text-slate-500">
                        {day.jobs} job{day.jobs !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Recent Transactions</h3>
            </div>
            {data.earnings.length === 0 ? (
              <div className="py-12 text-center">
                <DollarSign className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-slate-500">No completed jobs yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.earnings.slice(0, 10).map((transaction) => (
                  <div
                    key={transaction._id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-emerald-100 p-2">
                        <Car className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {transaction.vehicleRegistration}
                        </p>
                        <p className="text-sm text-slate-500">
                          {transaction.garageName || transaction.serviceType}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600">
                        +{formatCurrency(transaction.payout)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(transaction.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

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
