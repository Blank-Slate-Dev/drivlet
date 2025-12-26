// src/app/garage/layout.tsx
"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import {
  Building2,
  LayoutDashboard,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Loader2,
  AlertCircle,
  Wrench,
  BarChart3,
  Star,
  Crown,
} from "lucide-react";

export default function GarageLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isGarage = session?.user?.role === "garage";
  const isApproved = Boolean(session?.user?.isApproved);

  // Skip layout for auth pages
  const isAuthPage =
    pathname === "/garage/login" ||
    pathname === "/garage/register" ||
    pathname === "/garage/pending";

  // Close menus when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Auth pages don't need the layout wrapper
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Not authenticated or wrong role
  if (!session || !isGarage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Access Denied</h2>
          <p className="mt-2 text-slate-500">You need to be logged in as a garage partner.</p>
          <Link
            href="/garage/login"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Not approved
  if (!isApproved) {
    router.push("/garage/pending");
    return null;
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const navItems = [
    {
      href: "/garage/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/garage/bookings",
      label: "Bookings",
      icon: ClipboardList,
    },
    {
      href: "/garage/services",
      label: "Services",
      icon: Wrench,
    },
    {
      href: "/garage/analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      href: "/garage/reviews",
      label: "Reviews",
      icon: Star,
    },
    {
      href: "/garage/subscription",
      label: "Plan",
      icon: Crown,
    },
    {
      href: "/garage/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  const handleSignOut = () => {
    signOut({ callbackUrl: "/garage/login" });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            {/* Logo and portal badge */}
            <div className="flex items-center gap-4">
              <Link href="/garage/dashboard" className="flex items-center gap-2">
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
              <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 px-3 py-1 text-xs font-medium text-emerald-300">
                <Building2 className="h-3.5 w-3.5" />
                Garage Portal
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive(item.href)
                      ? "bg-white/20 text-white"
                      : "text-emerald-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* Desktop user dropdown */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition"
                >
                  <span className="truncate max-w-[120px]">
                    {session.user.username || session.user.email}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-lg border border-slate-200 py-1 z-20">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {session.user.username || "Garage Partner"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                      </div>
                      <Link
                        href="/garage/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden rounded-lg p-2 text-white hover:bg-white/10 transition"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-emerald-800/95 backdrop-blur">
            <nav className="mx-auto max-w-7xl px-4 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive(item.href)
                      ? "bg-white/20 text-white"
                      : "text-emerald-100 hover:bg-white/10"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-white/10">
                <div className="px-4 py-2">
                  <p className="text-sm font-medium text-white truncate">
                    {session.user.username || "Garage Partner"}
                  </p>
                  <p className="text-xs text-emerald-200 truncate">{session.user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-300 hover:bg-white/10 transition"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
