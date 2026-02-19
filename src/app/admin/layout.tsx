// src/app/admin/layout.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Home,
  Loader2,
  Users,
  Building2,
  MessageSquare,
  Star,
  Car,
  Menu,
  X,
  Truck,
  AlertTriangle,
  Shield,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
    { href: "/admin/dispatch", label: "Dispatch", icon: Truck },
    { href: "/admin/incidents", label: "Incidents", icon: Shield },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/drivers", label: "Drivers", icon: Car },
    { href: "/admin/garages", label: "Garages", icon: Building2 },
    { href: "/admin/payment-disputes", label: "Payment Disputes", icon: AlertTriangle },
    { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
    { href: "/admin/testimonials", label: "Testimonials", icon: Star },
  ];

  // Loading state - simple centered spinner
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Access denied - simple centered message
  if (!session?.user || session.user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-900">Access Denied</h1>
          <p className="mt-1 text-sm text-slate-500">
            You don&apos;t have permission to access this area.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-500"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-56 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-slate-100 px-4 py-4">
            <Link href="/" className="block">
              <div className="relative h-8 w-24">
                <Image
                  src="/logo.png"
                  alt="drivlet"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "border-l-2 border-emerald-600 bg-emerald-50 font-medium text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Back to site link */}
          <div className="border-t border-slate-100 px-3 py-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              <Home className="h-4 w-4" />
              <span>Back to site</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="block">
            <div className="relative h-8 w-24">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 h-screen w-64 bg-white shadow-lg lg:hidden">
            <div className="flex h-full flex-col">
              {/* Mobile Logo */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <div className="relative h-8 w-24">
                    <Image
                      src="/logo.png"
                      alt="drivlet"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "border-l-2 border-emerald-600 bg-emerald-50 font-medium text-emerald-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile back to site */}
              <div className="border-t border-slate-100 px-3 py-4">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <Home className="h-4 w-4" />
                  <span>Back to site</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="lg:ml-56">{children}</main>
    </div>
  );
}
