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
  Calendar,
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
    { href: "/garage/schedule", label: "Schedule", icon: Calendar },
    { href: "/garage/analytics", label: "Analytics", icon: TrendingUp },
    { href: "/garage/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative h-10 w-32 sm:h-12 sm:w-40">
                <Image
                  src="/logo.png"
                  alt="drivlet"
                  fill
                  className="object-contain brightness-0 invert"
                  priority
                />
              </div>
            </Link>
            <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1.5 border border-white/20">
              <Building2 className="h-4 w-4 text-emerald-300" />
              <span className="text-sm font-medium text-white">Garage Partner</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Main Site</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/garage/login" })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
