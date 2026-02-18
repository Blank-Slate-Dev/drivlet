// src/app/admin/payment-disputes/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
  RefreshCw,
} from "lucide-react";

interface Dispute {
  _id: string;
  type: string;
  status: string;
  description: string;
  expectedAmount?: number;
  actualAmount?: number;
  adminResponse?: string;
  driverId?: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  bookingId?: {
    vehicleRegistration: string;
    garageName?: string;
    userName?: string;
  };
  resolvedBy?: {
    username: string;
  };
  createdAt: string;
  resolvedAt?: string;
}

interface StatsData {
  open: number;
  under_review: number;
  resolved: number;
  dismissed: number;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under Review" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  open: {
    label: "Open",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    icon: AlertCircle,
  },
  under_review: {
    label: "Under Review",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: Clock,
  },
  resolved: {
    label: "Resolved",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
  },
  dismissed: {
    label: "Dismissed",
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200",
    icon: XCircle,
  },
};

const TYPE_LABELS: Record<string, string> = {
  missing_payment: "Missing Payment",
  incorrect_amount: "Incorrect Amount",
  late_payment: "Late Payment",
  other: "Other",
};

export default function AdminPaymentDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<StatsData>({
    open: 0,
    under_review: 0,
    resolved: 0,
    dismissed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDisputes = useCallback(async () => {
    try {
      const statusParam = activeTab === "all" ? "" : `&status=${activeTab}`;
      const res = await fetch(
        `/api/admin/payment-disputes?limit=50${statusParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes);
        setStats(data.stats);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchDisputes();
  }, [fetchDisputes]);

  const handleAction = async (
    disputeId: string,
    action: "review" | "resolve" | "dismiss"
  ) => {
    if (
      (action === "resolve" || action === "dismiss") &&
      !adminResponse.trim()
    ) {
      alert("Please provide a response before " + action + "ing.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/payment-disputes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disputeId,
          action,
          adminResponse: adminResponse.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update dispute");
        return;
      }

      setAdminResponse("");
      setExpandedId(null);
      fetchDisputes();
    } catch {
      alert("Something went wrong");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Payment Disputes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review and resolve driver payment issues
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchDisputes();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="text-2xl font-bold text-amber-700">
              {stats.open}
            </div>
            <div className="text-xs text-amber-600">Open</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="text-2xl font-bold text-blue-700">
              {stats.under_review}
            </div>
            <div className="text-xs text-blue-600">Under Review</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="text-2xl font-bold text-emerald-700">
              {stats.resolved}
            </div>
            <div className="text-xs text-emerald-600">Resolved</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-bold text-slate-600">
              {stats.dismissed}
            </div>
            <div className="text-xs text-slate-500">Dismissed</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-px">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.value
                  ? "border-b-2 border-emerald-600 text-emerald-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.value !== "all" && stats[tab.value as keyof StatsData] > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-bold text-slate-600">
                  {stats[tab.value as keyof StatsData]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Disputes List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : disputes.length > 0 ? (
          <div className="space-y-3">
            {disputes.map((dispute) => {
              const cfg =
                STATUS_CONFIG[dispute.status] || STATUS_CONFIG.open;
              const StatusIcon = cfg.icon;
              const isExpanded = expandedId === dispute._id;

              return (
                <div
                  key={dispute._id}
                  className={`rounded-xl border bg-white overflow-hidden transition ${
                    isExpanded ? "border-slate-300 shadow-sm" : "border-slate-200"
                  }`}
                >
                  {/* Dispute Header */}
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded ? null : dispute._id);
                      setAdminResponse(dispute.adminResponse || "");
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
                  >
                    <StatusIcon className={`h-5 w-5 flex-shrink-0 ${cfg.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900">
                          {dispute.driverId
                            ? `${dispute.driverId.firstName} ${dispute.driverId.lastName}`
                            : "Unknown Driver"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.bgColor} ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {TYPE_LABELS[dispute.type] || dispute.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {dispute.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatDate(dispute.createdAt)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 py-4 space-y-4">
                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-xs text-slate-400">Driver</span>
                          <p className="text-slate-700">
                            {dispute.driverId
                              ? `${dispute.driverId.firstName} ${dispute.driverId.lastName}`
                              : "Unknown"}
                          </p>
                          {dispute.driverId?.phone && (
                            <p className="text-xs text-slate-400">
                              {dispute.driverId.phone}
                            </p>
                          )}
                        </div>
                        {dispute.bookingId && (
                          <div>
                            <span className="text-xs text-slate-400">
                              Booking
                            </span>
                            <p className="text-slate-700 font-mono text-xs">
                              {dispute.bookingId.vehicleRegistration}
                            </p>
                            {dispute.bookingId.garageName && (
                              <p className="text-xs text-slate-400">
                                {dispute.bookingId.garageName}
                              </p>
                            )}
                          </div>
                        )}
                        {dispute.expectedAmount !== undefined && (
                          <div>
                            <span className="text-xs text-slate-400">
                              Expected
                            </span>
                            <p className="text-slate-700">
                              ${dispute.expectedAmount}
                            </p>
                          </div>
                        )}
                        {dispute.actualAmount !== undefined && (
                          <div>
                            <span className="text-xs text-slate-400">
                              Actual
                            </span>
                            <p className="text-slate-700">
                              ${dispute.actualAmount}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Full Description */}
                      <div>
                        <span className="text-xs text-slate-400">
                          Description
                        </span>
                        <p className="text-sm text-slate-700 mt-1">
                          {dispute.description}
                        </p>
                      </div>

                      {/* Resolved info */}
                      {dispute.resolvedAt && (
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <p className="text-[10px] text-slate-400">
                            {dispute.status === "resolved"
                              ? "Resolved"
                              : "Dismissed"}{" "}
                            on {formatDate(dispute.resolvedAt)}
                            {dispute.resolvedBy &&
                              ` by ${dispute.resolvedBy.username}`}
                          </p>
                        </div>
                      )}

                      {/* Admin Response + Actions (for open/under_review) */}
                      {["open", "under_review"].includes(dispute.status) && (
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Admin Response
                            </label>
                            <textarea
                              value={adminResponse}
                              onChange={(e) => setAdminResponse(e.target.value)}
                              placeholder="Write your response to the driver..."
                              rows={3}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {dispute.status === "open" && (
                              <button
                                onClick={() =>
                                  handleAction(dispute._id, "review")
                                }
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                Mark Under Review
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleAction(dispute._id, "resolve")
                              }
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                            >
                              {actionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Resolve
                            </button>
                            <button
                              onClick={() =>
                                handleAction(dispute._id, "dismiss")
                              }
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Show admin response for resolved/dismissed */}
                      {["resolved", "dismissed"].includes(dispute.status) &&
                        dispute.adminResponse && (
                          <div>
                            <span className="text-xs text-slate-400">
                              Admin Response
                            </span>
                            <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2">
                              <p className="text-sm text-slate-700">
                                {dispute.adminResponse}
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-slate-200 mb-2" />
            <p className="text-sm text-slate-500">
              No disputes
              {activeTab !== "all" &&
                ` with status "${STATUS_TABS.find((t) => t.value === activeTab)?.label}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
