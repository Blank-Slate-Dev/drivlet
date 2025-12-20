// src/app/admin/garages/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
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
  Wrench,
  Car,
  Users,
  Filter,
  Ban,
} from "lucide-react";

interface Garage {
  _id: string;
  businessName: string;
  tradingName?: string;
  abn: string;
  businessAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  // Linked garage location (the physical garage they represent for booking matching)
  linkedGarageName?: string;
  linkedGarageAddress?: string;
  linkedGaragePlaceId?: string;
  yearsInOperation: number;
  servicesOffered: string[];
  primaryContact: {
    name: string;
    role: string;
    phone: string;
    email: string;
  };
  serviceBays: number;
  vehicleTypes: string[];
  serviceRadius: number;
  publicLiabilityInsurance: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
    coverAmount: number;
  };
  certifications: string[];
  paymentTerms: string;
  gstRegistered: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
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

const SERVICE_LABELS: Record<string, string> = {
  mechanical: "Mechanical",
  panel_beating: "Panel Beating",
  detailing: "Detailing",
  electrical: "Electrical",
  tyres: "Tyres",
  aircon: "Air Con",
  other: "Other",
};

const VEHICLE_LABELS: Record<string, string> = {
  sedan: "Sedans",
  suv: "SUVs",
  ute: "Utes",
  truck: "Trucks",
  motorcycle: "Motorcycles",
  electric: "Electric",
  hybrid: "Hybrid",
  commercial: "Commercial",
};

export default function AdminGaragesPage() {
  const [garages, setGarages] = useState<Garage[]>([]);
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
  const [selectedGarage, setSelectedGarage] = useState<Garage | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [garageToReject, setGarageToReject] = useState<string | null>(null);

  const fetchGarages = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/admin/garages?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch garages");
      const data = await response.json();
      setGarages(data.garages);
      setStats(data.stats);
      setError("");
    } catch {
      setError("Failed to load garage applications");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  const handleAction = async (garageId: string, action: string, reason?: string) => {
    try {
      setActionLoading(true);
      const response = await fetch("/api/admin/garages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ garageId, action, rejectionReason: reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update garage");
      }

      // Refresh the list
      await fetchGarages();
      setSelectedGarage(null);
      setShowRejectModal(false);
      setRejectionReason("");
      setGarageToReject(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update garage");
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (garageId: string) => {
    setGarageToReject(garageId);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(amount);
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

  // Filter garages based on search
  const filteredGarages = garages.filter((garage) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      garage.businessName.toLowerCase().includes(searchLower) ||
      garage.primaryContact.email.toLowerCase().includes(searchLower) ||
      garage.abn.includes(search) ||
      garage.businessAddress.suburb.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Partner Applications</h1>
            <p className="mt-1 text-slate-600">
              Review and manage garage partner submissions
            </p>
          </div>
          <button
            onClick={fetchGarages}
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
                <Building2 className="h-5 w-5 text-white" />
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
              placeholder="Search by business name, email, ABN, or suburb..."
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
              onClick={fetchGarages}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Garages Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
              <p className="mt-3 text-sm text-slate-500">Loading applications...</p>
            </div>
          ) : filteredGarages.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">
                {search ? "No garages found matching your search" : "No garage applications found"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Business</th>
                    <th className="px-6 py-4">Linked Garage</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Submitted</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGarages.map((garage) => (
                    <tr key={garage._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                            {garage.businessName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{garage.businessName}</p>
                            <p className="text-xs text-slate-500">ABN: {garage.abn}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {garage.linkedGarageName ? (
                          <div>
                            <p className="text-sm font-medium text-emerald-700">{garage.linkedGarageName}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]" title={garage.linkedGarageAddress}>
                              {garage.linkedGarageAddress || "No address"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not linked</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-900">
                          {garage.businessAddress.suburb}, {garage.businessAddress.state}
                        </p>
                        <p className="text-xs text-slate-500">{garage.serviceRadius}km radius</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-900">{garage.primaryContact.name}</p>
                        <p className="text-xs text-slate-500">{garage.primaryContact.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(garage.status)}`}>
                          {getStatusIcon(garage.status)}
                          {garage.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{formatDate(garage.submittedAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedGarage(garage)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          {garage.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleAction(garage._id, "approve")}
                                disabled={actionLoading}
                                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => openRejectModal(garage._id)}
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
          {!loading && filteredGarages.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-slate-500">
                Showing {filteredGarages.length} of {garages.length} applications
                {search && ` matching "${search}"`}
                {statusFilter !== "all" && ` (${statusFilter})`}
              </p>
            </div>
          )}
        </div>

        {/* Garage Details Modal */}
        {selectedGarage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedGarage.businessName}
                  </h2>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(selectedGarage.status)}`}>
                    {getStatusIcon(selectedGarage.status)}
                    {selectedGarage.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedGarage(null)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 p-6">
                {/* Business Info */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    Business Information
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Business Name</p>
                      <p className="font-medium text-slate-900">{selectedGarage.businessName}</p>
                    </div>
                    {selectedGarage.tradingName && (
                      <div>
                        <p className="text-slate-500">Trading Name</p>
                        <p className="font-medium text-slate-900">{selectedGarage.tradingName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-500">ABN</p>
                      <p className="font-medium text-slate-900">{selectedGarage.abn}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Years in Operation</p>
                      <p className="font-medium text-slate-900">{selectedGarage.yearsInOperation} years</p>
                    </div>
                  </div>
                </div>

                {/* Linked Garage Location (for booking matching) */}
                {selectedGarage.linkedGarageName ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-3">
                      <Wrench className="h-4 w-4 text-emerald-600" />
                      Linked Garage (Booking Matching)
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-emerald-900">{selectedGarage.linkedGarageName}</p>
                      <p className="text-emerald-700">{selectedGarage.linkedGarageAddress}</p>
                      <p className="mt-2 text-xs text-emerald-600">
                        Bookings for this garage location will appear in this partner&apos;s dashboard
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-3">
                      <Wrench className="h-4 w-4 text-amber-600" />
                      No Linked Garage
                    </div>
                    <p className="text-sm text-amber-700">
                      This partner has not been linked to a physical garage location. They won&apos;t receive any bookings until linked.
                    </p>
                  </div>
                )}

                {/* Location */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    Location & Coverage
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">
                      {selectedGarage.businessAddress.street}
                    </p>
                    <p className="text-slate-600">
                      {selectedGarage.businessAddress.suburb}, {selectedGarage.businessAddress.state} {selectedGarage.businessAddress.postcode}
                    </p>
                    <p className="mt-2 text-slate-500">
                      Service Radius: <span className="font-medium text-slate-900">{selectedGarage.serviceRadius} km</span>
                    </p>
                  </div>
                </div>

                {/* Contact */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Contact Information
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Contact Person</p>
                      <p className="font-medium text-slate-900">{selectedGarage.primaryContact.name}</p>
                      <p className="text-slate-600">{selectedGarage.primaryContact.role}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-900">{selectedGarage.primaryContact.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-900">{selectedGarage.primaryContact.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <Wrench className="h-4 w-4 text-emerald-600" />
                    Services & Capacity
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Services Offered</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedGarage.servicesOffered.map((service) => (
                          <span key={service} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                            {SERVICE_LABELS[service] || service}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Vehicle Types</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedGarage.vehicleTypes.map((type) => (
                          <span key={type} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                            {VEHICLE_LABELS[type] || type}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{selectedGarage.serviceBays} service bays</span>
                    </div>
                  </div>
                </div>

                {/* Insurance */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    Insurance & Compliance
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">Public Liability Insurance</p>
                    <p className="text-slate-600">
                      {selectedGarage.publicLiabilityInsurance.provider} - {formatCurrency(selectedGarage.publicLiabilityInsurance.coverAmount)}
                    </p>
                    <p className="text-slate-500">
                      Policy: {selectedGarage.publicLiabilityInsurance.policyNumber} | Expires: {formatDate(selectedGarage.publicLiabilityInsurance.expiryDate)}
                    </p>
                    {selectedGarage.certifications.length > 0 && (
                      <div className="mt-3">
                        <p className="text-slate-500 mb-1">Certifications</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedGarage.certifications.map((cert, index) => (
                            <span key={index} className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    Payment Information
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Payment Terms</p>
                      <p className="font-medium text-slate-900">{selectedGarage.paymentTerms.replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">GST Registered</p>
                      <p className="font-medium text-slate-900">{selectedGarage.gstRegistered ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    Timeline
                  </div>
                  <div className="text-sm space-y-2">
                    <p className="text-slate-600">
                      Submitted: <span className="font-medium text-slate-900">{formatDateTime(selectedGarage.submittedAt)}</span>
                    </p>
                    {selectedGarage.reviewedAt && (
                      <p className="text-slate-600">
                        Reviewed: <span className="font-medium text-slate-900">{formatDateTime(selectedGarage.reviewedAt)}</span>
                      </p>
                    )}
                    {selectedGarage.rejectionReason && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 font-medium">Rejection Reason:</p>
                        <p className="text-red-600">{selectedGarage.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedGarage.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handleAction(selectedGarage._id, "approve")}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve Application
                    </button>
                    <button
                      onClick={() => openRejectModal(selectedGarage._id)}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Application
                    </button>
                  </div>
                )}

                {selectedGarage.status === "approved" && (
                  <div className="pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handleAction(selectedGarage._id, "suspend")}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Ban className="h-4 w-4" />
                      Suspend Partner
                    </button>
                  </div>
                )}

                {selectedGarage.status === "suspended" && (
                  <div className="pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handleAction(selectedGarage._id, "reactivate")}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Reactivate Partner
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
                    setGarageToReject(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => garageToReject && handleAction(garageToReject, "reject", rejectionReason)}
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
