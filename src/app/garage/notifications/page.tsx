// src/app/garage/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Car,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Clock,
  AlertCircle,
  Filter,
  CheckCheck,
} from "lucide-react";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  bookingId?: string;
  metadata?: {
    vehicleRegistration?: string;
    serviceType?: string;
    pickupTime?: string;
    customerName?: string;
    urgency?: string;
  };
}

type FilterType = "all" | "unread" | "read";

export default function GarageNotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [unreadCount, setUnreadCount] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/garage/login");
      return;
    }
    if (session.user.role !== "garage") {
      router.push("/");
    }
  }, [session, status, router]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const unreadParam = filter === "unread" ? "&unread=true" : "";
      const response = await fetch(`/api/garage/notifications?limit=100${unreadParam}`);
      if (response.ok) {
        const data = await response.json();
        let filtered = data.notifications || [];
        if (filter === "read") {
          filtered = filtered.filter((n: Notification) => n.isRead);
        }
        setNotifications(filtered);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user.role === "garage") {
      fetchNotifications();
    }
  }, [session, filter]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/garage/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notificationId }),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/garage/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getNotificationIcon = (type: string, urgency?: string) => {
    const isUrgent = urgency === "urgent";
    const iconClass = isUrgent ? "text-amber-500" : "text-emerald-500";

    switch (type) {
      case "new_booking":
        return <Car className={`h-5 w-5 ${iconClass}`} />;
      case "booking_update":
        return <CheckCircle2 className={`h-5 w-5 ${iconClass}`} />;
      case "booking_cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const groups: Record<string, Notification[]> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    notifications.forEach((notification) => {
      const date = new Date(notification.createdAt);
      if (date >= today) {
        groups["Today"].push(notification);
      } else if (date >= yesterday) {
        groups["Yesterday"].push(notification);
      } else if (date >= weekAgo) {
        groups["This Week"].push(notification);
      } else {
        groups["Older"].push(notification);
      }
    });

    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-slate-200" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/garage/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <Bell className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
                <p className="text-sm text-slate-500">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark All Read
                </button>
              )}
              <button
                onClick={fetchNotifications}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-1">
          {(["all", "unread", "read"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === f
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-6">
          {notifications.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No notifications</h3>
              <p className="mt-2 text-sm text-slate-500">
                {filter === "unread"
                  ? "You have no unread notifications"
                  : filter === "read"
                  ? "You have no read notifications"
                  : "You don't have any notifications yet"}
              </p>
            </div>
          ) : (
            Object.entries(groupedNotifications).map(
              ([group, groupNotifications]) =>
                groupNotifications.length > 0 && (
                  <div key={group}>
                    <h3 className="mb-3 text-sm font-semibold text-slate-500">{group}</h3>
                    <div className="space-y-2">
                      {groupNotifications.map((notification) => (
                        <div
                          key={notification._id}
                          onClick={() => {
                            if (!notification.isRead) {
                              handleMarkAsRead(notification._id);
                            }
                          }}
                          className={`cursor-pointer rounded-xl border p-4 transition hover:shadow-md ${
                            !notification.isRead
                              ? "border-emerald-200 bg-emerald-50/50"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                                notification.metadata?.urgency === "urgent"
                                  ? "bg-amber-100"
                                  : notification.type === "booking_cancelled"
                                  ? "bg-red-100"
                                  : "bg-emerald-100"
                              }`}
                            >
                              {getNotificationIcon(
                                notification.type,
                                notification.metadata?.urgency
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p
                                      className={`font-medium ${
                                        !notification.isRead
                                          ? "text-slate-900"
                                          : "text-slate-700"
                                      }`}
                                    >
                                      {notification.title}
                                    </p>
                                    {!notification.isRead && (
                                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    )}
                                    {notification.metadata?.urgency === "urgent" && (
                                      <span className="flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                        <AlertCircle className="h-3 w-3" />
                                        Urgent
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-sm text-slate-600">
                                    {notification.message}
                                  </p>
                                </div>
                                <span className="flex-shrink-0 text-xs text-slate-400">
                                  {formatTimeAgo(notification.createdAt)}
                                </span>
                              </div>
                              {notification.metadata?.vehicleRegistration && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                    <Car className="h-3 w-3" />
                                    {notification.metadata.vehicleRegistration}
                                  </span>
                                  {notification.metadata.serviceType && (
                                    <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                      {notification.metadata.serviceType}
                                    </span>
                                  )}
                                  {notification.metadata.pickupTime && (
                                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                      <Clock className="h-3 w-3" />
                                      {new Date(notification.metadata.pickupTime).toLocaleDateString(
                                        "en-AU",
                                        { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                              {notification.bookingId && (
                                <Link
                                  href={`/garage/dashboard?booking=${notification.bookingId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-2 inline-flex text-sm font-medium text-emerald-600 hover:text-emerald-700"
                                >
                                  View Booking →
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
            )
          )}
        </div>
      </div>
    </div>
  );
}
