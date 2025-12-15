// src/app/admin/users/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Users,
  UserCheck,
  UserPlus,
  Calendar,
  AlertCircle,
  Eye,
  X,
  Mail,
  Clock,
  ClipboardList,
  Phone,
  DollarSign,
  Filter,
} from "lucide-react";

interface User {
  _id: string;
  username?: string;
  email?: string;
  name?: string;
  role: "user" | "admin" | "guest";
  bookingCount: number;
  isGuest: boolean;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastBookingDate?: string;
  totalSpent?: number;
}

interface Stats {
  totalUsers: number;
  registeredUsers: number;
  guestUsers: number;
  activeUsers: number;
  newThisWeek: number;
  newToday: number;
}

type UserFilter = "all" | "registered" | "guest" | "active";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    registeredUsers: 0,
    guestUsers: 0,
    activeUsers: 0,
    newThisWeek: 0,
    newToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data.users);
      setStats(data.stats);
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
    if (filter === "registered" && user.isGuest) return false;
    if (filter === "guest" && !user.isGuest) return false;
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
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Users Management</h1>
            <p className="mt-1 text-slate-600">
              View and manage registered users and guests
            </p>
          </div>
          <button
            onClick={fetchUsers}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 transition-transform group-hover:rotate-180 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-500 to-teal-600 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {stats.totalUsers}
                </p>
                <p className="text-xs text-emerald-100">Total Users</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <UserCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {stats.registeredUsers}
                </p>
                <p className="text-xs text-slate-500">Registered</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <UserPlus className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {stats.guestUsers}
                </p>
                <p className="text-xs text-slate-500">Guests</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <ClipboardList className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {stats.activeUsers}
                </p>
                <p className="text-xs text-slate-500">With Bookings</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {stats.newThisWeek}
                </p>
                <p className="text-xs text-slate-500">This Week</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
                <Clock className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {stats.newToday}
                </p>
                <p className="text-xs text-slate-500">Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as UserFilter)}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-8 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Users</option>
                <option value="registered">Registered Only</option>
                <option value="guest">Guests Only</option>
                <option value="active">With Bookings</option>
              </select>
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
                <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Bookings</th>
                    <th className="px-6 py-4">Total Spent</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                            user.isGuest 
                              ? "bg-amber-100 text-amber-700" 
                              : user.role === "admin"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {getDisplayName(user).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {getDisplayName(user)}
                            </p>
                            {user.lastBookingDate && (
                              <p className="text-xs text-slate-400">
                                Last active: {formatDate(user.lastBookingDate)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-600">{user.email || "—"}</p>
                          {user.phone && (
                            <p className="text-xs text-slate-400">{user.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === "admin" ? (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                            Admin
                          </span>
                        ) : user.isGuest ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                            Guest
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Registered
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <ClipboardList className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">
                            {user.bookingCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-700">
                          {user.totalSpent ? formatCurrency(user.totalSpent) : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">
                          {formatDate(user.createdAt)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Results count */}
          {!loading && filteredUsers.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-slate-500">
                Showing {filteredUsers.length} of {users.length} users
                {search && ` matching "${search}"`}
                {filter !== "all" && ` (${filter})`}
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
      </div>
    </div>
  );
}
