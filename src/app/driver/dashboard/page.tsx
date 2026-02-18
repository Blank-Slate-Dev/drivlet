// src/app/driver/dashboard/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Briefcase,
  DollarSign,
  Clock,
  Settings,
  DollarSign as DollarSignIcon,
  LogOut,
  Loader2,
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

interface AppButtonProps {
  href: string;
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  badge?: number | string;
  variant?: "default" | "accent";
  loading?: boolean;
}

function AppButton({
  href,
  icon: Icon,
  label,
  sublabel,
  badge,
  variant = "default",
  loading = false,
}: AppButtonProps) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col items-center justify-center rounded-2xl p-5 transition-all active:scale-95 ${
        variant === "accent"
          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
          : "bg-white text-slate-700 shadow-sm border border-slate-200/80 hover:shadow-md hover:border-slate-300"
      }`}
    >
      {badge !== undefined && badge !== 0 && (
        <span
          className={`absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
            variant === "accent"
              ? "bg-white text-emerald-700"
              : "bg-emerald-600 text-white"
          }`}
        >
          {badge}
        </span>
      )}
      <Icon
        className={`h-7 w-7 mb-2 ${
          variant === "accent" ? "text-white" : "text-emerald-600"
        }`}
      />
      <span
        className={`text-sm font-semibold ${
          variant === "accent" ? "text-white" : "text-slate-800"
        }`}
      >
        {label}
      </span>
      {loading ? (
        <span
          className={`h-3 w-12 mt-1 rounded animate-pulse ${
            variant === "accent" ? "bg-emerald-400" : "bg-slate-200"
          }`}
        />
      ) : (
        sublabel && (
          <span
            className={`text-xs mt-0.5 ${
              variant === "accent" ? "text-emerald-100" : "text-slate-400"
            }`}
          >
            {sublabel}
          </span>
        )
      )}
    </Link>
  );
}

export default function DriverDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [acceptedCount, setAcceptedCount] = useState<number | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);

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

  // Fetch job counts
  const fetchJobCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/jobs?status=all");
      if (res.ok) {
        const data = await res.json();
        const total = Object.values(data.myJobs as Record<string, unknown[]>)
          .flat().length;
        setAcceptedCount(total);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formatDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
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
      <div className="relative flex min-h-[calc(100vh-52px)] flex-col items-center justify-center px-6 py-8">
        <div className="fixed inset-0 bg-gradient-to-b from-emerald-50 via-white to-slate-50 -z-10" />
        <div className="animate-pulse space-y-6 w-full max-w-sm">
          <div className="h-8 w-48 bg-slate-200 rounded mx-auto" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
            ))}
          </div>
          <div className="h-40 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  const isClockedIn = clockStatus?.isClockedIn ?? false;
  const todayMinutes =
    (clockStatus?.todaySummary?.hoursWorked ?? 0) * 60 +
    (clockStatus?.todaySummary?.minutesWorked ?? 0);
  const todayJobsCompleted = clockStatus?.todaySummary?.jobsCompleted ?? 0;

  return (
    <div className="relative flex min-h-[calc(100vh-52px)] flex-col items-center px-6 py-8">
      {/* Background: subtle gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-emerald-50 via-white to-slate-50 -z-10" />

      {/* Watermark logo */}
      <div className="fixed inset-0 flex items-center justify-center -z-[5] pointer-events-none">
        <div className="relative h-64 w-64 opacity-[0.03]">
          <Image src="/logo.png" alt="" fill className="object-contain" />
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-sm">
        {/* Greeting */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-slate-800">
            {getGreeting()}, {session?.user?.username || "Driver"} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isClockedIn ? "You're on the clock" : "Ready to start your shift?"}
          </p>
        </div>

        {/* App Button Grid */}
        <div className="grid grid-cols-2 gap-4 w-full">
          {/* My Jobs - PRIMARY */}
          <AppButton
            href="/driver/jobs"
            icon={Briefcase}
            label="My Jobs"
            badge={acceptedCount ?? undefined}
            variant="accent"
            loading={acceptedCount === null}
          />

          {/* Job History */}
          <AppButton href="/driver/history" icon={Clock} label="History" />

          {/* Settings */}
          <AppButton href="/driver/settings" icon={Settings} label="Settings" />

          {/* Payments */}
          <AppButton
            href="/driver/payments"
            icon={DollarSignIcon}
            label="Payments"
          />
        </div>

        {/* ═══ EARNINGS SECTION ═══ */}
        <div className="mt-6 rounded-lg border border-slate-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-800">
                Earnings
              </span>
            </div>
            <span className="text-xs text-slate-400">This Week</span>
          </div>

          {earningsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            </div>
          ) : earningsData && (earningsData.totalJobs > 0 || earningsData.pendingEarnings > 0) ? (
            <>
              {/* Stats row */}
              <div className="flex items-center gap-4 px-4 py-3">
                <div>
                  <span className="text-xl font-bold text-emerald-600">
                    ${earningsData.totalEarnings}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="text-sm text-slate-600">
                  {earningsData.totalJobs} job{earningsData.totalJobs !== 1 ? "s" : ""}
                </div>
                {earningsData.pendingEarnings > 0 && (
                  <>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-sm text-slate-400">
                      ${earningsData.pendingEarnings} pending
                    </div>
                  </>
                )}
              </div>

              {/* Recent transactions */}
              {earningsData.earnings.length > 0 && (
                <div className="border-t border-slate-100">
                  {earningsData.earnings.slice(0, 3).map((txn, idx) => (
                    <div
                      key={txn._id}
                      className={`flex items-center justify-between px-4 py-2.5 ${
                        idx < Math.min(earningsData.earnings.length, 3) - 1
                          ? "border-b border-slate-50"
                          : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-700">
                          {txn.vehicleRegistration}
                          {txn.garageName && (
                            <span className="text-slate-400">
                              {" "}
                              &middot; {txn.garageName}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="ml-3 flex items-center gap-2 text-right">
                        <span className="text-sm font-medium text-emerald-600">
                          ${txn.payout}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(txn.completedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-400">No earnings this week</p>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Today:{" "}
            <span className="font-medium text-slate-700">
              {formatDuration(todayMinutes)}
            </span>
            {todayJobsCompleted > 0 && (
              <span>
                {" "}
                • {todayJobsCompleted} job
                {todayJobsCompleted !== 1 ? "s" : ""} completed
              </span>
            )}
          </p>
        </div>

        {/* Sign Out Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => signOut({ callbackUrl: "/driver/login" })}
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
