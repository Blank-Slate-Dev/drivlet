// src/app/admin/layout.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Home,
  Loader2,
  Users,
  // Building2, // Hidden — garages not in use yet
  MessageSquare,
  Star,
  Car,
  Menu,
  X,
  Truck,
  AlertTriangle,
  Shield,
  CalendarDays,
  Bell,
  Radio,
  FileSignature,
  // FileText, // Requests nav item merged into Bookings (2026-07-07)
} from "lucide-react";

interface AdminNotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotificationBell({
  notifications,
  unreadCount,
  onMarkAllRead,
  onNotificationClick,
  align,
}: {
  notifications: AdminNotificationItem[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onNotificationClick: (notification: AdminNotificationItem) => void;
  align: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-lg ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-500"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                No notifications yet
              </p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  onClick={() => {
                    setOpen(false);
                    onNotificationClick(notification);
                  }}
                  className={`flex w-full items-start gap-2 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                    notification.isRead ? "" : "bg-emerald-50/40"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      notification.isRead ? "bg-transparent" : "bg-emerald-500"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                      {notification.message}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {timeAgo(notification.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openIncidentCount, setOpenIncidentCount] = useState(0);

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

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setOpenIncidentCount(data.openIncidentCount || 0);
    } catch {
      // Ignore polling errors — retry on next interval.
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "admin") return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [status, session, fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
    } catch {
      // Ignore — state will resync on next poll.
    }
  }, []);

  const handleNotificationClick = useCallback(
    async (notification: AdminNotificationItem) => {
      if (!notification.isRead) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((count) => Math.max(0, count - 1));
        try {
          await fetch("/api/admin/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark_read", id: notification._id }),
          });
        } catch {
          // Ignore — state will resync on next poll.
        }
      }
      router.push("/admin/bookings");
    },
    [router]
  );

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    // Requests merged into the unified Bookings pipeline (2026-07-07):
    // { href: "/admin/booking-requests", label: "Requests", icon: FileText },
    { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
    { href: "/admin/tracking", label: "Live Tracking", icon: Radio },
    { href: "/admin/dispatch", label: "Dispatch", icon: Truck },
    { href: "/admin/forms", label: "Signed Forms", icon: FileSignature },
    { href: "/admin/incidents", label: "Incidents", icon: Shield },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/drivers", label: "Drivers", icon: Car },
    { href: "/admin/roster", label: "Roster", icon: CalendarDays },
    // { href: "/admin/garages", label: "Garages", icon: Building2 }, // Hidden — not in use yet
    { href: "/admin/payment-disputes", label: "Payment Disputes", icon: AlertTriangle },
    { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
    { href: "/admin/testimonials", label: "Testimonials", icon: Star },
  ];

  const renderNavBadge = (href: string) => {
    if (href !== "/admin/incidents" || openIncidentCount <= 0) return null;
    return (
      <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
        {openIncidentCount > 99 ? "99+" : openIncidentCount}
      </span>
    );
  };

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
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
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
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={handleMarkAllRead}
              onNotificationClick={handleNotificationClick}
              align="left"
            />
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
                  {renderNavBadge(item.href)}
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
          <div className="flex items-center gap-1">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={handleMarkAllRead}
              onNotificationClick={handleNotificationClick}
              align="right"
            />
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
                      {renderNavBadge(item.href)}
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
