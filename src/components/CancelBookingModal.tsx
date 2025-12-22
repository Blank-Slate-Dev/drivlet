// src/components/CancelBookingModal.tsx
// Modal for confirming booking cancellation with refund information

"use client";

import { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertCircle,
} from "lucide-react";

interface CancellationInfo {
  canCancel: boolean;
  eligible: boolean;
  refund: {
    amount: number;
    amountFormatted: string;
    percentage: number;
  };
  policy: {
    reason: string;
    hoursUntilPickup: number;
    freeUntil?: string;
  };
  booking: {
    _id: string;
    vehicleRegistration: string;
    pickupTime: string;
    status: string;
    paymentAmount?: number;
  };
}

interface CancelBookingModalProps {
  bookingId: string;
  vehicleRego: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelBookingModal({
  bookingId,
  vehicleRego,
  isOpen,
  onClose,
  onSuccess,
}: CancelBookingModalProps) {
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancellationInfo, setCancellationInfo] =
    useState<CancellationInfo | null>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [success, setSuccess] = useState<{
    message: string;
    refundAmount: string;
  } | null>(null);

  // Fetch cancellation eligibility when modal opens
  useEffect(() => {
    if (isOpen && bookingId) {
      fetchCancellationInfo();
    }
    // Reset state when modal closes
    if (!isOpen) {
      setReason("");
      setConfirmed(false);
      setSuccess(null);
      setError("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bookingId]);

  const fetchCancellationInfo = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to check cancellation eligibility");
        return;
      }

      setCancellationInfo(data);
    } catch (err) {
      console.error("Error fetching cancellation info:", err);
      setError("Failed to load cancellation information");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirmed) {
      setError("Please confirm you understand the cancellation policy");
      return;
    }

    setCancelling(true);
    setError("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancellationReason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to cancel booking");
        return;
      }

      setSuccess({
        message: data.message,
        refundAmount: data.refund.amountFormatted,
      });

      // Notify parent after a short delay
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error("Error cancelling booking:", err);
      setError("Failed to cancel booking. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Cancel Booking
                </h2>
                <p className="text-sm text-slate-500">{vehicleRego}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={cancelling}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Loading State */}
            {loading && (
              <div className="py-8 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                <p className="mt-2 text-sm text-slate-500">
                  Checking cancellation eligibility...
                </p>
              </div>
            )}

            {/* Success State */}
            {success && (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Booking Cancelled
                </h3>
                <p className="mt-2 text-sm text-slate-600">{success.message}</p>
                {success.refundAmount !== "$0.00" && (
                  <div className="mt-4 rounded-lg bg-green-50 p-3">
                    <p className="text-sm font-medium text-green-800">
                      Refund: {success.refundAmount}
                    </p>
                    <p className="text-xs text-green-600">
                      Will appear on your card in 5-10 business days
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Cannot Cancel State */}
            {!loading && !success && cancellationInfo && !cancellationInfo.canCancel && (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Cannot Cancel
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {cancellationInfo.policy.reason}
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 w-full rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            )}

            {/* Cancellation Form */}
            {!loading && !success && cancellationInfo?.canCancel && (
              <>
                {/* Refund Information */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        Refund Amount
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {cancellationInfo.refund.amountFormatted}
                      </p>
                      <p className="text-xs text-slate-500">
                        ({cancellationInfo.refund.percentage}% of{" "}
                        {cancellationInfo.booking.paymentAmount
                          ? `$${(cancellationInfo.booking.paymentAmount / 100).toFixed(2)}`
                          : "payment"}
                        )
                      </p>
                    </div>
                  </div>
                </div>

                {/* Policy Explanation */}
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Cancellation Policy
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      {cancellationInfo.policy.reason}
                    </p>
                    {cancellationInfo.policy.freeUntil && (
                      <p className="mt-1 text-xs text-amber-600">
                        Free cancellation until:{" "}
                        {new Date(cancellationInfo.policy.freeUntil).toLocaleString("en-AU", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Optional Reason */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Reason for cancellation (optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Let us know why you're cancelling..."
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                {/* Confirmation Checkbox */}
                <label className="mt-4 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-600">
                    I understand the cancellation policy and confirm I want to
                    cancel this booking.
                  </span>
                </label>

                {/* Error Message */}
                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={cancelling}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling || !confirmed}
                    className="flex-1 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                  >
                    {cancelling ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cancelling...
                      </span>
                    ) : (
                      "Cancel Booking"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CancelBookingModal;
