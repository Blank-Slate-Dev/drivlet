// src/app/admin/layout.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  ClipboardList,
  Home,
  Loader2,
  Users,
  Building2,
  MessageSquare,
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
          <p className="mt-2 text-sm text-emerald-100">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
        <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm p-8 text-center shadow-2xl">
          <Shield className="mx-auto h-12 w-12 text-red-500" />
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
      {/* Admin Header */}
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
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-400/30 px-3 py-1 text-xs font-medium text-amber-300">
              <Shield className="h-3.5 w-3.5" />
              Admin Panel
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/admin/dashboard"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive("/admin/dashboard")
                  ? "bg-white/20 text-white"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link
              href="/admin/bookings"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive("/admin/bookings")
                  ? "bg-white/20 text-white"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Bookings</span>
            </Link>
            <Link
              href="/admin/users"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive("/admin/users")
                  ? "bg-white/20 text-white"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </Link>
            <Link
              href="/admin/garages"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive("/admin/garages")
                  ? "bg-white/20 text-white"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Partners</span>
            </Link>
            <Link
              href="/admin/inquiries"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive("/admin/inquiries")
                  ? "bg-white/20 text-white"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Inquiries</span>
            </Link>
            <div className="mx-2 h-6 w-px bg-white/20" />
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-white/10 hover:text-white"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Main Site</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
