// src/app/admin/location-requests/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MapPin,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Building2,
  ArrowRight,
  Filter,
  Mail,
} from "lucide-react";

interface GarageInfo {
  _id: string;
  businessName: string;
  tradingName?: string;
  primaryContact?: {
    name: string;
    email: string;
  };
}

interface UserInfo {
  _id: string;
  email: string;
  username: string;
}

interface LocationChangeRequest {
  _id: string;
  garageId: GarageInfo | string;
  garageUserId: UserInfo | string;
  // Current location is optional for new location assignments
  currentLocationId?: string;
  currentLocationName?: string;
  currentLocationAddress?: string;
  requestedLocationId: string;
  requestedLocationName: string;
  requestedLocationAddress: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: UserInfo | string;
  adminNotes?: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminLocationRequestsPage() {
  const [requests, setRequests] = useState<LocationChangeRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [selectedRequest, setSelectedRequest] = useState<LocationChangeRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("status", statusFilter);

      const response = await fetch(`/api/admin/location-change-requests?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch location change requests");
      const data = await response.json();
      setRequests(data.requests);
      setStats(data.stats);
      setError("");
    } catch {
      setError("Failed to load location change requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleReview = async (requestId: string, action: "approve" | "reject") => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/location-change-requests/${requestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNotes: adminNotes.trim() || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to review request");
      }

      // Refresh the list
      await fetchRequests();
      setSelectedRequest(null);
      setAdminNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to review request");
    } finally {
      setActionLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "approved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
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
      default:
        return null;
    }
  };

  const getGarageName = (request: LocationChangeRequest) => {
    if (typeof request.garageId === "object" && request.garageId) {
      return request.garageId.businessName || "Unknown Garage";
    }
    return "Unknown Garage";
  };

  const getGarageEmail = (request: LocationChangeRequest) => {
    if (typeof request.garageUserId === "object" && request.garageUserId) {
      return request.garageUserId.email;
    }
    if (typeof request.garageId === "object" && request.garageId?.primaryContact) {
      return request.garageId.primaryContact.email;
    }
    return "Unknown";
  };

  // Filter requests based on search
  const filteredRequests = requests.filter((request) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const garageName = getGarageName(request).toLowerCase();
    const garageEmail = getGarageEmail(request).toLowerCase();
    const currentLocation = (request.currentLocationName || "").toLowerCase();
    return (
      garageName.includes(searchLower) ||
      garageEmail.includes(searchLower) ||
      request.requestedLocationName.toLowerCase().includes(searchLower) ||
      currentLocation.includes(searchLower)
    );
  });

  // Check if this is a new location assignment (no current location)
  const isNewAssignment = (request: LocationChangeRequest) => !request.currentLocationId;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Location Change Requests</h1>
            <p className="mt-1 text-slate-600">
              Review and manage garage location change requests
            </p>
          </div>
          <button
            onClick={fetchRequests}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 transition-transform group-hover:rotate-180 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-500 to-teal-600 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-emerald-100">Total Requests</p>
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
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by garage name, email, or location..."
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
              onClick={fetchRequests}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Requests Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
              <p className="mt-3 text-sm text-slate-500">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <MapPin className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">
                {search ? "No requests found matching your search" : "No location change requests found"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Garage</th>
                    <th className="px-6 py-4">Current Location</th>
                    <th className="px-6 py-4">Requested Location</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Submitted</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((request) => (
                    <tr key={request._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                            {getGarageName(request).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{getGarageName(request)}</p>
                            <p className="text-xs text-slate-500">{getGarageEmail(request)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isNewAssignment(request) ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                              <MapPin className="h-3 w-3" />
                              New Assignment
                            </span>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-slate-900 truncate max-w-[180px]" title={request.currentLocationName}>
                              {request.currentLocationName}
                            </p>
                            <p className="text-xs text-slate-500 truncate max-w-[180px]" title={request.currentLocationAddress}>
                              {request.currentLocationAddress}
                            </p>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-emerald-700 truncate max-w-[180px]" title={request.requestedLocationName}>
                          {request.requestedLocationName}
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-[180px]" title={request.requestedLocationAddress}>
                          {request.requestedLocationAddress}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{formatDate(request.submittedAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setAdminNotes("");
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {request.status === "pending" ? "Review" : "View"}
                          </button>
                          {request.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleReview(request._id, "approve")}
                                disabled={actionLoading}
                                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview(request._id, "reject")}
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
          {!loading && filteredRequests.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-slate-500">
                Showing {filteredRequests.length} of {requests.length} requests
                {search && ` matching "${search}"`}
                {statusFilter !== "all" && ` (${statusFilter})`}
              </p>
            </div>
          )}
        </div>

        {/* Request Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Location Change Request
                  </h2>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusColor(selectedRequest.status)}`}>
                    {getStatusIcon(selectedRequest.status)}
                    {selectedRequest.status}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setAdminNotes("");
                  }}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 p-6">
                {/* Garage Info */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    Garage Information
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Business Name</p>
                      <p className="font-medium text-slate-900">{getGarageName(selectedRequest)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Email</p>
                      <p className="font-medium text-slate-900 flex items-center gap-1">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {getGarageEmail(selectedRequest)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Location */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-3">
                      <MapPin className="h-4 w-4" />
                      Current Location
                    </div>
                    {isNewAssignment(selectedRequest) ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700">
                          <MapPin className="h-4 w-4" />
                          No location assigned
                        </span>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-slate-900">{selectedRequest.currentLocationName}</p>
                        <p className="text-sm text-slate-600 mt-1">{selectedRequest.currentLocationAddress}</p>
                      </>
                    )}
                  </div>

                  {/* Requested Location */}
                  <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-3">
                      <ArrowRight className="h-4 w-4" />
                      {isNewAssignment(selectedRequest) ? "Requested Assignment" : "Requested Location"}
                    </div>
                    <p className="font-medium text-slate-900">{selectedRequest.requestedLocationName}</p>
                    <p className="text-sm text-slate-600 mt-1">{selectedRequest.requestedLocationAddress}</p>
                  </div>
                </div>

                {/* Reason */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-800 mb-3">
                    {isNewAssignment(selectedRequest) ? "Reason for Assignment" : "Reason for Change"}
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedRequest.reason}</p>
                </div>

                {/* Timeline */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    Timeline
                  </div>
                  <div className="text-sm space-y-2">
                    <p className="text-slate-600">
                      Submitted: <span className="font-medium text-slate-900">{formatDateTime(selectedRequest.submittedAt)}</span>
                    </p>
                    {selectedRequest.reviewedAt && (
                      <p className="text-slate-600">
                        Reviewed: <span className="font-medium text-slate-900">{formatDateTime(selectedRequest.reviewedAt)}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Admin Notes (for reviewed requests) */}
                {selectedRequest.adminNotes && selectedRequest.status !== "pending" && (
                  <div className={`rounded-xl p-4 ${
                    selectedRequest.status === "approved"
                      ? "border border-emerald-200 bg-emerald-50"
                      : "border border-red-200 bg-red-50"
                  }`}>
                    <div className="text-sm font-semibold text-slate-800 mb-2">
                      Admin Notes
                    </div>
                    <p className="text-sm text-slate-700">{selectedRequest.adminNotes}</p>
                  </div>
                )}

                {/* Admin Notes Input (for pending requests) */}
                {selectedRequest.status === "pending" && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about your decision..."
                      className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-24 resize-none"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                {selectedRequest.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handleReview(selectedRequest._id, "approve")}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {actionLoading ? "Processing..." : "Approve Request"}
                    </button>
                    <button
                      onClick={() => handleReview(selectedRequest._id, "reject")}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      {actionLoading ? "Processing..." : "Reject Request"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
