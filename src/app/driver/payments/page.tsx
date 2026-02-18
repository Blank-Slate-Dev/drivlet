// src/app/driver/payments/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
} from "lucide-react";

interface EarningsData {
  totalEarnings: number;
  totalJobs: number;
  pendingEarnings: number;
  stats: {
    today: { jobs: number; earnings: number };
    week: { jobs: number; earnings: number };
    fortnight: { jobs: number; earnings: number };
  };
  earnings: {
    _id: string;
    vehicleRegistration: string;
    garageName?: string;
    payout: number;
    completedAt: string;
  }[];
}

interface Dispute {
  _id: string;
  type: string;
  status: string;
  description: string;
  expectedAmount?: number;
  actualAmount?: number;
  adminResponse?: string;
  bookingId?: {
    vehicleRegistration: string;
    garageName?: string;
  };
  createdAt: string;
  resolvedAt?: string;
}

const DISPUTE_TYPES = [
  { value: "missing_payment", label: "Missing Payment" },
  { value: "incorrect_amount", label: "Incorrect Amount" },
  { value: "late_payment", label: "Late Payment" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  open: { label: "Open", color: "text-amber-600 bg-amber-50", icon: AlertCircle },
  under_review: {
    label: "Under Review",
    color: "text-blue-600 bg-blue-50",
    icon: Clock,
  },
  resolved: {
    label: "Resolved",
    color: "text-emerald-600 bg-emerald-50",
    icon: CheckCircle2,
  },
  dismissed: {
    label: "Dismissed",
    color: "text-slate-600 bg-slate-100",
    icon: XCircle,
  },
};

export default function DriverPaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [disputesLoading, setDisputesLoading] = useState(true);

  // Dispute form state
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState("missing_payment");
  const [formDescription, setFormDescription] = useState("");
  const [formExpected, setFormExpected] = useState("");
  const [formActual, setFormActual] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Auth guard
  useEffect(() => {
    if (status === "authenticated" && !session?.user?.isApproved) {
      router.push("/driver/pending");
    }
    if (
      status === "authenticated" &&
      session?.user?.onboardingStatus !== "active"
    ) {
      router.push("/driver/onboarding");
    }
  }, [session, status, router]);

  // Fetch earnings
  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    try {
      const res = await fetch("/api/driver/earnings?period=fortnight");
      if (res.ok) {
        const data = await res.json();
        setEarningsData(data);
      }
    } catch {
      // Silently fail
    } finally {
      setEarningsLoading(false);
    }
  }, []);

  // Fetch disputes
  const fetchDisputes = useCallback(async () => {
    setDisputesLoading(true);
    try {
      const res = await fetch("/api/driver/disputes");
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes);
      }
    } catch {
      // Silently fail
    } finally {
      setDisputesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchEarnings();
      fetchDisputes();
    }
  }, [status, fetchEarnings, fetchDisputes]);

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formDescription.trim()) {
      setFormError("Please describe the issue");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/driver/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          description: formDescription.trim(),
          expectedAmount: formExpected ? parseFloat(formExpected) : undefined,
          actualAmount: formActual ? parseFloat(formActual) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit dispute");
      }

      setFormSuccess("Dispute submitted successfully");
      setFormDescription("");
      setFormExpected("");
      setFormActual("");
      setFormType("missing_payment");
      fetchDisputes();

      // Clear success after 3s
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setFormSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-52px)] flex-col items-center px-4 py-6 sm:px-6">
      <div className="fixed inset-0 bg-gradient-to-b from-emerald-50 via-white to-slate-50 -z-10" />

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-800">Payments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your earnings and report payment issues
          </p>
        </div>

        {/* ═══ SECTION 1: Payment Summary Cards ═══ */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {earningsLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse"
                >
                  <div className="h-6 w-12 bg-slate-100 rounded" />
                  <div className="h-3 w-16 bg-slate-100 rounded mt-2" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-lg font-bold text-slate-900">
                  ${earningsData?.stats.today.earnings ?? 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">Today</div>
                <div className="text-[10px] text-slate-400">
                  {earningsData?.stats.today.jobs ?? 0} jobs
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-lg font-bold text-slate-900">
                  ${earningsData?.stats.week.earnings ?? 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">This Week</div>
                <div className="text-[10px] text-slate-400">
                  {earningsData?.stats.week.jobs ?? 0} jobs
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="text-lg font-bold text-emerald-700">
                  ${earningsData?.stats.fortnight.earnings ?? 0}
                </div>
                <div className="text-xs text-emerald-600 mt-1">Fortnightly</div>
                <div className="text-[10px] text-emerald-500">
                  {earningsData?.stats.fortnight.jobs ?? 0} jobs
                </div>
              </div>
            </>
          )}
        </div>

        {/* ═══ SECTION 2: Payment History ═══ */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-800">
                Payment History
              </span>
            </div>
            <span className="text-xs text-slate-400">Last 14 days</span>
          </div>

          {earningsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            </div>
          ) : earningsData && earningsData.earnings.length > 0 ? (
            <div>
              {earningsData.earnings.slice(0, 10).map((txn, idx) => (
                <div
                  key={txn._id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    idx < Math.min(earningsData.earnings.length, 10) - 1
                      ? "border-b border-slate-50"
                      : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">
                      {txn.vehicleRegistration}
                      {txn.garageName && (
                        <span className="text-slate-400">
                          {" "}
                          &middot; {txn.garageName}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2 text-right">
                    <span className="text-sm font-medium text-emerald-600">
                      ${txn.payout}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(txn.completedAt)}
                    </span>
                  </div>
                </div>
              ))}
              {earningsData.pendingEarnings > 0 && (
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    ${earningsData.pendingEarnings} pending from in-progress jobs
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">No payments yet</p>
            </div>
          )}
        </div>

        {/* ═══ SECTION 3: Report a Payment Issue ═══ */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden mb-6">
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-slate-800">
                Report a Payment Issue
              </span>
            </div>
            {formOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {formOpen && (
            <form
              onSubmit={handleSubmitDispute}
              className="border-t border-slate-100 px-4 py-4 space-y-4"
            >
              {/* Type select */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Issue Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {DISPUTE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the payment issue..."
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
                <div className="text-right text-[10px] text-slate-400 mt-0.5">
                  {formDescription.length}/1000
                </div>
              </div>

              {/* Amount fields (for incorrect_amount type) */}
              {formType === "incorrect_amount" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Expected ($)
                    </label>
                    <input
                      type="number"
                      value={formExpected}
                      onChange={(e) => setFormExpected(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Received ($)
                    </label>
                    <input
                      type="number"
                      value={formActual}
                      onChange={(e) => setFormActual(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Error/Success */}
              {formError && (
                <p className="text-xs text-red-600">{formError}</p>
              )}
              {formSuccess && (
                <p className="text-xs text-emerald-600">{formSuccess}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={formSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50 active:scale-95"
              >
                {formSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Dispute
              </button>
            </form>
          )}
        </div>

        {/* ═══ SECTION 4: My Disputes ═══ */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">
              My Disputes
            </span>
          </div>

          {disputesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            </div>
          ) : disputes.length > 0 ? (
            <div>
              {disputes.map((dispute, idx) => {
                const cfg = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.open;
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={dispute._id}
                    className={`px-4 py-3 ${
                      idx < disputes.length - 1
                        ? "border-b border-slate-50"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {DISPUTE_TYPES.find((t) => t.value === dispute.type)
                              ?.label || dispute.type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2">
                          {dispute.description}
                        </p>
                        {dispute.adminResponse && (
                          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                            <p className="text-[10px] font-medium text-slate-500 mb-0.5">
                              Admin Response
                            </p>
                            <p className="text-xs text-slate-600">
                              {dispute.adminResponse}
                            </p>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatDate(dispute.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-6 w-6 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No disputes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
