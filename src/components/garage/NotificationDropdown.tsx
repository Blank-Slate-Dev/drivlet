// src/components/garage/NotificationDropdown.tsx
"use client";

import {
  Bell,
  Car,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronRight,
  Clock
} from "lucide-react";
import Link from "next/link";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
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

interface NotificationDropdownProps {
  notifications: Notification[];
  loading?: boolean;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  onRefresh: () => void;
}

export function NotificationDropdown({
  notifications,
  loading = false,
  onMarkAsRead,
  onMarkAllRead,
  onClose,
  onRefresh,
}: NotificationDropdownProps) {
  const getNotificationIcon = (type: string, urgency?: string) => {
    const isUrgent = urgency === "urgent";
    const iconClass = isUrgent ? "text-amber-500" : "text-emerald-500";

    switch (type) {
      case "new_booking":
        return <Car className={`h-4 w-4 ${iconClass}`} />;
      case "booking_update":
        return <CheckCircle2 className={`h-4 w-4 ${iconClass}`} />;
      case "booking_cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold text-slate-900">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1 text-slate-400 transition hover:text-slate-600"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => {
                  if (!notification.isRead) {
                    onMarkAsRead(notification._id);
                  }
                }}
                className={`cursor-pointer px-4 py-3 transition hover:bg-slate-50 ${
                  !notification.isRead ? "bg-emerald-50/50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
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
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          !notification.isRead ? "text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                      {notification.message}
                    </p>
                    {notification.metadata?.vehicleRegistration && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                          {notification.metadata.vehicleRegistration}
                        </span>
                        {notification.metadata.urgency === "urgent" && (
                          <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                            <AlertCircle className="h-3 w-3" />
                            Urgent
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(notification.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-3">
        <Link
          href="/garage/notifications"
          onClick={onClose}
          className="flex items-center justify-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          View All Notifications
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
