// src/components/admin/BookingDetailModals.tsx
// Extracted verbatim from the previous /admin/bookings page so the unified page can
// reuse the booking View/Edit modals unchanged. Behaviour is identical: tracking info,
// payment (Paid + timestamp), Service Centre (garage name + address), driver assignment,
// stage editing, cancel/complete confirmation.
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Check,
  AlertCircle,
  Car,
  Clock,
  MapPin,
  Wrench,
  User,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Phone,
  Mail,
  Building,
  CreditCard,
  ExternalLink,
  Copy,
  QrCode,
  Truck,
  UserPlus,
  UserMinus,
  Loader2,
  DollarSign,
  Pencil,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { getCategoryById } from "@/constants/serviceCategories";
import { FEATURES } from "@/lib/featureFlags";
import {
  getPickupSlotLabel,
  getDropoffSlotLabel,
  getServiceTypeByValue,
  PICKUP_SLOTS,
  DROPOFF_SLOTS,
} from "@/config/timeSlots";

export const STAGES = [
  { id: "booking_confirmed", label: "Booking Confirmed", progress: 14 },
  { id: "driver_en_route", label: "Driver En Route", progress: 28 },
  { id: "car_picked_up", label: "Car Picked Up", progress: 42 },
  { id: "at_garage", label: "At Garage", progress: 57 },
  { id: "service_in_progress", label: "Service In Progress", progress: 72 },
  { id: "driver_returning", label: "Driver Returning", progress: 86 },
  { id: "delivered", label: "Delivered", progress: 100 },
];

// Chip colours for payment statuses (transport/service payments, extra charges)
const PAYMENT_STATUS_CHIP: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
};

interface Update {
  stage: string;
  timestamp: string;
  message: string;
  updatedBy: string;
}

interface SignedFormRef {
  formId: string;
  formType: "pickup_consent" | "return_confirmation" | "claim_lodgement";
  submittedAt: string;
}

interface SelectedService {
  category: string;
  services: string[];
}

interface DriverLeg {
  driverId: string;
  driverName?: string;
  assignedAt: string;
  acceptedAt?: string;
  startedAt?: string;
  arrivedAt?: string;
  collectedAt?: string;
  completedAt?: string;
}

interface RefundEntry {
  target: "transport" | "service";
  amount: number; // cents
  refundId?: string;
  reason?: string;
  processedBy: string;
  processedAt: string;
}

interface ExtraCharge {
  description: string;
  amount: number; // cents
  status: "pending" | "paid";
  checkoutSessionId?: string;
  paymentUrl?: string;
  createdBy: string;
  createdAt: string;
  paidAt?: string;
}

interface CancellationRequest {
  status: "pending" | "approved" | "denied";
  reason?: string;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  denyReason?: string;
}

export interface Booking {
  _id: string;
  userId: string | null;
  userEmail: string;
  userName: string;
  isGuest: boolean;
  guestPhone?: string;
  userMobile?: string;
  vehicleRegistration: string;
  vehicleState: string;
  vehicleYear?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  serviceType: string;
  serviceDate?: string;
  pickupAddress: string;
  pickupTime: string;
  dropoffTime: string;
  pickupTimeSlot?: string;
  dropoffTimeSlot?: string;
  estimatedServiceDuration?: number;
  trackingCode?: string;
  hasExistingBooking: boolean;
  garageName?: string;
  garageAddress?: string;
  existingBookingRef?: string;
  existingBookingNotes?: string;
  paymentStatus?: string;
  paymentId?: string;
  paymentAmount?: number;
  servicePaymentAmount?: number;
  servicePaymentStatus?: string;
  servicePaymentIntentId?: string;
  refunds?: RefundEntry[];
  extraCharges?: ExtraCharge[];
  cancellationRequest?: CancellationRequest;
  incidents?: string[];
  hasActiveIncident?: boolean;
  incidentExceptionState?: "none" | "continue" | "hold" | "stop";
  transmissionType?: "automatic" | "manual";
  isManualTransmission?: boolean;
  selectedServices?: SelectedService[];
  primaryServiceCategory?: string | null;
  serviceNotes?: string;
  signedForms?: SignedFormRef[];
  currentStage: string;
  overallProgress: number;
  status: string;
  updates: Update[];
  createdAt: string;
  updatedAt: string;
  pickupDriver?: DriverLeg;
  returnDriver?: DriverLeg;
  pickupDriverName?: string;
  returnDriverName?: string;
  assignedDriverId?: string;
  returnDriverId?: string;
  assignedDriverName?: string;
}

export interface DriverOption {
  _id: string;
  firstName: string;
  lastName: string;
  canAcceptJobs: boolean;
  shiftPreference: "am" | "pm" | "full_day";
}

// ============================================================================
// Modal components below are carried over verbatim from the original page.
// ============================================================================

export function ViewDetailsModal({
  booking,
  onClose,
  onEdit,
  getStageLabel,
  formatDateTime,
  formatDate,
  formatCurrency,
  getTrackingLink,
  copyToClipboard,
  onBookingUpdated,
}: {
  booking: Booking;
  onClose: () => void;
  onEdit: () => void;
  getStageLabel: (id: string) => string;
  formatDateTime: (date: string) => string;
  formatDate: (date: string) => string;
  formatCurrency: (cents: number) => string;
  getTrackingLink: (booking: Booking) => string;
  copyToClipboard: (text: string, label: string) => void;
  onBookingUpdated: (booking: Booking) => void;
}) {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState<"pickup" | "return" | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [driverActionLoading, setDriverActionLoading] = useState(false);
  const [driverError, setDriverError] = useState("");

  // Success banner shown at the top of the modal after any action
  const [flash, setFlash] = useState("");

  // Cancellation request handling
  const [cancelActionLoading, setCancelActionLoading] = useState<"approve" | "deny" | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [denyReason, setDenyReason] = useState("");

  // Payments: refunds + extra charge
  const [refundTarget, setRefundTarget] = useState<"transport" | "service" | null>(null);
  const [refundAmount, setRefundAmount] = useState(""); // dollars
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [showExtraChargeForm, setShowExtraChargeForm] = useState(false);
  const [extraChargeAmount, setExtraChargeAmount] = useState(""); // dollars
  const [extraChargeDescription, setExtraChargeDescription] = useState("");
  const [extraChargeLoading, setExtraChargeLoading] = useState(false);

  // Edit logistics details (post-payment, pre-pickup only)
  const [showEditDetails, setShowEditDetails] = useState(false);

  // Re-fetch the booking and push it up (same pattern as driver assignment)
  const refreshBooking = async () => {
    const res = await fetch(`/api/admin/bookings/${booking._id}`, { cache: "no-store" });
    if (res.ok) {
      const updated = await res.json();
      onBookingUpdated(updated);
    }
  };

  const handleCancelRequestAction = async (action: "approve" | "deny") => {
    if (
      action === "approve" &&
      !confirm("This cancels the booking and emails the customer. Refunds are processed separately from the payments panel.")
    ) {
      return;
    }
    setCancelActionLoading(action);
    setCancelError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking._id}/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "approve" ? { action: "approve" } : { action: "deny", denyReason: denyReason.trim() }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCancelError(data.error || "Failed to resolve the cancellation request");
        return;
      }
      setFlash(data.message || "Cancellation request resolved.");
      setShowDenyForm(false);
      setDenyReason("");
      await refreshBooking();
    } catch {
      setCancelError("Failed to resolve the cancellation request");
    } finally {
      setCancelActionLoading(null);
    }
  };

  // Remaining refundable per target (paid amount minus refunds already processed)
  const refundedFor = (target: "transport" | "service") =>
    (booking.refunds || []).filter((r) => r.target === target).reduce((sum, r) => sum + r.amount, 0);
  const remainingFor = (target: "transport" | "service") => {
    const paid = target === "transport" ? booking.paymentAmount || 0 : booking.servicePaymentAmount || 0;
    return Math.max(0, paid - refundedFor(target));
  };

  const openRefundForm = (target: "transport" | "service") => {
    setRefundTarget(target);
    setRefundAmount((remainingFor(target) / 100).toFixed(2));
    setRefundReason("");
    setPaymentsError("");
  };

  const handleProcessRefund = async () => {
    if (!refundTarget) return;
    const dollars = parseFloat(refundAmount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setPaymentsError("Enter a refund amount greater than zero.");
      return;
    }
    setRefundLoading(true);
    setPaymentsError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking._id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: refundTarget,
          amount: Math.round(dollars * 100),
          ...(refundReason.trim() ? { reason: refundReason.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPaymentsError(data.error || "Failed to process refund");
        return;
      }
      setFlash(data.message || "Refund processed.");
      setRefundTarget(null);
      await refreshBooking();
    } catch {
      setPaymentsError("Failed to process refund");
    } finally {
      setRefundLoading(false);
    }
  };

  const handleSendExtraCharge = async () => {
    const dollars = parseFloat(extraChargeAmount);
    if (!Number.isFinite(dollars) || dollars < 10) {
      setPaymentsError("Extra charge amount must be at least $10.");
      return;
    }
    if (extraChargeDescription.trim().length < 5) {
      setPaymentsError("Description must be at least 5 characters.");
      return;
    }
    setExtraChargeLoading(true);
    setPaymentsError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking._id}/extra-charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(dollars * 100),
          description: extraChargeDescription.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPaymentsError(data.error || "Failed to create the payment link");
        return;
      }
      setFlash(data.message || "Payment link sent to the customer.");
      setShowExtraChargeForm(false);
      setExtraChargeAmount("");
      setExtraChargeDescription("");
      await refreshBooking();
    } catch {
      setPaymentsError("Failed to create the payment link");
    } finally {
      setExtraChargeLoading(false);
    }
  };

  // Fetch available drivers
  useEffect(() => {
    const fetchDrivers = async () => {
      setLoadingDrivers(true);
      try {
        const response = await fetch("/api/admin/drivers?status=approved&onboardingStatus=active&canAcceptJobs=true&isActive=true");
        if (response.ok) {
          const data = await response.json();
          setDrivers(data.drivers || []);
        }
      } catch (error) {
        console.error("Failed to fetch drivers:", error);
      } finally {
        setLoadingDrivers(false);
      }
    };
    fetchDrivers();
  }, []);

  const handleAssignDriver = async (leg: "pickup" | "return") => {
    if (!selectedDriverId) return;
    setDriverActionLoading(true);
    setDriverError("");

    try {
      const response = await fetch(`/api/admin/bookings/${booking._id}/assign-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: selectedDriverId, leg }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign driver");
      }

      // Refresh booking data
      const bookingResponse = await fetch(`/api/admin/bookings/${booking._id}`);
      if (bookingResponse.ok) {
        const updatedBooking = await bookingResponse.json();
        onBookingUpdated(updatedBooking);
      }

      setAssigningDriver(null);
      setSelectedDriverId("");
    } catch (error) {
      setDriverError(error instanceof Error ? error.message : "Failed to assign driver");
    } finally {
      setDriverActionLoading(false);
    }
  };

  const handleUnassignDriver = async (leg: "pickup" | "return") => {
    if (!confirm(`Are you sure you want to unassign the ${leg} driver?`)) return;
    setDriverActionLoading(true);
    setDriverError("");

    try {
      const response = await fetch(`/api/admin/bookings/${booking._id}/assign-driver`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leg }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to unassign driver");
      }

      // Refresh booking data
      const bookingResponse = await fetch(`/api/admin/bookings/${booking._id}`);
      if (bookingResponse.ok) {
        const updatedBooking = await bookingResponse.json();
        onBookingUpdated(updatedBooking);
      }
    } catch (error) {
      setDriverError(error instanceof Error ? error.message : "Failed to unassign driver");
    } finally {
      setDriverActionLoading(false);
    }
  };

  // Check if return driver assignment is allowed
  const canAssignReturnDriver = booking.pickupDriver?.completedAt;

  // Logistics can only be edited post-payment while the car hasn't been picked up
  const canEditDetails =
    ["pending", "in_progress"].includes(booking.status) &&
    ["booking_confirmed", "driver_en_route"].includes(booking.currentStage);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Booking Details
            </h2>
            {booking.isGuest && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                Guest
              </span>
            )}
            {booking.hasExistingBooking && (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                Existing Booking
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {flash && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <span>
                <CheckCircle2 className="mr-1 inline h-4 w-4" /> {flash}
              </span>
              <button onClick={() => setFlash("")} className="text-emerald-500 hover:text-emerald-700" title="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Active incident indicator */}
          {booking.hasActiveIncident && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                  <ShieldAlert className="h-4 w-4" />
                  Active Incident
                  {booking.incidentExceptionState && booking.incidentExceptionState !== "none" && (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-red-700">
                      {booking.incidentExceptionState}
                    </span>
                  )}
                </div>
                <Link
                  href="/admin/incidents"
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Incidents
                </Link>
              </div>
              {booking.incidents && booking.incidents.length > 0 && (
                <p className="mt-2 text-xs text-red-600">
                  {booking.incidents.length} incident{booking.incidents.length === 1 ? "" : "s"} recorded on this booking.
                </p>
              )}
            </div>
          )}

          {/* Pending cancellation request — needs an admin decision */}
          {booking.cancellationRequest?.status === "pending" && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Cancellation Requested by Customer
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-amber-800">
                  <span className="font-medium">Reason:</span>{" "}
                  {booking.cancellationRequest.reason || "No reason provided"}
                </p>
                <p className="text-xs text-amber-700">
                  Requested {formatDateTime(booking.cancellationRequest.requestedAt)}
                </p>
              </div>
              {cancelError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mr-1 inline h-4 w-4" /> {cancelError}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleCancelRequestAction("approve")}
                  disabled={cancelActionLoading !== null}
                  className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {cancelActionLoading === "approve" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Approve &amp; Cancel Booking
                </button>
                <button
                  onClick={() => { setShowDenyForm((v) => !v); setCancelError(""); }}
                  disabled={cancelActionLoading !== null}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                >
                  Deny Request
                </button>
              </div>
              {showDenyForm && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3">
                  <label className="mb-1 block text-sm font-medium text-amber-800">
                    Reason for denying <span className="font-normal text-amber-600">(sent to the customer, min 5 characters)</span>
                  </label>
                  <textarea
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="e.g. The driver is already on the way to collect your car, so we can't cancel this booking."
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    onClick={() => handleCancelRequestAction("deny")}
                    disabled={cancelActionLoading !== null || denyReason.trim().length < 5}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
                  >
                    {cancelActionLoading === "deny" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Confirm Deny &amp; Email Customer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resolved cancellation request — context for the admin */}
          {booking.cancellationRequest && booking.cancellationRequest.status !== "pending" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-700">
                Cancellation request {booking.cancellationRequest.status}
                {booking.cancellationRequest.resolvedAt && ` — ${formatDateTime(booking.cancellationRequest.resolvedAt)}`}
              </p>
              {booking.cancellationRequest.denyReason && (
                <p className="mt-1 text-xs text-slate-500">Deny reason: {booking.cancellationRequest.denyReason}</p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Booking ID</p>
            <p className="font-mono text-sm text-slate-900">{booking._id}</p>
          </div>

          {/* Tracking Information */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 mb-3">
              <QrCode className="h-4 w-4" />
              Tracking Information
            </div>
            <div className="space-y-3">
              {/* Tracking Code */}
              <div>
                <p className="text-xs text-emerald-600 mb-1">Tracking Code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-mono text-slate-900 border border-emerald-200">
                    {booking.trackingCode || 'Not available'}
                  </code>
                  {booking.trackingCode && (
                    <button
                      onClick={() => copyToClipboard(booking.trackingCode!, 'Tracking code')}
                      className="rounded-lg p-2 bg-emerald-500 text-white hover:bg-emerald-600 transition"
                      title="Copy tracking code"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tracking URL */}
              <div>
                <p className="text-xs text-emerald-600 mb-1">Tracking URL</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}${getTrackingLink(booking)}`}
                    className="flex-1 rounded-lg bg-white px-3 py-2 text-xs text-slate-700 border border-emerald-200"
                  />
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}${getTrackingLink(booking)}`, 'Tracking URL')}
                    className="rounded-lg p-2 bg-slate-500 text-white hover:bg-slate-600 transition"
                    title="Copy tracking URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* View Tracking Page Button */}
              <Link
                href={getTrackingLink(booking)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
              >
                <ExternalLink className="h-4 w-4" />
                View Customer Tracking Page
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <User className="h-4 w-4 text-emerald-600" />
              Customer
              {booking.isGuest && (
                <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  Guest Checkout
                </span>
              )}
            </div>
            <div className="mt-3">
              <p className="font-medium text-slate-900">{booking.userName}</p>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                <Mail className="h-3.5 w-3.5" />
                {booking.userEmail}
              </div>
              {(booking.guestPhone || booking.userMobile) && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                  <Phone className="h-3.5 w-3.5" />
                  {booking.guestPhone || booking.userMobile}
                </div>
              )}
            </div>
          </div>

          {/* Payments — transport + service payments, refunds, extra charges */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Payments
            </div>

            {paymentsError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mr-1 inline h-4 w-4" /> {paymentsError}
              </div>
            )}

            <div className="mt-3 space-y-3">
              {/* Transport payment (paid at booking) */}
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Transport payment</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {booking.paymentAmount ? formatCurrency(booking.paymentAmount) : "—"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Paid {formatDateTime(booking.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_CHIP[booking.paymentStatus || "pending"] || "bg-slate-100 text-slate-700"}`}>
                      {booking.paymentStatus || "pending"}
                    </span>
                    {booking.paymentStatus === "paid" && booking.paymentId && remainingFor("transport") > 0 && (
                      <button
                        onClick={() => openRefundForm("transport")}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        <DollarSign className="h-3 w-3" />
                        Refund
                      </button>
                    )}
                  </div>
                </div>
                {refundedFor("transport") > 0 && booking.paymentStatus !== "refunded" && (
                  <p className="mt-2 text-xs text-purple-600">
                    {formatCurrency(refundedFor("transport"))} refunded so far — {formatCurrency(remainingFor("transport"))} remaining
                  </p>
                )}
                {booking.paymentId && (
                  <p className="mt-2 break-all font-mono text-[11px] text-slate-400">{booking.paymentId}</p>
                )}
              </div>

              {/* Service payment (paid before car return), when one exists */}
              {(booking.servicePaymentAmount || booking.servicePaymentStatus) && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Service payment</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {booking.servicePaymentAmount ? formatCurrency(booking.servicePaymentAmount) : "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_CHIP[booking.servicePaymentStatus || "pending"] || "bg-slate-100 text-slate-700"}`}>
                        {booking.servicePaymentStatus || "pending"}
                      </span>
                      {booking.servicePaymentStatus === "paid" && remainingFor("service") > 0 && (
                        <button
                          onClick={() => openRefundForm("service")}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <DollarSign className="h-3 w-3" />
                          Refund
                        </button>
                      )}
                    </div>
                  </div>
                  {refundedFor("service") > 0 && booking.servicePaymentStatus !== "refunded" && (
                    <p className="mt-2 text-xs text-purple-600">
                      {formatCurrency(refundedFor("service"))} refunded so far — {formatCurrency(remainingFor("service"))} remaining
                    </p>
                  )}
                </div>
              )}

              {/* Refund form */}
              {refundTarget && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-semibold text-red-800">
                    Refund {refundTarget === "transport" ? "transport" : "service"} payment
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-red-700">Amount (AUD)</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                      <p className="mt-1 text-[11px] text-red-600">
                        Max refundable: {formatCurrency(remainingFor(refundTarget))}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-red-700">Reason (optional)</label>
                      <input
                        type="text"
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        maxLength={500}
                        placeholder="e.g. Booking cancelled before pickup"
                        className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleProcessRefund}
                      disabled={refundLoading}
                      className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                    >
                      {refundLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                      Process refund via Stripe
                    </button>
                    <button
                      onClick={() => { setRefundTarget(null); setPaymentsError(""); }}
                      disabled={refundLoading}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Refund history */}
              {booking.refunds && booking.refunds.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Refund history</p>
                  <div className="mt-2 space-y-2">
                    {booking.refunds.map((refund, index) => (
                      <div key={index} className="flex items-start justify-between gap-3 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">
                            {formatCurrency(refund.amount)}{" "}
                            <span className="text-xs font-normal text-slate-500">
                              ({refund.target === "transport" ? "transport" : "service"} payment)
                            </span>
                          </p>
                          {refund.reason && <p className="text-xs text-slate-600">{refund.reason}</p>}
                          <p className="text-[11px] text-slate-400">
                            {formatDateTime(refund.processedAt)} • {refund.processedBy}
                          </p>
                        </div>
                        <span className="inline-flex whitespace-nowrap rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                          refunded
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra charges (custom payment links) */}
              {booking.extraCharges && booking.extraCharges.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Extra charges</p>
                  <div className="mt-2 space-y-2">
                    {booking.extraCharges.map((charge, index) => (
                      <div key={index} className="flex items-start justify-between gap-3 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">
                            {formatCurrency(charge.amount)}{" "}
                            <span className="text-xs font-normal text-slate-600">— {charge.description}</span>
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Created {formatDateTime(charge.createdAt)}
                            {charge.paidAt ? ` • Paid ${formatDateTime(charge.paidAt)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${charge.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {charge.status}
                          </span>
                          {charge.status === "pending" && charge.paymentUrl && (
                            <button
                              onClick={() => copyToClipboard(charge.paymentUrl!, "Payment link")}
                              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                              title="Copy payment link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Send custom payment link (extra charge) */}
              {booking.status !== "cancelled" && (
                showExtraChargeForm ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-semibold text-emerald-800">Send custom payment link</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[8rem_1fr]">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-emerald-700">Amount (AUD)</label>
                        <input
                          type="number"
                          min="10"
                          step="0.01"
                          value={extraChargeAmount}
                          onChange={(e) => setExtraChargeAmount(e.target.value)}
                          placeholder="10.00"
                          className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-emerald-700">Description (sent to the customer)</label>
                        <input
                          type="text"
                          value={extraChargeDescription}
                          onChange={(e) => setExtraChargeDescription(e.target.value)}
                          maxLength={200}
                          placeholder="e.g. Replacement wiper blades fitted during service"
                          className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-emerald-700">
                      Emails the customer a secure Stripe link (valid 24 hours). Minimum $10.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={handleSendExtraCharge}
                        disabled={extraChargeLoading}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {extraChargeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send payment link
                      </button>
                      <button
                        onClick={() => { setShowExtraChargeForm(false); setPaymentsError(""); }}
                        disabled={extraChargeLoading}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowExtraChargeForm(true); setPaymentsError(""); }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 px-4 py-2.5 text-sm text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600"
                  >
                    <Send className="h-4 w-4" />
                    Send custom payment link
                  </button>
                )
              )}
            </div>
          </div>

          {/* Service Centre — garage name + full address (moved here from the table rows) */}
          {booking.garageName && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Service Centre
              </div>
              <div className="mt-3">
                <p className="font-medium text-slate-900">{booking.garageName}</p>
                {booking.garageAddress && (
                  <p className="mt-0.5 text-sm text-slate-600">{booking.garageAddress}</p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Car className="h-4 w-4 text-emerald-600" />
              Vehicle
              {booking.isManualTransmission && (
                <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Manual Transmission
                </span>
              )}
            </div>
            <div className="mt-3 space-y-3">
              {/* Registration badge */}
              <div className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2">
                <span className="text-xs font-medium text-slate-400">
                  {booking.vehicleState}
                </span>
                <span className="text-xl font-bold tracking-wider text-white">
                  {booking.vehicleRegistration}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Year</p>
                  <p className="font-medium text-slate-900">
                    {booking.vehicleYear || '—'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Make & Model</p>
                  <p className="font-medium text-slate-900">
                    {booking.vehicleModel || '—'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">Transmission</p>
                <p className={`font-medium ${booking.isManualTransmission ? 'text-amber-600' : 'text-slate-900'}`}>
                  {booking.transmissionType === 'manual' ? 'Manual' : 'Automatic'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Wrench className="h-4 w-4 text-emerald-600" />
              Service Details
            </div>
            <div className="mt-3">
              <p className="text-xs text-slate-500">Service Type</p>
              <p className="font-medium text-slate-900">
                {(() => {
                  const svcType = getServiceTypeByValue(booking.serviceType);
                  return svcType
                    ? `${svcType.label} (~${svcType.estimatedHours}h)`
                    : booking.serviceType;
                })()}
              </p>
            </div>
            {booking.serviceDate && (
              <div className="mt-3">
                <p className="text-xs text-slate-500">Service Date</p>
                <p className="font-medium text-slate-900">
                  {new Date(booking.serviceDate).toLocaleDateString('en-AU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
            {FEATURES.SERVICE_SELECTION && booking.primaryServiceCategory && (
              <div className="mt-3">
                <p className="text-xs text-slate-500">Primary Category</p>
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {getCategoryById(booking.primaryServiceCategory)?.name || booking.primaryServiceCategory}
                </span>
              </div>
            )}
          </div>

          {/* Selected Services - Hidden in Phase 1 (Transport Only) */}
          {FEATURES.SERVICE_SELECTION && booking.selectedServices && booking.selectedServices.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <Wrench className="h-4 w-4" />
                Services Requested ({booking.selectedServices.reduce((acc, s) => acc + s.services.length, 0)})
              </div>
              <div className="mt-3 space-y-2">
                {booking.selectedServices.map((sel) => {
                  const cat = getCategoryById(sel.category);
                  return (
                    <div key={sel.category}>
                      <p className="text-xs font-medium text-emerald-800">{cat?.name || sel.category}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {sel.services.map((service) => (
                          <span
                            key={service}
                            className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {booking.serviceNotes && (
                <div className="mt-3 border-t border-emerald-200 pt-3">
                  <p className="text-xs text-emerald-600">Service Notes:</p>
                  <p className="mt-1 text-sm text-emerald-800">{booking.serviceNotes}</p>
                </div>
              )}
            </div>
          )}

          {booking.hasExistingBooking && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <Building className="h-4 w-4" />
                Existing Garage Booking
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs text-blue-600">Garage Name</p>
                  <p className="font-medium text-blue-900">{booking.garageName}</p>
                </div>
                {booking.existingBookingRef && (
                  <div>
                    <p className="text-xs text-blue-600">Booking Reference</p>
                    <p className="font-medium text-blue-900">{booking.existingBookingRef}</p>
                  </div>
                )}
                {booking.existingBookingNotes && (
                  <div>
                    <p className="text-xs text-blue-600">Notes</p>
                    <p className="text-sm text-blue-800">{booking.existingBookingNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Clock className="h-4 w-4 text-emerald-600" />
              Schedule
              {canEditDetails && (
                <button
                  onClick={() => setShowEditDetails(true)}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Pencil className="h-3 w-3" />
                  Edit Details
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Pickup Slot</p>
                <p className="font-medium text-slate-900">
                  {booking.pickupTimeSlot
                    ? getPickupSlotLabel(booking.pickupTimeSlot)
                    : booking.pickupTime}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Drop-off Slot</p>
                <p className="font-medium text-slate-900">
                  {booking.dropoffTimeSlot
                    ? getDropoffSlotLabel(booking.dropoffTimeSlot)
                    : booking.dropoffTime}
                </p>
              </div>
            </div>
            {booking.estimatedServiceDuration && (
              <div className="mt-3">
                <p className="text-xs text-slate-500">Estimated Duration</p>
                <p className="font-medium text-slate-900">{booking.estimatedServiceDuration} hours</p>
              </div>
            )}
            <div className="mt-3">
              <p className="text-xs text-slate-500">Pickup Address</p>
              <p className="text-sm text-slate-900">{booking.pickupAddress}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Progress
              </div>
              <span className="text-sm font-semibold text-emerald-600">
                {booking.overallProgress}%
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${booking.overallProgress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Current Stage:{" "}
              <span className="font-medium text-slate-900">
                {getStageLabel(booking.currentStage)}
              </span>
            </p>
          </div>

          {/* Driver Assignments - Two-Slot Layout */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4">
              <Truck className="h-4 w-4 text-emerald-600" />
              Driver Assignments
            </div>

            {driverError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {driverError}
              </div>
            )}

            <div className="space-y-4">
              {/* Pickup Driver Slot */}
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Pickup Driver
                  </span>
                  <span className="text-xs text-slate-400">Customer → Workshop</span>
                </div>

                {booking.pickupDriver ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {booking.pickupDriverName || "Unknown Driver"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {booking.pickupDriver.completedAt ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </span>
                          ) : booking.pickupDriver.startedAt ? (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Clock className="h-3 w-3" />
                              In Progress
                            </span>
                          ) : booking.pickupDriver.acceptedAt ? (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <Check className="h-3 w-3" />
                              Accepted
                            </span>
                          ) : (
                            <span className="text-amber-600">Assigned</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Assigned {formatDateTime(booking.pickupDriver.assignedAt)}
                          {booking.pickupDriver.completedAt && ` • Completed ${formatDateTime(booking.pickupDriver.completedAt)}`}
                        </p>
                      </div>
                    </div>
                    {!booking.pickupDriver.startedAt && (
                      <button
                        onClick={() => handleUnassignDriver("pickup")}
                        disabled={driverActionLoading}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Unassign Driver"
                      >
                        {driverActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                ) : assigningDriver === "pickup" ? (
                  <div className="space-y-3">
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Select a driver...</option>
                      {drivers.map((driver) => (
                        <option key={driver._id} value={driver._id}>
                          {driver.firstName} {driver.lastName}
                          {driver.shiftPreference !== "full_day" && ` (${driver.shiftPreference.toUpperCase()})`}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAssignDriver("pickup")}
                        disabled={!selectedDriverId || driverActionLoading}
                        className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {driverActionLoading ? "Assigning..." : "Assign"}
                      </button>
                      <button
                        onClick={() => {
                          setAssigningDriver(null);
                          setSelectedDriverId("");
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAssigningDriver("pickup")}
                    disabled={loadingDrivers}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600"
                  >
                    {loadingDrivers ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Assign Pickup Driver
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Return Driver Slot */}
              <div className={`rounded-lg border p-3 ${canAssignReturnDriver ? "border-slate-200" : "border-slate-100 bg-slate-50"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Return Driver
                  </span>
                  <span className="text-xs text-slate-400">Workshop → Customer</span>
                </div>

                {!canAssignReturnDriver && !booking.returnDriver && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Available after pickup is completed
                  </div>
                )}

                {booking.returnDriver ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {booking.returnDriverName || "Unknown Driver"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {booking.returnDriver.completedAt ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </span>
                          ) : booking.returnDriver.startedAt ? (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Clock className="h-3 w-3" />
                              In Progress
                            </span>
                          ) : booking.returnDriver.acceptedAt ? (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <Check className="h-3 w-3" />
                              Accepted
                            </span>
                          ) : (
                            <span className="text-amber-600">Assigned</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Assigned {formatDateTime(booking.returnDriver.assignedAt)}
                          {booking.returnDriver.completedAt && ` • Completed ${formatDateTime(booking.returnDriver.completedAt)}`}
                        </p>
                      </div>
                    </div>
                    {!booking.returnDriver.startedAt && (
                      <button
                        onClick={() => handleUnassignDriver("return")}
                        disabled={driverActionLoading}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Unassign Driver"
                      >
                        {driverActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                ) : canAssignReturnDriver && (
                  assigningDriver === "return" ? (
                    <div className="space-y-3">
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">Select a driver...</option>
                        {drivers.map((driver) => (
                          <option key={driver._id} value={driver._id}>
                            {driver.firstName} {driver.lastName}
                            {driver.shiftPreference !== "full_day" && ` (${driver.shiftPreference.toUpperCase()})`}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAssignDriver("return")}
                          disabled={!selectedDriverId || driverActionLoading}
                          className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                          {driverActionLoading ? "Assigning..." : "Assign"}
                        </button>
                        <button
                          onClick={() => {
                            setAssigningDriver(null);
                            setSelectedDriverId("");
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAssigningDriver("return")}
                      disabled={loadingDrivers}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 transition hover:border-blue-400 hover:text-blue-600"
                    >
                      {loadingDrivers ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Assign Return Driver
                        </>
                      )}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Signed Forms */}
          {booking.signedForms && booking.signedForms.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                Signed Forms ({booking.signedForms.length})
              </div>
              <div className="mt-3 space-y-2">
                {booking.signedForms.map((form, index) => {
                  const labelMap: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
                    pickup_consent: { label: "Pickup Consent", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
                    return_confirmation: { label: "Return Confirmation", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
                    claim_lodgement: { label: "Claim Lodgement", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
                  };
                  const config = labelMap[form.formType] || { label: form.formType, color: "text-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-200" };
                  return (
                    <div key={index} className={`flex items-center justify-between rounded-lg border ${config.borderColor} ${config.bgColor} px-3 py-2`}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`h-4 w-4 ${config.color}`} />
                        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">
                          {new Date(form.submittedAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <a
                          href={`/api/admin/forms/${form.formId}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition hover:opacity-80 ${config.bgColor} ${config.color} border ${config.borderColor}`}
                          title="Download / Print Form"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              Updates History
            </div>
            <div className="mt-4 space-y-3">
              {booking.updates.length > 0 ? (
                booking.updates.map((update, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {getStageLabel(update.stage)}
                      </p>
                      <p className="text-sm text-slate-600">{update.message}</p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(update.timestamp)} • {update.updatedBy}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No updates yet</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
            <div>
              <p>Created: {formatDate(booking.createdAt)}</p>
            </div>
            <div>
              <p>Updated: {formatDateTime(booking.updatedAt)}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onEdit}
              className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
            >
              Edit Booking
            </button>
            <Link
              href={getTrackingLink(booking)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              View Tracking
            </Link>
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {showEditDetails && (
        <EditBookingDetailsModal
          booking={booking}
          onClose={() => setShowEditDetails(false)}
          onSaved={async (message) => {
            setShowEditDetails(false);
            setFlash(message);
            await refreshBooking();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// EditBookingDetailsModal — post-payment logistics edits via
// POST /api/admin/bookings/{id}/edit. Only rendered while the booking is
// pending/in_progress AND at booking_confirmed / driver_en_route.
// The API emails the customer a summary of the changes automatically.
// ============================================================================

function EditBookingDetailsModal({
  booking,
  onClose,
  onSaved,
}: {
  booking: Booking;
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
}) {
  // yyyy-mm-dd in local time for the date input
  const toYmd = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-CA") : "");

  const [form, setForm] = useState({
    serviceDate: toYmd(booking.serviceDate),
    pickupTimeSlot: booking.pickupTimeSlot || "",
    dropoffTimeSlot: booking.dropoffTimeSlot || "",
    pickupAddress: booking.pickupAddress || "",
    garageName: booking.garageName || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Only send fields that actually changed
    const payload: Record<string, unknown> = {};
    if (form.serviceDate && form.serviceDate !== toYmd(booking.serviceDate)) {
      payload.serviceDate = form.serviceDate;
    }
    if (form.pickupTimeSlot && form.pickupTimeSlot !== (booking.pickupTimeSlot || "")) {
      payload.pickupTimeSlot = form.pickupTimeSlot;
    }
    if (form.dropoffTimeSlot && form.dropoffTimeSlot !== (booking.dropoffTimeSlot || "")) {
      payload.dropoffTimeSlot = form.dropoffTimeSlot;
    }
    if (form.pickupAddress.trim() && form.pickupAddress.trim() !== booking.pickupAddress) {
      payload.pickupAddress = form.pickupAddress.trim();
    }
    if (form.garageName.trim() && form.garageName.trim() !== (booking.garageName || "")) {
      payload.garageName = form.garageName.trim();
    }
    if (Object.keys(payload).length === 0) {
      setError("No changes to apply");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking._id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to update the booking");
        return;
      }
      await onSaved(
        data.message || "Booking updated. The customer has been emailed a summary of the changes."
      );
    } catch {
      setError("Failed to update the booking");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
          <h2 className="text-lg font-semibold text-slate-900">Edit Booking Details</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Service Date</label>
            <input
              type="date"
              value={form.serviceDate}
              onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Slot</label>
              <select
                value={form.pickupTimeSlot}
                onChange={(e) => setForm({ ...form, pickupTimeSlot: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Keep current</option>
                {PICKUP_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Drop-off Slot</label>
              <select
                value={form.dropoffTimeSlot}
                onChange={(e) => setForm({ ...form, dropoffTimeSlot: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Keep current</option>
                {DROPOFF_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Address</label>
            <input
              type="text"
              value={form.pickupAddress}
              onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Service Centre (Garage Name)</label>
            <input
              type="text"
              value={form.garageName}
              onChange={(e) => setForm({ ...form, garageName: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
            The customer automatically receives a &quot;booking updated&quot; email summarising the changes.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditBookingModal({
  booking,
  onSave,
  onClose,
  saving,
}: {
  booking: Booking;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    currentStage: booking.currentStage,
    status: booking.status,
    message: "",
    pickupTime: booking.pickupTime,
    dropoffTime: booking.dropoffTime,
    pickupAddress: booking.pickupAddress,
    vehicleYear: booking.vehicleYear || "",
    vehicleModel: booking.vehicleModel || "",
    allowBackwardsProgression: false,
  });
  const [error, setError] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState<"cancelled" | "completed" | null>(null);

  const currentStageIndex = STAGES.findIndex((s) => s.id === booking.currentStage);
  const newStageIndex = STAGES.findIndex((s) => s.id === formData.currentStage);
  const isBackwardsProgression = newStageIndex < currentStageIndex;
  const newProgress = STAGES[newStageIndex]?.progress || booking.overallProgress;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.status !== booking.status && (formData.status === "cancelled" || formData.status === "completed")) {
      setShowConfirmDialog(formData.status as "cancelled" | "completed");
      return;
    }

    await submitForm();
  };

  const submitForm = async () => {
    try {
      await onSave({
        ...formData,
        currentStage: formData.currentStage !== booking.currentStage ? formData.currentStage : undefined,
        status: formData.status !== booking.status ? formData.status : undefined,
        message: formData.message || undefined,
        pickupTime: formData.pickupTime !== booking.pickupTime ? formData.pickupTime : undefined,
        dropoffTime: formData.dropoffTime !== booking.dropoffTime ? formData.dropoffTime : undefined,
        pickupAddress: formData.pickupAddress !== booking.pickupAddress ? formData.pickupAddress : undefined,
        vehicleYear: formData.vehicleYear !== (booking.vehicleYear || "") ? formData.vehicleYear : undefined,
        vehicleModel: formData.vehicleModel !== (booking.vehicleModel || "") ? formData.vehicleModel : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save booking");
    }
  };

  const handleConfirmedStatusChange = async () => {
    setShowConfirmDialog(null);
    await submitForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
          <h2 className="text-lg font-semibold text-slate-900">Edit Booking</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Current Stage
            </label>
            <select
              value={formData.currentStage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currentStage: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label} ({stage.progress}%)
                </option>
              ))}
            </select>

            {formData.currentStage !== booking.currentStage && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <span>Progress: {booking.overallProgress}%</span>
                  <span>→</span>
                  <span className="font-semibold">{newProgress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${newProgress}%` }}
                  />
                </div>
              </div>
            )}

            {isBackwardsProgression && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Going back to an earlier stage
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      This will move the booking from &quot;{STAGES[currentStageIndex]?.label}&quot; back to &quot;{STAGES[newStageIndex]?.label}&quot;.
                    </p>
                    <label className="mt-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.allowBackwardsProgression}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            allowBackwardsProgression: e.target.checked,
                          })
                        }
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm text-amber-800">
                        I confirm this change
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {formData.status === "cancelled" && formData.status !== booking.status && (
              <p className="mt-2 text-xs text-red-600">
                ⚠️ This will cancel the booking
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Update Message
              <span className="ml-1 font-normal text-slate-400">(shown to customer)</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Optional: Custom message for this update..."
            />
            <p className="mt-1 text-xs text-slate-500">
              Leave empty to use the default message for the selected stage.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pickup Time
            </label>
            <input
              type="text"
              value={formData.pickupTime}
              onChange={(e) =>
                setFormData({ ...formData, pickupTime: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Dropoff Time
            </label>
            <input
              type="text"
              value={formData.dropoffTime}
              onChange={(e) =>
                setFormData({ ...formData, dropoffTime: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pickup Address
            </label>
            <input
              type="text"
              value={formData.pickupAddress}
              onChange={(e) =>
                setFormData({ ...formData, pickupAddress: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Vehicle Details */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Vehicle Year
              </label>
              <input
                type="text"
                value={formData.vehicleYear}
                onChange={(e) =>
                  setFormData({ ...formData, vehicleYear: e.target.value.replace(/\D/g, '').slice(0, 4) })
                }
                maxLength={4}
                placeholder="2020"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Make & Model
              </label>
              <input
                type="text"
                value={formData.vehicleModel}
                onChange={(e) =>
                  setFormData({ ...formData, vehicleModel: e.target.value })
                }
                placeholder="Toyota Camry"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || (isBackwardsProgression && !formData.allowBackwardsProgression)}
              className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Update Booking"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${showConfirmDialog === "cancelled" ? "bg-red-100" : "bg-green-100"}`}>
                <AlertTriangle className={`h-6 w-6 ${showConfirmDialog === "cancelled" ? "text-red-600" : "text-green-600"}`} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {showConfirmDialog === "cancelled" ? "Cancel Booking?" : "Complete Booking?"}
              </h3>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              {showConfirmDialog === "cancelled"
                ? "Are you sure you want to cancel this booking? The customer will be notified."
                : "Are you sure you want to mark this booking as completed? This indicates the service is finished and the car has been returned."}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleConfirmedStatusChange}
                disabled={saving}
                className={`flex-1 rounded-full py-3 text-sm font-semibold text-white shadow-lg ${showConfirmDialog === "cancelled" ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"} disabled:opacity-50`}
              >
                {saving ? "Saving..." : "Yes, Confirm"}
              </button>
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
