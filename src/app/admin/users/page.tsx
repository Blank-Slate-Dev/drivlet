// src/app/admin/users/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { FEATURES } from "@/lib/featureFlags";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  Users,
  AlertCircle,
  Eye,
  X,
  Mail,
  Clock,
  ClipboardList,
  Phone,
  DollarSign,
  CheckCircle2,
  Ban,
  Trash2,
} from "lucide-react";

interface User {
  _id: string;
  username?: string;
  email?: string;
  name?: string;
  role: "user" | "admin" | "guest" | "garage" | "driver";
  accountStatus: "active" | "suspended" | "deleted";
  suspensionInfo?: {
    suspendedAt: string;
    suspendedBy: string;
    reason: string;
    suspendedUntil?: string;
    notes?: string;
  };
  bookingCount: number;
  isGuest: boolean;
  hasGuestBookings?: boolean;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastBookingDate?: string;
  totalSpent?: number;
}

type UserFilter = "all" | "customer" | "driver" | "garage" | "guest" | "active";

const FILTER_OPTIONS: Array<{ key: UserFilter; label: string }> = [
  { key: "all", label: "All Users" },
  { key: "customer", label: "Customers" },
  { key: "driver", label: "Drivers" },
  // HIDDEN FOR PHASE 1 (2026-08-08): garage portal is inert — see
  // src/lib/garagePortal.ts. The segment returns with the flag.
  ...(FEATURES.GARAGE_PORTAL
    ? [{ key: "garage" as const, label: "Garages" }]
    : []),
  { key: "guest", label: "Guests Only" },
  { key: "active", label: "With Bookings" },
];

// Bordered chip palette — consistent with dashboard/bookings/dispatch
const ROLE_CHIP: Record<string, string> = {
  admin: "border-purple-200 bg-purple-50 text-purple-700",
  driver: "border-sky-200 bg-sky-50 text-sky-700",
  garage: "border-indigo-200 bg-indigo-50 text-indigo-700",
  guest: "border-amber-200 bg-amber-50 text-amber-700",
  customer: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  // Collapsible filter bar, same pattern as the Bookings page (2026-08-07)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "suspend" | "delete" | "reactivate" | null;
    user: User | null;
  }>({ type: null, user: null });
  const [suspendForm, setSuspendForm] = useState({
    reason: "",
    suspendedUntil: "",
    notes: "",
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data.users);
      setError("");
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSuspend = async (userId: string) => {
    if (!suspendForm.reason.trim() || suspendForm.reason.trim().length < 10) {
      alert("Please provide a reason (minimum 10 characters)");
      return;
    }

    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suspend",
          ...suspendForm,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to suspend user");
      }

      await fetchUsers();
      setConfirmDialog({ type: null, user: null });
      setSuspendForm({ reason: "", suspendedUntil: "", notes: "" });
      setSelectedUser(null);
      alert("User suspended successfully");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to suspend user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reactivate user");
      }

      await fetchUsers();
      setConfirmDialog({ type: null, user: null });
      setSelectedUser(null);
      alert("User reactivated successfully");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to reactivate user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      await fetchUsers();
      setConfirmDialog({ type: null, user: null });
      setSelectedUser(null);
      alert("User deleted successfully");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(cents / 100);
  };

  const getDisplayName = (user: User): string => {
    return user.username || user.name || user.email?.split("@")[0] || "Unknown";
  };

  // Filter users based on search and filter
  const filteredUsers = users.filter((user) => {
    // Apply type filter
    if (filter === "customer" && (user.isGuest || user.role !== "user")) return false;
    if (filter === "driver" && user.role !== "driver") return false;
    if (filter === "garage" && user.role !== "garage") return false;
    // Guests filter also surfaces registered accounts that have guest
    // bookings under the same email (their guest entry is merged into the
    // account, which previously hid them here entirely).
    if (filter === "guest" && !user.isGuest && !user.hasGuestBookings) return false;
    if (filter === "active" && user.bookingCount === 0) return false;

    // Apply search filter
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const username = user.username?.toLowerCase() || "";
    const email = user.email?.toLowerCase() || "";
    const name = user.name?.toLowerCase() || "";
    const phone = user.phone?.toLowerCase() || "";
    return (
      username.includes(searchLower) ||
      email.includes(searchLower) ||
      name.includes(searchLower) ||
      phone.includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top bar — dashboard rhythm */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Users</h1>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Filter bar — slim, expandable (same pattern as Bookings) */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 p-2.5">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-transparent bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {!filtersOpen && filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="hidden shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:border-emerald-300 sm:inline-flex"
                title="Clear segment filter"
              >
                {FILTER_OPTIONS.find((o) => o.key === filter)?.label}
                <X className="h-3 w-3" />
              </button>
            )}

            <button
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                filtersOpen
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {filter !== "all" && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
                  1
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${filtersOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
              filtersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-wrap gap-1.5 border-t border-slate-100 p-3">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setFilter(option.key)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                      filter === option.key
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Users Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
              <p className="mt-3 text-sm text-slate-500">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">
                {search ? "No users found matching your search" : "No users found"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Bookings</th>
                    <th className="px-4 py-3">Spent</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const roleKey =
                      user.role === "admin" || user.role === "driver" || user.role === "garage"
                        ? user.role
                        : user.isGuest
                          ? "guest"
                          : "customer";
                    const roleLabel =
                      roleKey === "guest"
                        ? "Guest"
                        : roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
                    return (
                      <tr
                        key={user._id}
                        onClick={() => setSelectedUser(user)}
                        className="cursor-pointer transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              user.isGuest
                                ? "bg-amber-100 text-amber-700"
                                : user.role === "admin"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {getDisplayName(user).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {getDisplayName(user)}
                              </p>
                              {user.lastBookingDate && (
                                <p className="text-[11px] text-slate-400">
                                  Last active {formatDate(user.lastBookingDate)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-xs text-slate-600">{user.email || "—"}</p>
                          {user.phone && (
                            <p className="text-[11px] text-slate-400">{user.phone}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${ROLE_CHIP[roleKey]}`}>
                              {roleLabel}
                            </span>
                            {user.accountStatus === "suspended" && (
                              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                                <Ban className="h-3 w-3" />
                                Suspended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-sm font-medium text-slate-700">
                            {user.bookingCount}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-sm text-slate-600">
                            {user.totalSpent ? formatCurrency(user.totalSpent) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-xs text-slate-500">
                            {formatDate(user.createdAt)}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Results count */}
          {!loading && filteredUsers.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-400">
                Showing {filteredUsers.length} of {users.length} users
                {search && ` matching "${search}"`}
                {filter !== "all" && ` (${FILTER_OPTIONS.find((o) => o.key === filter)?.label})`}
              </p>
            </div>
          )}
        </div>

        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 rounded-t-3xl">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    User Details
                  </h2>
                  {selectedUser.role === "admin" && (
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                      Admin
                    </span>
                  )}
                  {selectedUser.role === "driver" && (
                    <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                      Driver
                    </span>
                  )}
                  {selectedUser.role === "garage" && (
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      Garage
                    </span>
                  )}
                  {selectedUser.isGuest && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Guest
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div className="flex justify-center">
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${
                    selectedUser.isGuest 
                      ? "bg-amber-100 text-amber-700" 
                      : selectedUser.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {getDisplayName(selectedUser).charAt(0).toUpperCase()}
                  </div>
                </div>

                {selectedUser.isGuest && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-700">
                      This is a guest user who made a booking without creating an account.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">User ID</p>
                  <p className="font-mono text-sm text-slate-900 break-all">
                    {selectedUser._id}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Profile Information
                  </div>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        {selectedUser.isGuest ? "Name" : "Username"}
                      </p>
                      <p className="font-medium text-slate-900">
                        {getDisplayName(selectedUser)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <p className="text-sm text-slate-900">
                          {selectedUser.email || "—"}
                        </p>
                      </div>
                    </div>
                    {selectedUser.phone && (
                      <div>
                        <p className="text-xs text-slate-500">Phone</p>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <p className="text-sm text-slate-900">
                            {selectedUser.phone}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <ClipboardList className="h-4 w-4 text-emerald-600" />
                    Activity
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">Total Bookings</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {selectedUser.bookingCount}
                      </p>
                    </div>
                    {selectedUser.totalSpent !== undefined && selectedUser.totalSpent > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">Total Spent</p>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                          <p className="text-lg font-bold text-emerald-600">
                            {formatCurrency(selectedUser.totalSpent)}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedUser.lastBookingDate && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">Last Booking</p>
                        <p className="text-sm text-slate-900">
                          {formatDate(selectedUser.lastBookingDate)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    Timestamps
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-xs text-slate-500">Joined</p>
                      <p className="text-sm text-slate-900">
                        {formatDateTime(selectedUser.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last Updated</p>
                      <p className="text-sm text-slate-900">
                        {formatDateTime(selectedUser.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Actions */}
                {selectedUser.role !== "admin" && !selectedUser.isGuest && (
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">
                      Account Actions
                    </h3>

                    {selectedUser.accountStatus === "active" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setConfirmDialog({
                              type: "suspend",
                              user: selectedUser,
                            })
                          }
                          className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition"
                        >
                          <Ban className="inline h-4 w-4 mr-1" />
                          Suspend
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDialog({
                              type: "delete",
                              user: selectedUser,
                            })
                          }
                          className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition"
                        >
                          <Trash2 className="inline h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    ) : selectedUser.accountStatus === "suspended" ? (
                      <>
                        {/* Show suspension info */}
                        {selectedUser.suspensionInfo && (
                          <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                            <p className="text-xs font-medium text-amber-900 mb-1">
                              Account Suspended
                            </p>
                            <p className="text-xs text-amber-700 mb-2">
                              <strong>Reason:</strong>{" "}
                              {selectedUser.suspensionInfo.reason}
                            </p>
                            {selectedUser.suspensionInfo.suspendedUntil && (
                              <p className="text-xs text-amber-700 mb-2">
                                <strong>Until:</strong>{" "}
                                {formatDateTime(
                                  selectedUser.suspensionInfo.suspendedUntil
                                )}
                              </p>
                            )}
                            {selectedUser.suspensionInfo.notes && (
                              <p className="text-xs text-amber-700">
                                <strong>Notes:</strong>{" "}
                                {selectedUser.suspensionInfo.notes}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setConfirmDialog({
                                type: "reactivate",
                                user: selectedUser,
                              })
                            }
                            className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition"
                          >
                            <CheckCircle2 className="inline h-4 w-4 mr-1" />
                            Reactivate
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDialog({
                                type: "delete",
                                user: selectedUser,
                              })
                            }
                            className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition"
                          >
                            <Trash2 className="inline h-4 w-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-full rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialogs */}
        {confirmDialog.type && confirmDialog.user && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-2xl">
              {confirmDialog.type === "suspend" ? (
                <>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Suspend Account
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Suspend{" "}
                    <strong>{getDisplayName(confirmDialog.user)}</strong>? They
                    will not be able to log in until reactivated.
                  </p>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={suspendForm.reason}
                        onChange={(e) =>
                          setSuspendForm({
                            ...suspendForm,
                            reason: e.target.value,
                          })
                        }
                        placeholder="Why is this account being suspended? (min 10 characters)"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        rows={3}
                        minLength={10}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Suspend Until (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={suspendForm.suspendedUntil}
                        onChange={(e) =>
                          setSuspendForm({
                            ...suspendForm,
                            suspendedUntil: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Leave empty for indefinite suspension
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={suspendForm.notes}
                        onChange={(e) =>
                          setSuspendForm({
                            ...suspendForm,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Additional internal notes..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        rows={2}
                        maxLength={500}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setConfirmDialog({ type: null, user: null });
                        setSuspendForm({
                          reason: "",
                          suspendedUntil: "",
                          notes: "",
                        });
                      }}
                      className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      disabled={actionLoading === confirmDialog.user._id}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSuspend(confirmDialog.user!._id)}
                      className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                      disabled={
                        actionLoading === confirmDialog.user._id ||
                        !suspendForm.reason.trim() ||
                        suspendForm.reason.trim().length < 10
                      }
                    >
                      {actionLoading === confirmDialog.user._id
                        ? "Suspending..."
                        : "Suspend Account"}
                    </button>
                  </div>
                </>
              ) : confirmDialog.type === "reactivate" ? (
                <>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Reactivate Account
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Reactivate{" "}
                    <strong>{getDisplayName(confirmDialog.user)}</strong>? They
                    will be able to log in immediately.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setConfirmDialog({ type: null, user: null })
                      }
                      className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      disabled={actionLoading === confirmDialog.user._id}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReactivate(confirmDialog.user!._id)}
                      className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      disabled={actionLoading === confirmDialog.user._id}
                    >
                      {actionLoading === confirmDialog.user._id
                        ? "Reactivating..."
                        : "Reactivate"}
                    </button>
                  </div>
                </>
              ) : confirmDialog.type === "delete" ? (
                <>
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mb-2" />
                    <p className="text-sm font-medium text-red-900">
                      Warning: This action cannot be undone
                    </p>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Delete Account
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Permanently delete{" "}
                    <strong>{getDisplayName(confirmDialog.user)}</strong>? This
                    will soft-delete the account and prevent all access.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setConfirmDialog({ type: null, user: null })
                      }
                      className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      disabled={actionLoading === confirmDialog.user._id}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(confirmDialog.user!._id)}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      disabled={actionLoading === confirmDialog.user._id}
                    >
                      {actionLoading === confirmDialog.user._id
                        ? "Deleting..."
                        : "Delete Account"}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
