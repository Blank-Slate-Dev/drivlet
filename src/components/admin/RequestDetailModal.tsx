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
} from "lucide-react";

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

export function RequestDetailModal({ request, onClose, onRefresh }: {
  request: BookingRequestItem;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-AU", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  const formatPrice = (c: number) => `$${(c / 100).toFixed(2)}`;

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
            {request.distanceZone && ZONE_STYLES[request.distanceZone] && (
              <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${ZONE_STYLES[request.distanceZone]}`}>
                {request.distanceZone} zone
              </span>
            )}
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
