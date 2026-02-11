// src/app/driver/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Briefcase,
  DollarSign,
  Car,
  Clock,
  Settings,
  Timer,
} from "lucide-react";

interface ClockStatus {
  isClockedIn: boolean;
  todaySummary: {
    hoursWorked: number;
    minutesWorked: number;
    jobsCompleted: number;
  };
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
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [acceptedCount, setAcceptedCount] = useState<number | null>(null);
  const [weekEarnings, setWeekEarnings] = useState<number | null>(null);

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
      const [availableRes, acceptedRes] = await Promise.all([
        fetch("/api/driver/jobs?status=available&limit=1"),
        fetch("/api/driver/jobs?status=accepted&limit=1"),
      ]);

      if (availableRes.ok) {
        const data = await availableRes.json();
        setAvailableCount(data.total || 0);
      }

      if (acceptedRes.ok) {
        const data = await acceptedRes.json();
        setAcceptedCount(data.total || 0);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Fetch earnings
  const fetchEarnings = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/earnings?period=week");
      if (res.ok) {
        const data = await res.json();
        setWeekEarnings(data.totalEarnings || 0);
      }
    } catch {
      // Silently fail — default to 0
      setWeekEarnings(0);
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

  if (status === "loading") {
    return (
      <div className="relative flex min-h-[calc(100vh-52px)] flex-col items-center justify-center px-6 py-8">
        <div className="fixed inset-0 bg-gradient-to-b from-emerald-50 via-white to-slate-50 -z-10" />
        <div className="animate-pulse space-y-6 w-full max-w-sm">
          <div className="h-8 w-48 bg-slate-200 rounded mx-auto" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
            ))}
          </div>
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
    <div className="relative flex min-h-[calc(100vh-52px)] flex-col items-center justify-center px-6 py-8">
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
          {/* Available Jobs - PRIMARY */}
          <AppButton
            href="/driver/jobs"
            icon={Briefcase}
            label="Available Jobs"
            badge={availableCount ?? undefined}
            variant="accent"
            loading={availableCount === null}
          />

          {/* Earnings */}
          <AppButton
            href="/driver/earnings"
            icon={DollarSign}
            label="Earnings"
            sublabel={weekEarnings !== null ? `$${weekEarnings}` : undefined}
            loading={weekEarnings === null}
          />

          {/* My Jobs */}
          <AppButton
            href="/driver/jobs?tab=accepted"
            icon={Car}
            label="My Jobs"
            sublabel="Accepted"
            badge={acceptedCount ?? undefined}
            loading={acceptedCount === null}
          />

          {/* Job History */}
          <AppButton href="/driver/history" icon={Clock} label="Job History" />

          {/* Settings */}
          <AppButton href="/driver/settings" icon={Settings} label="Settings" />

          {/* Clock History */}
          <AppButton
            href="/driver/history"
            icon={Timer}
            label="Clock History"
          />
        </div>

        {/* Summary Footer */}
        <div className="mt-8 text-center">
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
      </div>
    </div>
  );
}
