// src/app/driver/layout.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Car,
  LayoutDashboard,
  Briefcase,
  Home,
  Loader2,
  DollarSign,
  Clock,
  Settings,
  LogOut,
} from "lucide-react";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

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

  const isActive = (path: string) => pathname === path;

  // Don't apply layout to login, register, pending, or onboarding pages
  // These pages have their own headers/styling
  const isAuthPage = pathname === "/driver/login" || 
                     pathname === "/driver/register" || 
                     pathname === "/driver/pending" ||
                     pathname === "/driver/onboarding";

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
          <p className="mt-2 text-sm text-emerald-100">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "driver") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
        <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm p-8 text-center shadow-2xl">
          <Car className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            You don&apos;t have permission to access this area.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Driver Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative h-12 w-40 sm:h-14 sm:w-48">
                <Image
                  src="/logo.png"
                  alt="drivlet"
                  fill
                  className="object-contain brightness-0 invert"
                  priority
                />
              </div>
            </Link>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 px-3 py-1 text-xs font-medium text-emerald-300">
              <Car className="h-3.5 w-3.5" />
              Driver Portal
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/driver/dashboard"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive("/driver/dashboard")
                  ? "bg-white/20 text-white"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link
              href="/driver/jobs"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive("/driver/jobs")
                  ? "bg-white/20 text-white"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Jobs</span>
            </Link>
            <Link
              href="/driver/earnings"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive("/driver/earnings")
                  ? "bg-white/20 text-white"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Earnings</span>
            </Link>
            <Link
              href="/driver/history"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive("/driver/history")
                  ? "bg-white/20 text-white"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </Link>
            <Link
              href="/driver/settings"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive("/driver/settings")
                  ? "bg-white/20 text-white"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <div className="mx-2 h-6 w-px bg-white/20" />
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-white/10 hover:text-white"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Main Site</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/driver/login" })}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-red-500/20 hover:text-red-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
