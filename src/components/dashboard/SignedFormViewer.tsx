// src/components/dashboard/SignedFormViewer.tsx
// Read-only viewer for a customer's SIGNED handover form (2026-08-08).
// Fetches the stored SignedForm (session-authed, owner-only via the forms
// GET route) and renders its fields + signatures. Customers can only ever
// see forms that exist — there is no blank/unsigned form access here.
"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface SignedFormViewerProps {
  bookingId: string;
  formType: "pickup_consent" | "return_confirmation";
  isOpen: boolean;
  onClose: () => void;
}

interface StoredForm {
  _id: string;
  formType: string;
  formData?: Record<string, unknown>;
  signatures?: { customer?: string; driver?: string };
  submittedAt?: string;
  submittedByName?: string;
}

const TITLES: Record<string, string> = {
  pickup_consent: "Pick-up Condition & Consent",
  return_confirmation: "Return Confirmation & Acceptance",
};

// Present only customer-meaningful fields, in a stable order
const FIELD_LABELS: Array<[string, string]> = [
  ["customerName", "Customer"],
  ["driverName", "Driver"],
  ["odometerReading", "Odometer"],
  ["fuelLevel", "Fuel level"],
  ["existingDamageNotes", "Existing damage noted"],
  ["customerNotes", "Special instructions"],
  ["returnOdometerReading", "Odometer at return"],
  ["newDamageNotes", "Concerns noted at return"],
];

export default function SignedFormViewer({
  bookingId,
  formType,
  isOpen,
  onClose,
}: SignedFormViewerProps) {
  const [form, setForm] = useState<StoredForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/bookings/${bookingId}/forms?formType=${formType}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load form");
        const found = (data.forms || [])[0] as StoredForm | undefined;
        if (!found) throw new Error("Signed form not found");
        if (!cancelled) setForm(found);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load form");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, bookingId, formType]);

  if (!isOpen) return null;

  const fd = (form?.formData || {}) as Record<string, unknown>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {TITLES[formType]}
            </h2>
            {form?.submittedAt && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Signed{" "}
                {new Date(form.submittedAt).toLocaleString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : (
            <>
              <dl className="space-y-2 text-sm">
                {FIELD_LABELS.filter(
                  ([key]) => fd[key] !== undefined && fd[key] !== null && fd[key] !== ""
                ).map(([key, label]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="shrink-0 text-slate-500">{label}</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {String(fd[key])}
                    </dd>
                  </div>
                ))}
              </dl>

              {(form?.signatures?.customer || form?.signatures?.driver) && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                  {form.signatures?.customer && (
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Your signature
                      </p>
                      {/* Signatures are data-URLs stored in MongoDB */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.signatures.customer}
                        alt="Customer signature"
                        className="h-16 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain"
                      />
                    </div>
                  )}
                  {form.signatures?.driver && (
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Driver signature
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.signatures.driver}
                        alt="Driver signature"
                        className="h-16 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              <p className="mt-4 text-[11px] text-slate-400">
                A copy of this form was emailed to you when it was signed.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
