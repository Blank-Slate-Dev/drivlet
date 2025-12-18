// src/app/admin/drivers/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Car,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  X,
  MapPin,
  Phone,
  Mail,
  Shield,
  CreditCard,
  Calendar,
  User,
  Users,
  Filter,
  Ban,
  FileText,
  Briefcase,
  Star,
} from "lucide-react";

interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  license: {
    number: string;
    state: string;
    class: string;
    expiryDate: string;
  };
  policeCheck?: {
    completed: boolean;
    certificateNumber?: string;
    expiryDate?: string;
  };
  hasOwnVehicle: boolean;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    color: string;
    registration: string;
    registrationState: string;
    registrationExpiry: string;
  };
  availability: {
    monday: { available: boolean; startTime: string; endTime: string };
    tuesday: { available: boolean; startTime: string; endTime: string };
    wednesday: { available: boolean; startTime: string; endTime: string };
    thursday: { available: boolean; startTime: string; endTime: string };
    friday: { available: boolean; startTime: string; endTime: string };
    saturday: { available: boolean; startTime: string; endTime: string };
    sunday: { available: boolean; startTime: string; endTime: string };
  };
  maxJobsPerDay: number;
  preferredAreas: string[];
  employmentType: "employee" | "contractor";
  abn?: string;
  bankDetails: {
    accountName: string;
    bsb: string;
    accountNumber: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  metrics?: {
    totalJobs: number;
    completedJobs: number;
    cancelledJobs: number;
    averageRating: number;
    totalRatings: number;
  };
  status: "pending" | "approved" | "rejected" | "suspended";
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  isActive: boolean;
  canAcceptJobs: boolean;
  userId?: {
    email: string;
    username: string;
    createdAt: string;
  };
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "suspended";

const LICENSE_CLASS_LABELS: Record<string, string> = {
  C: "Car (C)",
  LR: "Light Rigid (LR)",
  MR: "Medium Rigid (MR)",
  HR: "Heavy Rigid (HR)",
  HC: "Heavy Combination (HC)",
  MC: "Multi Combination (MC)",
};

const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [driverToReject, setDriverToReject] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/admin/drivers?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch drivers");
      const data = await response.json();
      setDrivers(data.drivers);
      setStats(data.stats);
      setError("");
    } catch {
      setError("Failed to load driver applications");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleAction = async (driverId: string, action: string, reason?: string) => {
    try {
      setActionLoading(true);
      const response = await fetch("/api/admin/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, action, rejectionReason: reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update driver");
      }

      // Refresh the list
      await fetchDrivers();
      setSelectedDriver(null);
      setShowRejectModal(false);
      setRejectionReason("");
      setDriverToReject(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update driver");
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (driverId: string) => {
    setDriverToReject(driverId);
    setShowRejectModal(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "approved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      case "suspended":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "suspended":
        return <Ban className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getAvailableDays = (availability: Driver["availability"]) => {
    const days = Object.entries(availability)
      .filter(([, value]) => value.available)
      .map(([key]) => DAY_LABELS[key]);
    return days.length > 0 ? days.join(", ") : "None";
  };

  // Filter drivers based on search
  const filteredDrivers = drivers.filter((driver) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const fullName = `${driver.firstName} ${driver.lastName}`.toLowerCase();
    const email = (driver.userId as { email?: string })?.email?.toLowerCase() || "";
    return (
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      driver.phone.includes(search) ||
      driver.license.number.toLowerCase().includes(searchLower) ||
      driver.address.suburb.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Driver Applications</h1>
            <p className="mt-1 text-slate-600">
              Review and manage driver partner submissions
            </p>
          </div>
          <button
            onClick={fetchDrivers}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 transition-transform group-hover:rotate-180 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-500 to-teal-600 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-emerald-100">Total</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStatusFilter("pending")}
            className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md text-left ${
              statusFilter === "pending"
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter("approved")}
            className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md text-left ${
              statusFilter === "approved"
                ? "border-green-300 bg-green-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{stats.approved}</p>
                <p className="text-xs text-slate-500">Approved</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter("rejected")}
            className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md text-left ${
              statusFilter === "rejected"
                ? "border-red-300 bg-red-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{stats.rejected}</p>
                <p className="text-xs text-slate-500">Rejected</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter("suspended")}
            className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md text-left ${
              statusFilter === "suspended"
                ? "border-slate-400 bg-slate-100"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200">
                <Ban className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{stats.suspended}</p>
                <p className="text-xs text-slate-500">Suspended</p>
              </div>
            </div>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, license, or suburb..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-8 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
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
              onClick={fetchDrivers}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Drivers Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
              <p className="mt-3 text-sm text-slate-500">Loading applications...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Car className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">
                {search ? "No drivers found matching your search" : "No driver applications found"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Driver</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">License</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Submitted</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                            {driver.firstName.charAt(0)}{driver.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {driver.firstName} {driver.lastName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(driver.userId as { email?: string })?.email || driver.phone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-900">
                          {driver.address.suburb}, {driver.address.state}
                        </p>
                        <p className="text-xs text-slate-500">
                          {driver.preferredAreas.slice(0, 2).join(", ")}
                          {driver.preferredAreas.length > 2 && ` +${driver.preferredAreas.length - 2}`}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-900">{driver.license.number}</p>
                        <p className="text-xs text-slate-500">
                          {LICENSE_CLASS_LABELS[driver.license.class] || driver.license.class} • {driver.license.state}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          driver.employmentType === "contractor"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {driver.employmentType === "contractor" ? "Contractor" : "Employee"}
                        </span>
                        {driver.hasOwnVehicle && (
                          <span className="ml-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            <Car className="mr-1 h-3 w-3" />
                            Own car
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(driver.status)}`}>
                          {getStatusIcon(driver.status)}
                          {driver.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{formatDate(driver.submittedAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedDriver(driver)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          {driver.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleAction(driver._id, "approve")}
                                disabled={actionLoading}
                                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => openRejectModal(driver._id)}
                                disabled={actionLoading}
                                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Results count */}
          {!loading && filteredDrivers.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-slate-500">
                Showing {filteredDrivers.length} of {drivers.length} applications
                {search && ` matching "${search}"`}
                {statusFilter !== "all" && ` (${statusFilter})`}
              </p>
            </div>
          )}
        </div>

        {/* Driver Details Modal */}
        {selectedDriver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedDriver.firstName} {selectedDriver.lastName}
                  </h2>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(selectedDriver.status)}`}>
                    {getStatusIcon(selectedDriver.status)}
                    {selectedDriver.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 p-6">
                {/* Personal Info */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <User className="h-4 w-4 text-emerald-600" />
                    Personal Information
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Full Name</p>
                      <p className="font-medium text-slate-900">{selectedDriver.firstName} {selectedDriver.lastName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Phone</p>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <p className="font-medium text-slate-900">{selectedDriver.phone}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500">Email</p>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <p className="font-medium text-slate-900">
                          {(selectedDriver.userId as { email?: string })?.email || "—"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500">Employment Type</p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        selectedDriver.employmentType === "contractor"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        <Briefcase className="mr-1 h-3 w-3" />
                        {selectedDriver.employmentType === "contractor" ? "Contractor" : "Employee"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    Address & Preferred Areas
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">
                      {selectedDriver.address.street}
                    </p>
                    <p className="text-slate-600">
                      {selectedDriver.address.suburb}, {selectedDriver.address.state} {selectedDriver.address.postcode}
                    </p>
                    <div className="mt-3">
                      <p className="text-slate-500 mb-2">Preferred Areas</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDriver.preferredAreas.map((area) => (
                          <span key={area} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* License Info */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    License Information
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">License Number</p>
                      <p className="font-medium text-slate-900">{selectedDriver.license.number}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">State</p>
                      <p className="font-medium text-slate-900">{selectedDriver.license.state}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Class</p>
                      <p className="font-medium text-slate-900">
                        {LICENSE_CLASS_LABELS[selectedDriver.license.class] || selectedDriver.license.class}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Expiry Date</p>
                      <p className="font-medium text-slate-900">{formatDate(selectedDriver.license.expiryDate)}</p>
                    </div>
                  </div>
                  {selectedDriver.policeCheck && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Shield className={`h-4 w-4 ${selectedDriver.policeCheck.completed ? "text-green-600" : "text-amber-600"}`} />
                        <span className={`text-sm font-medium ${selectedDriver.policeCheck.completed ? "text-green-700" : "text-amber-700"}`}>
                          Police Check: {selectedDriver.policeCheck.completed ? "Completed" : "Pending"}
                        </span>
                      </div>
                      {selectedDriver.policeCheck.certificateNumber && (
                        <p className="text-xs text-slate-500 mt-1">
                          Certificate: {selectedDriver.policeCheck.certificateNumber}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Vehicle Info (if applicable) */}
                {selectedDriver.hasOwnVehicle && selectedDriver.vehicle && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                      <Car className="h-4 w-4 text-emerald-600" />
                      Vehicle Information
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Vehicle</p>
                        <p className="font-medium text-slate-900">
                          {selectedDriver.vehicle.year} {selectedDriver.vehicle.make} {selectedDriver.vehicle.model}
                        </p>
                        <p className="text-slate-600">{selectedDriver.vehicle.color}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Registration</p>
                        <p className="font-medium text-slate-900">
                          {selectedDriver.vehicle.registration} ({selectedDriver.vehicle.registrationState})
                        </p>
                        <p className="text-xs text-slate-500">
                          Expires: {formatDate(selectedDriver.vehicle.registrationExpiry)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Availability */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    Availability
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {Object.entries(selectedDriver.availability).map(([day, hours]) => (
                      <div
                        key={day}
                        className={`rounded-lg p-2 ${
                          hours.available
                            ? "bg-emerald-50 border border-emerald-200"
                            : "bg-slate-50 border border-slate-200"
                        }`}
                      >
                        <p className={`text-xs font-medium ${hours.available ? "text-emerald-700" : "text-slate-400"}`}>
                          {DAY_LABELS[day]}
                        </p>
                        {hours.available && (
                          <p className="text-xs text-emerald-600 mt-1">
                            {hours.startTime}-{hours.endTime}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    Max jobs per day: <span className="font-medium text-slate-900">{selectedDriver.maxJobsPerDay}</span>
                  </p>
                </div>

                {/* Bank Details */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    Bank Details
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Account Name</p>
                      <p className="font-medium text-slate-900">{selectedDriver.bankDetails.accountName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">BSB</p>
                      <p className="font-medium text-slate-900">{selectedDriver.bankDetails.bsb}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Account Number</p>
                      <p className="font-medium text-slate-900">
                        ****{selectedDriver.bankDetails.accountNumber.slice(-4)}
                      </p>
                    </div>
                  </div>
                  {selectedDriver.abn && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-slate-500 text-sm">ABN</p>
                      <p className="font-medium text-slate-900 text-sm">{selectedDriver.abn}</p>
                    </div>
                  )}
                </div>

                {/* Emergency Contact */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Emergency Contact
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Name</p>
                      <p className="font-medium text-slate-900">{selectedDriver.emergencyContact.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Relationship</p>
                      <p className="font-medium text-slate-900">{selectedDriver.emergencyContact.relationship}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Phone</p>
                      <p className="font-medium text-slate-900">{selectedDriver.emergencyContact.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Metrics (for approved drivers) */}
                {selectedDriver.status === "approved" && selectedDriver.metrics && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                      <Star className="h-4 w-4 text-emerald-600" />
                      Performance Metrics
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{selectedDriver.metrics.totalJobs}</p>
                        <p className="text-xs text-slate-500">Total Jobs</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{selectedDriver.metrics.completedJobs}</p>
                        <p className="text-xs text-slate-500">Completed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{selectedDriver.metrics.cancelledJobs}</p>
                        <p className="text-xs text-slate-500">Cancelled</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600">
                          {selectedDriver.metrics.averageRating.toFixed(1)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Rating ({selectedDriver.metrics.totalRatings})
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    Timeline
                  </div>
                  <div className="text-sm space-y-2">
                    <p className="text-slate-600">
                      Submitted: <span className="font-medium text-slate-900">{formatDateTime(selectedDriver.submittedAt)}</span>
                    </p>
                    {selectedDriver.reviewedAt && (
                      <p className="text-slate-600">
                        Reviewed: <span className="font-medium text-slate-900">{formatDateTime(selectedDriver.reviewedAt)}</span>
                      </p>
                    )}
                    {selectedDriver.rejectionReason && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 font-medium">Rejection Reason:</p>
                        <p className="text-red-600">{selectedDriver.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedDriver.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handleAction(selectedDriver._id, "approve")}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve Application
                    </button>
                    <button
                      onClick={() => openRejectModal(selectedDriver._id)}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Application
                    </button>
                  </div>
                )}

                {selectedDriver.status === "approved" && (
                  <div className="pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handleAction(selectedDriver._id, "suspend")}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Ban className="h-4 w-4" />
                      Suspend Driver
                    </button>
                  </div>
                )}

                {selectedDriver.status === "suspended" && (
                  <div className="pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handleAction(selectedDriver._id, "reactivate")}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Reactivate Driver
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Reject Application</h3>
              <p className="text-sm text-slate-600 mb-4">
                Please provide a reason for rejecting this application. This will be visible to the applicant.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                    setDriverToReject(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => driverToReject && handleAction(driverToReject, "reject", rejectionReason)}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}