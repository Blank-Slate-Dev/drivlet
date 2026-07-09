// src/components/admin/RequestDetailModal.tsx
// Extracted from the retired /admin/booking-requests page so the unified
// /admin/bookings page can reuse it unchanged (approve + send-payment-link,
// including the slot-full 409 error display).
"use client";

import { useState } from "react";
import {
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
  Loader2,
  DollarSign,
  FileText,
  Send,
  XCircle,
  Pencil,
} from "lucide-react";
import {
  PICKUP_SLOTS,
  DROPOFF_SLOTS,
  PICKUP_SLOT_VALUES,
  DROPOFF_SLOT_VALUES,
} from "@/config/timeSlots";

export interface BookingRequestItem {
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

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
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

export function StatCard({ icon: Icon, iconBg, iconColor, value, label, active, onClick }: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition ${
        onClick ? "cursor-pointer hover:border-slate-300" : "cursor-default"
      } ${active ? "border-emerald-400 ring-2 ring-emerald-500/20" : "border-slate-200"}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </button>
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

export function RequestDetailModal({ request, onClose, onRefresh, onRequestUpdated }: {
  request: BookingRequestItem;
  onClose: () => void;
  onRefresh: () => void;
  /** Called after an in-place edit so the parent can sync its list without closing the modal. */
  onRequestUpdated?: (updated: BookingRequestItem) => void;
}) {
  // Local overlay so in-place edits refresh the modal without closing it.
  const [reqOverride, setReqOverride] = useState<BookingRequestItem | null>(null);
  const req = reqOverride ?? request;

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Edit-request form (pre-payment edits via PATCH /api/admin/booking-requests/{id})
  const toYmd = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-CA") : "");
  const [showEditForm, setShowEditForm] = useState(false);
  const [amountNotice, setAmountNotice] = useState(false);
  const [editData, setEditData] = useState({
    serviceDate: "",
    pickupTimeSlot: "",
    dropoffTimeSlot: "",
    pickupAddress: "",
    garageName: "",
    adminNotes: "",
    quotedDollars: "",
  });

  const isEditable = ["pending_review", "approved", "payment_link_sent"].includes(req.status);

  const openEditForm = () => {
    setEditData({
      serviceDate: toYmd(req.serviceDate),
      pickupTimeSlot: PICKUP_SLOT_VALUES.includes(req.pickupTimeSlot as (typeof PICKUP_SLOT_VALUES)[number])
        ? req.pickupTimeSlot
        : "",
      dropoffTimeSlot: DROPOFF_SLOT_VALUES.includes(req.dropoffTimeSlot as (typeof DROPOFF_SLOT_VALUES)[number])
        ? req.dropoffTimeSlot
        : "",
      pickupAddress: req.pickupAddress || "",
      garageName: req.garageName || "",
      adminNotes: req.adminNotes || "",
      quotedDollars: (req.quotedAmount / 100).toFixed(2),
    });
    setActionError(null);
    setShowEditForm(true);
  };

  const handleSaveEdit = async () => {
    setActionError(null);

    // Only send fields that actually changed
    const payload: Record<string, unknown> = {};
    if (editData.serviceDate && editData.serviceDate !== toYmd(req.serviceDate)) {
      payload.serviceDate = editData.serviceDate;
    }
    if (editData.pickupTimeSlot && editData.pickupTimeSlot !== req.pickupTimeSlot) {
      payload.pickupTimeSlot = editData.pickupTimeSlot;
    }
    if (editData.dropoffTimeSlot && editData.dropoffTimeSlot !== req.dropoffTimeSlot) {
      payload.dropoffTimeSlot = editData.dropoffTimeSlot;
    }
    if (editData.pickupAddress.trim() && editData.pickupAddress.trim() !== req.pickupAddress) {
      payload.pickupAddress = editData.pickupAddress.trim();
    }
    if (editData.garageName.trim() !== (req.garageName || "")) {
      payload.garageName = editData.garageName.trim();
    }
    if (editData.adminNotes.trim() !== (req.adminNotes || "")) {
      payload.adminNotes = editData.adminNotes.trim();
    }
    const dollars = parseFloat(editData.quotedDollars);
    if (Number.isFinite(dollars)) {
      const cents = Math.round(dollars * 100);
      if (cents !== req.quotedAmount) {
        if (cents < 1000 || cents > 100000) {
          setActionError("Quoted amount must be between $10.00 and $1,000.00.");
          return;
        }
        payload.quotedAmount = cents;
      }
    }
    if (Object.keys(payload).length === 0) {
      setActionError("No changes to apply.");
      return;
    }

    setActionLoading("edit");
    try {
      const res = await fetch(`/api/admin/booking-requests/${req._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || "Failed to update the request");
        return;
      }
      const updated = data.request as BookingRequestItem;
      setReqOverride(updated);
      onRequestUpdated?.(updated);
      setShowEditForm(false);
      setActionSuccess("Request updated.");
      setAmountNotice(!!data.amountChanged);
    } catch {
      setActionError("Failed to update the request");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-AU", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  const formatPrice = (c: number) => `$${(c / 100).toFixed(2)}`;

  const statusInfo = STATUS_CONFIG[req.status] || { label: req.status, color: "bg-slate-100 text-slate-600" };

  const handleApprove = async () => {
    setActionLoading("approve");
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/booking-requests/${req._id}/approve`, {
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

  const handleDecline = async () => {
    setActionLoading("decline");
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/booking-requests/${req._id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to decline");
        return;
      }
      setActionSuccess(
        data.emailSent
          ? "Request declined — the customer has been emailed."
          : "Request declined, but the email to the customer failed — check Mailjet config."
      );
      setShowDeclineForm(false);
      onRefresh();
    } catch {
      setActionError("Failed to decline request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendPaymentLink = async () => {
    setActionLoading("send-link");
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/booking-requests/${req._id}/send-payment-link`, {
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
          {(req.status === "pending_review" || req.status === "approved" || req.status === "payment_link_sent") && (
            <div className="flex flex-wrap gap-3">
              {req.status === "pending_review" && (
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
              {(req.status === "approved" || req.status === "payment_link_sent") && (
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
                  {req.status === "payment_link_sent" ? "Resend Payment Link" : "Send Payment Link"}
                </button>
              )}
              <button
                onClick={() => (showEditForm ? setShowEditForm(false) : openEditForm())}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                Edit Request
              </button>
              <button
                onClick={() => { setShowDeclineForm((v) => !v); setActionError(null); }}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Decline Request
              </button>
            </div>
          )}

          {/* Edit request form (pre-payment) */}
          {showEditForm && isEditable && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Pencil className="h-4 w-4 text-emerald-600" /> Edit Request
              </h3>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Service date</label>
                    <input
                      type="date"
                      value={editData.serviceDate}
                      onChange={(e) => setEditData({ ...editData, serviceDate: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Quoted amount (AUD)</label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      step="0.01"
                      value={editData.quotedDollars}
                      onChange={(e) => setEditData({ ...editData, quotedDollars: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Between $10.00 and $1,000.00</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Pickup slot</label>
                    <select
                      value={editData.pickupTimeSlot}
                      onChange={(e) => setEditData({ ...editData, pickupTimeSlot: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Keep current</option>
                      {PICKUP_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>{slot.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Drop-off slot</label>
                    <select
                      value={editData.dropoffTimeSlot}
                      onChange={(e) => setEditData({ ...editData, dropoffTimeSlot: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Keep current</option>
                      {DROPOFF_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>{slot.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Pickup address</label>
                  <input
                    type="text"
                    value={editData.pickupAddress}
                    onChange={(e) => setEditData({ ...editData, pickupAddress: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Garage name</label>
                  <input
                    type="text"
                    value={editData.garageName}
                    onChange={(e) => setEditData({ ...editData, garageName: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Admin notes (internal)</label>
                  <textarea
                    value={editData.adminNotes}
                    onChange={(e) => setEditData({ ...editData, adminNotes: e.target.value })}
                    rows={2}
                    maxLength={2000}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={actionLoading === "edit"}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {actionLoading === "edit" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Save Changes
                  </button>
                  <button
                    onClick={() => setShowEditForm(false)}
                    disabled={actionLoading === "edit"}
                    className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Decline reason form */}
          {showDeclineForm && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <label className="mb-1 block text-sm font-semibold text-red-800">
                Reason for declining <span className="font-normal text-red-600">(sent to the customer)</span>
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="e.g. We can't service this area on the requested date. Please try a different date or garage."
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleDecline}
                  disabled={actionLoading === "decline" || declineReason.trim().length < 5}
                  className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {actionLoading === "decline" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Confirm Decline & Email Customer
                </button>
                <button
                  onClick={() => setShowDeclineForm(false)}
                  disabled={actionLoading === "decline"}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {actionSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="mr-1 inline h-4 w-4" /> {actionSuccess}
            </div>
          )}
          {amountNotice && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-800">
              <AlertCircle className="mr-1 inline h-4 w-4" /> Amount changed — resend the payment link so the customer sees the new total.
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
                <span className="font-medium text-slate-900">{req.userName}</span>
                {req.isGuest && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Guest</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <a href={`mailto:${req.userEmail}`} className="text-emerald-600 hover:underline">{req.userEmail}</a>
              </div>
              {req.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${req.customerPhone}`} className="text-emerald-600 hover:underline">{req.customerPhone}</a>
                </div>
              )}
            </div>
          </DetailCard>

          {/* Vehicle */}
          <DetailCard icon={Car} title="Vehicle">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Registration</span>
                <span className="font-mono font-semibold text-slate-900">{req.vehicleRegistration} ({req.vehicleState})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle</span>
                <span className="text-slate-900">{req.vehicleYear} {req.vehicleModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transmission</span>
                <span className={`font-medium ${req.transmissionType === "manual" ? "text-amber-600" : "text-slate-900"}`}>
                  {req.transmissionType === "manual" ? "Manual" : "Automatic"}
                </span>
              </div>
            </div>
          </DetailCard>

          {/* Locations */}
          <DetailCard icon={MapPin} title="Locations">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500">Pickup address</span>
                <p className="text-slate-900">{req.pickupAddress}</p>
              </div>
              {req.garageName && (
                <div className="border-t border-slate-200 pt-2">
                  <span className="text-xs text-slate-500">Garage</span>
                  <p className="font-medium text-slate-900">{req.garageName}</p>
                  {req.garageAddress && <p className="text-xs text-slate-600">{req.garageAddress}</p>}
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
                  {new Date(req.serviceDate).toLocaleDateString("en-AU", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pickup slot</span>
                <span className="text-slate-900">{req.pickupTimeSlot || req.earliestPickup}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Drop-off slot</span>
                <span className="text-slate-900">{req.dropoffTimeSlot || req.latestDropoff}</span>
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
                <span className="font-medium text-emerald-700">{formatPrice(req.quotedAmount - req.distanceSurcharge)}</span>
              </div>
              {req.distanceSurcharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-emerald-700">
                    Distance surcharge ({req.distanceZone} zone, {req.distanceKm} km)
                  </span>
                  <span className="font-medium text-emerald-700">{formatPrice(req.distanceSurcharge)}</span>
                </div>
              )}
              <div className="border-t border-emerald-200 pt-2 flex justify-between">
                <span className="text-lg font-semibold text-emerald-800">Quoted total</span>
                <span className="text-lg font-bold text-emerald-700">{formatPrice(req.quotedAmount)} AUD</span>
              </div>
            </div>
            {req.distanceZone && ZONE_STYLES[req.distanceZone] && (
              <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${ZONE_STYLES[req.distanceZone]}`}>
                {req.distanceZone} zone
              </span>
            )}
          </div>

          {/* Notes */}
          {req.serviceNotes && (
            <DetailCard icon={FileText} title="Service Notes">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{req.serviceNotes}</p>
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
                <span className="text-slate-900">{formatDateTime(req.createdAt)}</span>
              </div>
              {req.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Approved{req.approvedBy ? ` by ${req.approvedBy}` : ""}</span>
                  <span className="text-slate-900">{formatDateTime(req.approvedAt)}</span>
                </div>
              )}
              {req.paymentLinkSentAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment link sent</span>
                  <span className="text-slate-900">{formatDateTime(req.paymentLinkSentAt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Last updated</span>
                <span className="text-slate-900">{formatDateTime(req.updatedAt)}</span>
              </div>
            </div>
          </div>

          {req.declineReason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-red-700">Decline Reason</h3>
              <p className="text-sm text-red-600">{req.declineReason}</p>
            </div>
          )}

          {req.adminNotes && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Admin Notes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{req.adminNotes}</p>
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
