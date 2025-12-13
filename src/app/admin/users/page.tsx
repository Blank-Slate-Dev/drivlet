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
} from "lucide-react";

interface User {
  _id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  bookingCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  newThisWeek: number;
  newToday: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    newThisWeek: 0,
    newToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
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

  // Filter users based on search
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            View and manage registered users
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats.totalUsers}
              </p>
              <p className="text-xs text-slate-500">Total Users</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats.activeUsers}
              </p>
              <p className="text-xs text-slate-500">Active Users</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats.newThisWeek}
              </p>
              <p className="text-xs text-slate-500">New This Week</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats.newToday}
              </p>
              <p className="text-xs text-slate-500">New Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            onClick={fetchUsers}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
            <p className="mt-2 text-sm text-slate-500">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              {search ? "No users found matching your search" : "No users found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Bookings</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {user.username}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {user.bookingCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600">
                        {formatDate(user.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-sm text-slate-500">
              Showing {filteredUsers.length} of {users.length} users
              {search && ` matching "${search}"`}
            </p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  User Details
                </h2>
                {selectedUser.role === "admin" && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">User ID</p>
                <p className="font-mono text-sm text-slate-900">
                  {selectedUser._id}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Users className="h-4 w-4" />
                  Profile Information
                </div>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-xs text-slate-500">Username</p>
                    <p className="font-medium text-slate-900">
                      {selectedUser.username}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <p className="text-sm text-slate-900">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <ClipboardList className="h-4 w-4" />
                  Activity
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">Total Bookings</p>
                    <p className="text-lg font-semibold text-violet-600">
                      {selectedUser.bookingCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Clock className="h-4 w-4" />
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
                className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
