// src/app/garage/layout.tsx
"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  Settings,
  Globe,
  LogOut,
} from "lucide-react";

export default function GarageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't apply layout to login, register, or pending pages
  const isAuthPage = pathname === "/garage/login" || 
                     pathname === "/garage/register" || 
                     pathname === "/garage/pending";

  if (isAuthPage) {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/garage/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/garage/bookings", label: "Bookings", icon: ClipboardList },
    { href: "/garage/analytics", label: "Analytics", icon: TrendingUp },
    { href: "/garage/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Matching admin layout style */}
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
          {/* Logo */}
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
              <Building2 className="h-3.5 w-3.5" />
              Garage Partner
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
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
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
            <div className="mx-2 h-6 w-px bg-white/20" />
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-white/10 hover:text-white"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Main Site</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/garage/login" })}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-white/10 hover:text-white"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </nav>

          {/* Mobile right side actions */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-white/10 hover:text-white transition"
            >
              <Globe className="h-4 w-4" />
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/garage/login" })}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-white/10 hover:text-white transition"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto relative z-10">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                isActive(item.href)
                  ? "bg-white/20 text-white"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
