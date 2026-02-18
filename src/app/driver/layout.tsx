// src/app/driver/layout.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Car,
  Loader2,
  Home,
  Briefcase,
  Clock,
  DollarSign,
  Settings,
} from "lucide-react";

interface ClockStatus {
  isClockedIn: boolean;
  lastClockIn: string | null;
  lastClockOut: string | null;
  canAcceptJobs: boolean;
  todaySummary: {
    hoursWorked: number;
    minutesWorked: number;
    jobsCompleted: number;
  };
}

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Fetch clock status
  const fetchClockStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/clock");
      if (res.ok) {
        const data = await res.json();
        setClockStatus(data);
      }
    } catch {
      // Silently fail — clock status is supplementary
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/driver/login");
      return;
    }

    if (session.user.role !== "driver") {
      router.push("/");
    }
  }, [session, status, router]);

  // Fetch clock status on mount
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "driver") {
      fetchClockStatus();
    }
  }, [status, session, fetchClockStatus]);

  // Live timer when clocked in
  useEffect(() => {
    if (!clockStatus?.isClockedIn || !clockStatus.lastClockIn) {
      setElapsedSeconds(0);
      return;
    }

    const clockInTime = new Date(clockStatus.lastClockIn).getTime();

    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - clockInTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [clockStatus?.isClockedIn, clockStatus?.lastClockIn]);

  // Format elapsed time
  const formatElapsed = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  // Toggle handler
  const handleClockToggle = async () => {
    if (clockLoading || !clockStatus?.canAcceptJobs) return;
    setClockLoading(true);

    const action = clockStatus?.isClockedIn ? "clock_out" : "clock_in";

    try {
      const res = await fetch("/api/driver/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update clock status");
      }

      await fetchClockStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setClockLoading(false);
    }
  };

  const isActive = (path: string) => pathname === path;

  // Don't apply layout to login, register, pending, or onboarding pages
  const isAuthPage =
    pathname === "/driver/login" ||
    pathname === "/driver/register" ||
    pathname === "/driver/pending" ||
    pathname === "/driver/onboarding";

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "driver") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center px-6">
          <Car className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            You don&apos;t have access to this area.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-emerald-600 font-medium"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const isClockedIn = clockStatus?.isClockedIn ?? false;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Slim Top Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Left: Clock Status Pill with Toggle */}
          <div className="flex items-center gap-2">
            {clockStatus && (
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isClockedIn ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    isClockedIn ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {isClockedIn ? "Active" : "Offline"}
                </span>
                {isClockedIn && (
                  <span className="text-xs text-emerald-600">
                    {formatElapsed(elapsedSeconds)}
                  </span>
                )}
                {/* iOS-style Toggle */}
                <button
                  onClick={handleClockToggle}
                  disabled={clockLoading || !clockStatus.canAcceptJobs}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    isClockedIn ? "bg-emerald-500" : "bg-slate-300"
                  } ${clockLoading || !clockStatus.canAcceptJobs ? "opacity-50" : ""}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                      isClockedIn ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Center: Logo */}
          <Link href="/driver/dashboard" className="absolute left-1/2 -translate-x-1/2">
            <div className="relative h-8 w-28">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Right: Desktop Nav + Avatar */}
          <div className="flex items-center gap-4">
            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/driver/dashboard"
                className={`text-sm transition ${
                  isActive("/driver/dashboard")
                    ? "text-emerald-700 font-medium"
                    : "text-slate-600 hover:text-emerald-600"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/driver/jobs"
                className={`text-sm transition ${
                  isActive("/driver/jobs")
                    ? "text-emerald-700 font-medium"
                    : "text-slate-600 hover:text-emerald-600"
                }`}
              >
                Jobs
              </Link>
              <Link
                href="/driver/payments"
                className={`text-sm transition ${
                  isActive("/driver/payments")
                    ? "text-emerald-700 font-medium"
                    : "text-slate-600 hover:text-emerald-600"
                }`}
              >
                Payments
              </Link>
              <Link
                href="/driver/history"
                className={`text-sm transition ${
                  isActive("/driver/history")
                    ? "text-emerald-700 font-medium"
                    : "text-slate-600 hover:text-emerald-600"
                }`}
              >
                History
              </Link>
              <Link
                href="/driver/settings"
                className={`text-sm transition ${
                  isActive("/driver/settings")
                    ? "text-emerald-700 font-medium"
                    : "text-slate-600 hover:text-emerald-600"
                }`}
              >
                Settings
              </Link>
            </nav>

            {/* Avatar */}
            <Link
              href="/driver/settings"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700"
            >
              {session.user.username?.charAt(0).toUpperCase() || "D"}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 md:pb-0">{children}</main>

      {/* Bottom Tab Bar (Mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom,24px)]">
        <Link
          href="/driver/dashboard"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition active:scale-95 ${
            isActive("/driver/dashboard") ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link
          href="/driver/jobs"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition active:scale-95 ${
            isActive("/driver/jobs") ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          <Briefcase className="h-5 w-5" />
          <span className="text-[10px] font-medium">Jobs</span>
        </Link>
        <Link
          href="/driver/payments"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition active:scale-95 ${
            isActive("/driver/payments") ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          <DollarSign className="h-5 w-5" />
          <span className="text-[10px] font-medium">Payments</span>
        </Link>
        <Link
          href="/driver/history"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition active:scale-95 ${
            isActive("/driver/history") ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          <Clock className="h-5 w-5" />
          <span className="text-[10px] font-medium">History</span>
        </Link>
        <Link
          href="/driver/settings"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition active:scale-95 ${
            isActive("/driver/settings") ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-medium">Settings</span>
        </Link>
      </nav>
    </div>
  );
}
