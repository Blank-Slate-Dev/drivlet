// src/components/Header.tsx
"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { FEATURES } from "@/lib/featureFlags";
import {
  ArrowRight,
  User,
  LogOut,
  ChevronDown,
  Settings,
  Shield,
  ClipboardList,
  Menu,
  X,
  MapPin,
  Car,
  Building2,
  FileText,
} from "lucide-react";

interface HeaderProps {
  onBookingClick: () => void;
}

export default function Header({ onBookingClick }: HeaderProps) {
  const { data: session, status } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const displayName = session?.user?.username ?? session?.user?.email ?? "User";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const isAdmin = session?.user?.role === "admin";
  const isDriver = session?.user?.role === "driver";
  const isGarage = session?.user?.role === "garage";

  // Determine the correct dashboard URL based on role
  const getDashboardUrl = () => {
    if (isAdmin) return "/admin/dashboard";
    if (isDriver) return "/driver/dashboard";
    if (isGarage) return "/garage/dashboard";
    return "/dashboard";
  };

  // Get dashboard label based on role
  const getDashboardLabel = () => {
    if (isDriver) return "Driver Dashboard";
    if (isGarage) return "Garage Dashboard";
    return "My Dashboard";
  };

  // Get role badge info
  const getRoleBadge = () => {
    if (isAdmin) return { label: "Admin", color: "bg-amber-100 text-amber-700" };
    if (isDriver) return { label: "Driver", color: "bg-emerald-100 text-emerald-700" };
    if (isGarage) return { label: "Garage", color: "bg-blue-100 text-blue-700" };
    return null;
  };

  const roleBadge = getRoleBadge();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-12 w-40 sm:h-14 sm:w-48">
            <Image src="/logo.png" alt="drivlet" fill className="object-contain" priority />
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
          <a href="#how-it-works" className="transition hover:text-emerald-600">
            How it works
          </a>
          <a href="#services" className="transition hover:text-emerald-600">
            Our services
          </a>
          <a href="#pricing" className="transition hover:text-emerald-600">
            Pricing
          </a>
          <a href="#faq" className="transition hover:text-emerald-600">
            FAQ
          </a>
          {FEATURES.QUOTE_SYSTEM && (
            <Link href="/quotes/request" className="flex items-center gap-1.5 transition hover:text-emerald-600">
              <FileText className="h-4 w-4" />
              Get Quotes
            </Link>
          )}
          <Link href="/track" className="flex items-center gap-1.5 transition hover:text-emerald-600">
            <MapPin className="h-4 w-4" />
            Track my service
          </Link>
        </nav>

        {/* Desktop CTA + Auth */}
        <div className="hidden items-center gap-3 md:flex">
          {status === "loading" ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
          ) : session?.user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white ${
                  isDriver ? "bg-emerald-600" : isGarage ? "bg-blue-600" : isAdmin ? "bg-amber-600" : "bg-emerald-600"
                }`}>
                  {avatarLetter}
                </div>
                <span className="max-w-[100px] truncate">{displayName}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    showUserMenu ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                    <div className="border-b border-slate-100 px-4 py-2">
                      <p className="text-sm font-medium text-slate-900">{displayName}</p>
                      <p className="truncate text-xs text-slate-500">{session.user.email}</p>
                      {roleBadge && (
                        <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge.color}`}>
                          {isAdmin && <Shield className="h-3 w-3" />}
                          {isDriver && <Car className="h-3 w-3" />}
                          {isGarage && <Building2 className="h-3 w-3" />}
                          {roleBadge.label}
                        </span>
                      )}
                    </div>

                    {/* Admin-specific links */}
                    {isAdmin && (
                      <div className="border-b border-slate-100 py-1">
                        <Link
                          href="/admin/dashboard"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Shield className="h-4 w-4" />
                          Admin Dashboard
                        </Link>
                        <Link
                          href="/admin/bookings"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <ClipboardList className="h-4 w-4" />
                          Manage Bookings
                        </Link>
                      </div>
                    )}

                    {/* Role-aware dashboard link */}
                    <Link
                      href={getDashboardUrl()}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      {isDriver ? <Car className="h-4 w-4" /> : isGarage ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      {getDashboardLabel()}
                    </Link>

                    {/* Customer-specific links */}
                    {!isDriver && !isGarage && !isAdmin && (
                      <Link
                        href="/account"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Account Settings
                      </Link>
                    )}

                    {/* Driver-specific links */}
                    {isDriver && (
                      <Link
                        href="/driver/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Driver Settings
                      </Link>
                    )}

                    {/* Garage-specific links */}
                    {isGarage && (
                      <Link
                        href="/garage/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Garage Settings
                      </Link>
                    )}

                    <button
                      type="button"
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
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-emerald-600"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Sign up
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={onBookingClick}
            className="group flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            Book a service
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Mobile: user menu + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {status === "loading" ? (
            <div className="h-9 w-16 animate-pulse rounded-lg bg-slate-100" />
          ) : session?.user ? (
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-700"
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white ${
                isDriver ? "bg-emerald-600" : isGarage ? "bg-blue-600" : isAdmin ? "bg-amber-600" : "bg-emerald-600"
              }`}>
                {avatarLetter}
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  showUserMenu ? "rotate-180" : ""
                }`}
              />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile user dropdown */}
        {showUserMenu && session?.user && (
          <>
            <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-4 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg md:hidden">
              <div className="border-b border-slate-100 px-4 py-2">
                <p className="text-sm font-medium text-slate-900">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{session.user.email}</p>
                {roleBadge && (
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge.color}`}>
                    {isAdmin && <Shield className="h-3 w-3" />}
                    {isDriver && <Car className="h-3 w-3" />}
                    {isGarage && <Building2 className="h-3 w-3" />}
                    {roleBadge.label}
                  </span>
                )}
              </div>

              {/* Admin-specific links */}
              {isAdmin && (
                <div className="border-b border-slate-100 py-1">
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Shield className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                  <Link
                    href="/admin/bookings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Manage Bookings
                  </Link>
                </div>
              )}

              {/* Role-aware dashboard link */}
              <Link
                href={getDashboardUrl()}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowUserMenu(false)}
              >
                {isDriver ? <Car className="h-4 w-4" /> : isGarage ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                {getDashboardLabel()}
              </Link>

              {/* Customer-specific links */}
              {!isDriver && !isGarage && !isAdmin && (
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="h-4 w-4" />
                  Account Settings
                </Link>
              )}

              {isDriver && (
                <Link
                  href="/driver/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="h-4 w-4" />
                  Driver Settings
                </Link>
              )}

              {isGarage && (
                <Link
                  href="/garage/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="h-4 w-4" />
                  Garage Settings
                </Link>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </>
        )}

        {/* Mobile navigation menu */}
        {showMobileMenu && (
          <>
            <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMobileMenu(false)} />
            <div className="absolute left-0 right-0 top-full z-50 border-b border-slate-200 bg-white px-4 py-4 shadow-lg md:hidden">
              <nav className="flex flex-col gap-3">
                <a
                  href="#how-it-works"
                  className="text-sm font-medium text-slate-700 transition hover:text-emerald-600"
                  onClick={() => setShowMobileMenu(false)}
                >
                  How it works
                </a>
                <a
                  href="#services"
                  className="text-sm font-medium text-slate-700 transition hover:text-emerald-600"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Our services
                </a>
                <a
                  href="#pricing"
                  className="text-sm font-medium text-slate-700 transition hover:text-emerald-600"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Pricing
                </a>
                <a
                  href="#faq"
                  className="text-sm font-medium text-slate-700 transition hover:text-emerald-600"
                  onClick={() => setShowMobileMenu(false)}
                >
                  FAQ
                </a>
                {FEATURES.QUOTE_SYSTEM && (
                  <Link
                    href="/quotes/request"
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-700 transition hover:text-emerald-600"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <FileText className="h-4 w-4" />
                    Get Quotes
                  </Link>
                )}
                <Link
                  href="/track"
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-700 transition hover:text-emerald-600"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <MapPin className="h-4 w-4" />
                  Track my service
                </Link>

                <div className="my-2 h-px bg-slate-200" />

                {!session?.user && (
                  <>
                    <Link
                      href="/login"
                      className="text-sm font-medium text-slate-700 transition hover:text-emerald-600"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="text-sm font-medium text-slate-700 transition hover:text-emerald-600"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      Sign up
                    </Link>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    onBookingClick();
                  }}
                  className="mt-2 w-full rounded-full bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  Book a service
                </button>
              </nav>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
