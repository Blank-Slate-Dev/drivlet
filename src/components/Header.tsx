// src/components/Header.tsx
"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, User, LogOut, ChevronDown, Settings, Shield, ClipboardList, Menu, X } from "lucide-react";

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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-12 w-40 sm:h-14 sm:w-48">
            <Image
              src="/logo.png"
              alt="drivlet"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
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
        </nav>

        {/* Desktop CTA + Auth */}
        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={onBookingClick}
            className="group flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            Book a service
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          {status === "loading" ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
          ) : session?.user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                  {avatarLetter}
                </div>
                <span className="max-w-[100px] truncate">{displayName}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                    <div className="border-b border-slate-100 px-4 py-2">
                      <p className="text-sm font-medium text-slate-900">{displayName}</p>
                      <p className="truncate text-xs text-slate-500">{session.user.email}</p>
                      {isAdmin && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                    </div>

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

                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="h-4 w-4" />
                      My Dashboard
                    </Link>
                    <Link
                      href="/account"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Account Settings
                    </Link>
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
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-emerald-600"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile: Auth buttons or user menu + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {status === "loading" ? (
            <div className="h-9 w-16 animate-pulse rounded-lg bg-slate-100" />
          ) : session?.user ? (
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-700"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                {avatarLetter}
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-medium text-slate-700"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
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
                {isAdmin && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <Shield className="h-3 w-3" />
                    Admin
                  </span>
                )}
              </div>

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

              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowUserMenu(false)}
              >
                <User className="h-4 w-4" />
                My Dashboard
              </Link>
              <Link
                href="/account"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowUserMenu(false)}
              >
                <Settings className="h-4 w-4" />
                Account Settings
              </Link>
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
            <div className="absolute left-0 right-0 top-full z-50 border-b border-slate-200 bg-white py-4 shadow-lg md:hidden">
              <nav className="flex flex-col space-y-1 px-4">
                <a
                  href="#how-it-works"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowMobileMenu(false)}
                >
                  How it works
                </a>
                <a
                  href="#services"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Our services
                </a>
                <a
                  href="#pricing"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Pricing
                </a>
                <a
                  href="#faq"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowMobileMenu(false)}
                >
                  FAQ
                </a>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMenu(false);
                      onBookingClick();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Book a service
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </nav>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
