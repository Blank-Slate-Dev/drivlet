// src/components/CancelBookingModal.tsx
// Customer cancellation-request modal. Customers don't cancel directly:
// more than the cutoff (3h) before pickup they send a request the drivlet
// team reviews; inside the cutoff they're asked to call support.
// Refunds are always processed manually by the team.

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Phone,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Eligibility {
  canRequest: boolean;
  reason: string;
  hoursUntilPickup: number | null;
  supportPhone: string;
  cutoffHours: number;
  existingRequest: "pending" | "approved" | "denied" | null;
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
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const fetchEligibility = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel-request`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to check cancellation eligibility");
        return;
      }
      setEligibility(data);
    } catch {
      setError("Failed to load cancellation information");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchEligibility();
    }
    if (!isOpen) {
      setReason("");
      setSuccess(null);
      setError("");
    }
  }, [isOpen, bookingId, fetchEligibility]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to send cancellation request");
        return;
      }
      setSuccess(data.message);
      setTimeout(() => {
        onSuccess();
      }, 2500);
    } catch {
      setError("Failed to send cancellation request. Please try again.");
    } finally {
      setSubmitting(false);
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
                  Request Cancellation
                </h2>
                <p className="text-sm text-slate-500">{vehicleRego}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {loading && (
              <div className="py-8 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                <p className="mt-2 text-sm text-slate-500">
                  Checking your booking...
                </p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Request Sent
                </h3>
                <p className="mt-2 text-sm text-slate-600">{success}</p>
              </div>
            )}

            {/* Cannot request — call support / already handled */}
            {!loading && !success && eligibility && !eligibility.canRequest && (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  {eligibility.existingRequest === "pending" ? (
                    <Clock className="h-8 w-8 text-amber-600" />
                  ) : (
                    <XCircle className="h-8 w-8 text-amber-600" />
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {eligibility.existingRequest === "pending"
                    ? "Request Under Review"
                    : "Please Call Us"}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{eligibility.reason}</p>
                {eligibility.existingRequest !== "pending" && (
                  <a
                    href={`tel:${eligibility.supportPhone.replace(/\s/g, "")}`}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    <Phone className="h-4 w-4" />
                    Call {eligibility.supportPhone}
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="mt-4 w-full rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            )}

            {/* Request form */}
            {!loading && !success && eligibility?.canRequest && (
              <>
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      How cancellation works
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Your request goes to our team for review — we&apos;ll confirm by
                      email. Cancellations can be requested up to {eligibility.cutoffHours}{" "}
                      hours before pickup. If you&apos;ve paid, any refund is processed by
                      our team after the cancellation is confirmed.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Reason for cancelling (optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Let us know why you're cancelling..."
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      "Request Cancellation"
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Load error with no eligibility data */}
            {!loading && !success && !eligibility && error && (
              <div className="py-6 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <button
                  onClick={fetchEligibility}
                  className="mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CancelBookingModal;
