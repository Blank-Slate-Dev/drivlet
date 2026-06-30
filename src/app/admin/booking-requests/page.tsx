"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  User,
  Calendar,
  Car,
  MapPin,
  Building,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
  DollarSign,
  FileText,
  Send,
  BadgeCheck,
} from "lucide-react";

interface BookingRequestItem {
  _id: string;
  userName: string;
  userEmail: string;
  customerPhone: string;
  isGuest: boolean;
  vehicleRegistration: string;
  vehicleState: string;
  vehicleYear: string;
  vehicleModel: string;
  transmissionType: string;
  pickupAddress: string;
  serviceType: string;
  serviceDate: string;
  earliestPickup: string;
  latestDropoff: string;
  pickupTimeSlot: string;
  dropoffTimeSlot: string;
  garageName: string | null;
  garageAddress: string | null;
  distanceZone: string;
  distanceSurcharge: number;
  distanceKm: number;
  quotedAmount: number;
  serviceNotes: string;
  status: string;
  adminNotes: string | null;
  declineReason: string | null;
  paymentLinkSentAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  pending_review: number;
  accepted_awaiting_payment: number;
  approved: number;
  payment_link_sent: number;
  paid: number;
  declined: number;
  converted: number;
  expired: number;
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_review: { label: "Pending Review", color: "bg-blue-100 text-blue-700" },
  accepted_awaiting_payment: { label: "Awaiting Payment", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  payment_link_sent: { label: "Link Sent", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-700" },
  declined: { label: "Declined", color: "bg-red-100 text-red-700" },
  converted: { label: "Converted", color: "bg-green-100 text-green-700" },
  expired: { label: "Expired", color: "bg-slate-100 text-slate-600" },
};

const ZONE_STYLES: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-700",
  yellow: "bg-yellow-100 text-yellow-700",
  orange: "bg-orange-100 text-orange-700",
};

export default function AdminBookingRequestsPage() {
  const [requests, setRequests] = useState<BookingRequestItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<BookingRequestItem | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/booking-requests?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();

      let filtered = data.requests;
      if (search) {
        const s = search.toLowerCase();
        filtered = data.requests.filter(
          (r: BookingRequestItem) =>
            r.userName.toLowerCase().includes(s) ||
            r.userEmail.toLowerCase().includes(s) ||
            r.vehicleRegistration.toLowerCase().includes(s) ||
            (r.garageName && r.garageName.toLowerCase().includes(s))
        );
      }

      setRequests(filtered);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
      setStats(data.stats);
      setError("");
    } catch {
      setError("Failed to load booking requests");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Booking Requests</h1>
            <p className="mt-1 text-slate-600">
              {total} total requests &middot; Review and manage incoming booking requests
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

        {/* Stats */}
        {stats && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={Inbox} iconBg="bg-blue-100" iconColor="text-blue-600" value={stats.pending_review} label="Pending" />
            <StatCard icon={CheckCircle2} iconBg="bg-emerald-100" iconColor="text-emerald-600" value={(stats.approved || 0) + (stats.payment_link_sent || 0)} label="Approved" />
            <StatCard icon={Clock} iconBg="bg-amber-100" iconColor="text-amber-600" value={stats.accepted_awaiting_payment + (stats.payment_link_sent || 0)} label="Awaiting Pay" />
            <StatCard icon={BadgeCheck} iconBg="bg-green-100" iconColor="text-green-600" value={(stats.paid || 0) + stats.converted} label="Paid / Converted" />
            <StatCard icon={X} iconBg="bg-red-100" iconColor="text-red-600" value={stats.declined} label="Declined" />
            <StatCard icon={FileText} iconBg="bg-slate-100" iconColor="text-slate-600" value={stats.total} label="Total" />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, rego, garage..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "pending_review", "approved", "payment_link_sent", "paid", "declined", "converted"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  statusFilter === s
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
            <button onClick={fetchRequests} className="mt-3 text-sm font-medium text-red-600 hover:text-red-700">
              Try again
            </button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
              <p className="mt-3 text-sm text-slate-500">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">No booking requests found</p>
              <p className="mt-1 text-xs text-slate-400">
                {statusFilter !== "all" ? "Try changing the filter" : "Requests will appear here when customers submit the booking form"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Vehicle</th>
                    <th className="px-4 py-4">Garage</th>
                    <th className="px-4 py-4">Quoted</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((req) => (
                    <tr
                      key={req._id}
                      className="transition hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-900">{formatDate(req.createdAt)}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(req.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900">{req.userName}</p>
                        <p className="text-xs text-slate-500">{req.userEmail}</p>
                        {req.isGuest && (
                          <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            Guest
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-mono text-sm font-semibold text-slate-900">{req.vehicleRegistration}</p>
                        <p className="text-xs text-slate-500">{req.vehicleYear} {req.vehicleModel}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-slate-900 max-w-[180px] truncate">{req.garageName || "—"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-900">{formatPrice(req.quotedAmount)}</p>
                        {req.distanceSurcharge > 0 && (
                          <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${ZONE_STYLES[req.distanceZone] || ""}`}>
                            +{formatPrice(req.distanceSurcharge)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[req.status]?.color || "bg-slate-100 text-slate-600"}`}>
                          {STATUS_CONFIG[req.status]?.label || req.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-4">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages} ({total} requests)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedRequest && (
          <RequestDetailModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            formatDateTime={formatDateTime}
            formatPrice={formatPrice}
            onRefresh={() => { fetchRequests(); setSelectedRequest(null); }}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, value, label }: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function RequestDetailModal({ request, onClose, formatDateTime, formatPrice, onRefresh }: {
  request: BookingRequestItem;
  onClose: () => void;
  formatDateTime: (d: string) => string;
  formatPrice: (c: number) => string;
  onRefresh: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusInfo = STATUS_CONFIG[request.status] || { label: request.status, color: "bg-slate-100 text-slate-600" };

  const handleApprove = async () => {
    setActionLoading("approve");
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/booking-requests/${request._id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error || "Failed to approve");
        return;
      }
      setActionSuccess("Request approved! You can now send the payment link.");
      onRefresh();
    } catch {
      setActionError("Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendPaymentLink = async () => {
    setActionLoading("send-link");
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/booking-requests/${request._id}/send-payment-link`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error || "Failed to send");
        return;
      }
      const data = await res.json();
      setActionSuccess(data.emailSent ? "Payment link sent to customer!" : "Link created but email failed — check Mailjet config.");
      onRefresh();
    } catch {
      setActionError("Failed to send payment link");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Request Details</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* Action Buttons */}
          {(request.status === "pending_review" || request.status === "approved" || request.status === "payment_link_sent") && (
            <div className="flex flex-wrap gap-3">
              {request.status === "pending_review" && (
                <button
                  onClick={handleApprove}
                  disabled={actionLoading === "approve"}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {actionLoading === "approve" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve Request
                </button>
              )}
              {(request.status === "approved" || request.status === "payment_link_sent") && (
                <button
                  onClick={handleSendPaymentLink}
                  disabled={actionLoading === "send-link"}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {actionLoading === "send-link" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {request.status === "payment_link_sent" ? "Resend Payment Link" : "Send Payment Link"}
                </button>
              )}
            </div>
          )}

          {actionSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="mr-1 inline h-4 w-4" /> {actionSuccess}
            </div>
          )}
          {actionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mr-1 inline h-4 w-4" /> {actionError}
            </div>
          )}
          {/* Customer */}
          <DetailCard icon={User} title="Customer">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-900">{request.userName}</span>
                {request.isGuest && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Guest</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <a href={`mailto:${request.userEmail}`} className="text-emerald-600 hover:underline">{request.userEmail}</a>
              </div>
              {request.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${request.customerPhone}`} className="text-emerald-600 hover:underline">{request.customerPhone}</a>
                </div>
              )}
            </div>
          </DetailCard>

          {/* Vehicle */}
          <DetailCard icon={Car} title="Vehicle">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Registration</span>
                <span className="font-mono font-semibold text-slate-900">{request.vehicleRegistration} ({request.vehicleState})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle</span>
                <span className="text-slate-900">{request.vehicleYear} {request.vehicleModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transmission</span>
                <span className={`font-medium ${request.transmissionType === "manual" ? "text-amber-600" : "text-slate-900"}`}>
                  {request.transmissionType === "manual" ? "Manual" : "Automatic"}
                </span>
              </div>
            </div>
          </DetailCard>

          {/* Locations */}
          <DetailCard icon={MapPin} title="Locations">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500">Pickup address</span>
                <p className="text-slate-900">{request.pickupAddress}</p>
              </div>
              {request.garageName && (
                <div className="border-t border-slate-200 pt-2">
                  <span className="text-xs text-slate-500">Garage</span>
                  <p className="font-medium text-slate-900">{request.garageName}</p>
                  {request.garageAddress && <p className="text-xs text-slate-600">{request.garageAddress}</p>}
                </div>
              )}
            </div>
          </DetailCard>

          {/* Schedule */}
          <DetailCard icon={Calendar} title="Schedule">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Service date</span>
                <span className="text-slate-900">
                  {new Date(request.serviceDate).toLocaleDateString("en-AU", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pickup slot</span>
                <span className="text-slate-900">{request.pickupTimeSlot || request.earliestPickup}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Drop-off slot</span>
                <span className="text-slate-900">{request.dropoffTimeSlot || request.latestDropoff}</span>
              </div>
            </div>
          </DetailCard>

          {/* Pricing */}
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <DollarSign className="h-4 w-4" /> Pricing
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-emerald-700">Transport fee</span>
                <span className="font-medium text-emerald-700">{formatPrice(request.quotedAmount - request.distanceSurcharge)}</span>
              </div>
              {request.distanceSurcharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-emerald-700">
                    Distance surcharge ({request.distanceZone} zone, {request.distanceKm} km)
                  </span>
                  <span className="font-medium text-emerald-700">{formatPrice(request.distanceSurcharge)}</span>
                </div>
              )}
              <div className="border-t border-emerald-200 pt-2 flex justify-between">
                <span className="text-lg font-semibold text-emerald-800">Quoted total</span>
                <span className="text-lg font-bold text-emerald-700">{formatPrice(request.quotedAmount)} AUD</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {request.serviceNotes && (
            <DetailCard icon={FileText} title="Service Notes">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.serviceNotes}</p>
            </DetailCard>
          )}

          {/* Timeline */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Clock className="h-4 w-4 text-emerald-600" /> Timeline
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Submitted</span>
                <span className="text-slate-900">{formatDateTime(request.createdAt)}</span>
              </div>
              {request.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Approved{request.approvedBy ? ` by ${request.approvedBy}` : ""}</span>
                  <span className="text-slate-900">{formatDateTime(request.approvedAt)}</span>
                </div>
              )}
              {request.paymentLinkSentAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment link sent</span>
                  <span className="text-slate-900">{formatDateTime(request.paymentLinkSentAt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Last updated</span>
                <span className="text-slate-900">{formatDateTime(request.updatedAt)}</span>
              </div>
            </div>
          </div>

          {request.declineReason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-red-700">Decline Reason</h3>
              <p className="text-sm text-red-600">{request.declineReason}</p>
            </div>
          )}

          {request.adminNotes && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Admin Notes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{request.adminNotes}</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon className="h-4 w-4 text-emerald-600" /> {title}
      </h3>
      {children}
    </div>
  );
}
