// src/app/admin/layout.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  ClipboardList,
  Home,
  Loader2,
  Users,
} from "lucide-react";

export default function AdminLayout({
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
      router.push("/login");
      return;
    }

    if (session.user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  const isActive = (path: string) => pathname === path;

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-600" />
          <p className="mt-2 text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            You don&apos;t have permission to access this area.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b border-violet-900/20 bg-gradient-to-r from-violet-950 to-purple-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-white">
              drivlet
            </Link>
            <span className="flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-medium text-violet-300">
              <Shield className="h-3.5 w-3.5" />
              Admin Panel
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/admin/dashboard"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive("/admin/dashboard")
                  ? "bg-violet-600/30 text-white"
                  : "text-violet-200 hover:bg-violet-800/50 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/admin/bookings"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive("/admin/bookings")
                  ? "bg-violet-600/30 text-white"
                  : "text-violet-200 hover:bg-violet-800/50 hover:text-white"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Bookings
            </Link>
            <Link
              href="/admin/users"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive("/admin/users")
                  ? "bg-violet-600/30 text-white"
                  : "text-violet-200 hover:bg-violet-800/50 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              Users
            </Link>
            <div className="mx-2 h-6 w-px bg-violet-700/50" />
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-800/50 hover:text-white"
            >
              <Home className="h-4 w-4" />
              Main Site
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
