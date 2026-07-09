// src/app/admin/bookings/page.tsx
// Unified admin pipeline: booking requests (pending → approved → awaiting payment)
// AND paid bookings (all lifecycle stages) in one auto-refreshing, filterable view.
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Search,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Inbox,
  CreditCard,
  Truck,
  Send,
  Eye,
  Car,
  X,
} from "lucide-react";
import { getPickupSlotLabel, getDropoffSlotLabel } from "@/config/timeSlots";
import {
  ViewDetailsModal,
  EditBookingModal,
  STAGES,
  type Booking,
} from "@/components/admin/BookingDetailModals";
import {
  RequestDetailModal,
  StatCard,
  type BookingRequestItem,
} from "@/components/admin/RequestDetailModal";

// ---- Unified row model -----------------------------------------------------

type StatusKey =
  | "needs_review"
  | "awaiting_payment"
  | "active"
  | "completed"
  | "rejected";

type TabKey = "all" | StatusKey;

interface UnifiedRow {
  kind: "request" | "booking";
  id: string;
  reference: string;
  customerName: string;
  email: string;
  rego: string;
  serviceDate?: string;
  pickupSlot?: string;
  dropoffSlot?: string;
  statusKey: StatusKey;
  statusLabel: string;
  stageLabel?: string; // bookings only
  paidAt?: string; // bookings only (= createdAt)
  cancelRequested?: boolean; // bookings only — pending cancellation request
  createdAt: string;
  raw: Booking | BookingRequestItem;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_review", label: "Needs Review" },
  { key: "awaiting_payment", label: "Awaiting Payment" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected / Cancelled" },
];

// Request reference: REQ- + last 8 of _id (requests have no dedicated ref field).
const requestReference = (id: string) => `REQ-${id.slice(-8).toUpperCase()}`;

const stageLabelFor = (stageId: string) =>
  STAGES.find((s) => s.id === stageId)?.label || stageId;

// yyyy-mm-dd in local time, for the service-date filter
const toLocalYmd = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-CA") : "");

function normalizeBooking(b: Booking): UnifiedRow {
  let statusKey: StatusKey;
  let statusLabel: string;
  if (b.status === "cancelled") {
    statusKey = "rejected";
    statusLabel = "Cancelled";
  } else if (b.status === "completed") {
    statusKey = "completed";
    statusLabel = "Completed";
  } else {
    statusKey = "active";
    statusLabel = "Paid";
  }
  return {
    kind: "booking",
    id: b._id,
    reference: b.trackingCode || "—",
    customerName: b.userName,
    email: b.userEmail,
    rego: b.vehicleRegistration,
    serviceDate: b.serviceDate,
    pickupSlot: b.pickupTimeSlot,
    dropoffSlot: b.dropoffTimeSlot,
    statusKey,
    statusLabel,
    stageLabel: stageLabelFor(b.currentStage),
    paidAt: b.createdAt, // bookings only exist after payment → createdAt is the paid time
    cancelRequested: b.cancellationRequest?.status === "pending",
    createdAt: b.createdAt,
    raw: b,
  };
}

function normalizeRequest(r: BookingRequestItem): UnifiedRow {
  let statusKey: StatusKey;
  let statusLabel: string;
  switch (r.status) {
    case "pending_review":
      statusKey = "needs_review";
      statusLabel = "Needs Review";
      break;
    case "approved":
    case "accepted_awaiting_payment":
      statusKey = "awaiting_payment";
      statusLabel = "Awaiting Payment";
      break;
    case "payment_link_sent":
      statusKey = "awaiting_payment";
      statusLabel = "Link Sent";
      break;
    case "declined":
      statusKey = "rejected";
      statusLabel = "Rejected";
      break;
    default: // expired
      statusKey = "rejected";
      statusLabel = "Expired";
  }
  return {
    kind: "request",
    id: r._id,
    reference: requestReference(r._id),
    customerName: r.userName,
    email: r.userEmail,
    rego: r.vehicleRegistration,
    serviceDate: r.serviceDate,
    pickupSlot: r.pickupTimeSlot,
    dropoffSlot: r.dropoffTimeSlot,
    statusKey,
    statusLabel,
    createdAt: r.createdAt,
    raw: r,
  };
}

const STATUS_BADGE: Record<StatusKey, string> = {
  needs_review: "bg-amber-100 text-amber-700",
  awaiting_payment: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-600",
  rejected: "bg-red-100 text-red-700",
};

const formatPaidAt = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const compactSlots = (row: UnifiedRow) => {
  const parts: string[] = [];
  if (row.pickupSlot) parts.push(getPickupSlotLabel(row.pickupSlot));
  if (row.dropoffSlot) parts.push(getDropoffSlotLabel(row.dropoffSlot));
  return parts.join(" / ");
};

const serviceDateShort = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—";

// ---- Page ------------------------------------------------------------------

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<BookingRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  // Server-side search term (debounced) — threaded through BOTH list fetches.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [dateFilter, setDateFilter] = useState("");

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequestItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingLink, setSendingLink] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  // ONE fetch for the whole page: bookings + all open requests, in parallel, uncached.
  // The single search input is threaded through BOTH endpoints (server-side matching
  // covers trackingCode/rego/name/email/exact _id — more than the client-side filter can).
  const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const q = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      // When searching, widen requests to ALL statuses so declined/expired matches surface too.
      const reqStatus = debouncedSearch ? "all" : "all_open";
      const [bRes, rRes] = await Promise.all([
        fetch(`/api/admin/bookings?limit=500${q}`, { cache: "no-store" }),
        fetch(`/api/admin/booking-requests?status=${reqStatus}&limit=500${q}`, { cache: "no-store" }),
      ]);
      if (!bRes.ok) throw new Error("Failed to fetch bookings");
      const bData = await bRes.json();
      const rData = rRes.ok ? await rRes.json() : { requests: [] };
      setBookings(bData.bookings || []);
      setRequests(rData.requests || []);
      setLastUpdated(new Date());
      setError("");
    } catch {
      setError("Failed to load the bookings pipeline");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  // Debounce keystrokes → server search (client filter below gives instant feedback).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Single refresh loop for the ENTIRE page: 30s interval + visibility + focus.
  // Re-runs when the debounced search changes (fetchAll identity changes) — silent
  // after the first load so typing a search doesn't flash the whole list.
  const didInitialLoad = useRef(false);
  useEffect(() => {
    fetchAll({ silent: didInitialLoad.current });
    didInitialLoad.current = true;
    const interval = setInterval(() => fetchAll({ silent: true }), 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchAll({ silent: true }); };
    const onFocus = () => fetchAll({ silent: true });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchAll]);

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // Deep link: /admin/bookings?view=<bookingId> opens the booking modal (dashboard links).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewId = new URLSearchParams(window.location.search).get("view");
    if (!viewId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/bookings/${viewId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) { setSelectedBooking(data); setShowEditModal(false); }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Normalise + sort newest-first by createdAt.
  const rows = useMemo(() => {
    const merged = [
      ...bookings.map(normalizeBooking),
      ...requests.map(normalizeRequest),
    ];
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged;
  }, [bookings, requests]);

  const stats = useMemo(() => ({
    needs_review: rows.filter((r) => r.statusKey === "needs_review").length,
    awaiting_payment: rows.filter((r) => r.statusKey === "awaiting_payment").length,
    active: rows.filter((r) => r.statusKey === "active").length,
    completed: rows.filter((r) => r.statusKey === "completed").length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (tab !== "all" && row.statusKey !== tab) return false;
      if (dateFilter && toLocalYmd(row.serviceDate) !== dateFilter) return false;
      if (q) {
        // Includes row.id so exact-_id server matches aren't hidden client-side.
        const hay = `${row.reference} ${row.customerName} ${row.rego} ${row.email} ${row.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, tab, dateFilter, search]);

  const hasActiveFilters = tab !== "all" || !!dateFilter || !!search.trim();
  const clearFilters = () => { setTab("all"); setDateFilter(""); setSearch(""); };

  const handleSendPaymentLink = async (requestId: string) => {
    setSendingLink(requestId);
    try {
      const res = await fetch(`/api/admin/booking-requests/${requestId}/send-payment-link`, { method: "POST" });
      if (res.ok) {
        setSuccessMessage("Payment link sent!");
        await fetchAll({ silent: true });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to send payment link");
      }
    } catch {
      setError("Failed to send payment link");
    } finally {
      setSendingLink(null);
    }
  };

  const handleSaveBooking = async (data: Record<string, unknown>) => {
    if (!selectedBooking) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/bookings/${selectedBooking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save");
      }
      const updated = await response.json();
      setBookings((prev) => prev.map((b) => (b._id === selectedBooking._id ? updated : b)));
      setSelectedBooking(updated);
      setShowEditModal(false);
      setSuccessMessage("Booking updated successfully!");
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const getTrackingLink = (b: Booking) =>
    b.trackingCode
      ? `/track?code=${encodeURIComponent(b.trackingCode)}`
      : `/track?email=${encodeURIComponent(b.userEmail)}&rego=${encodeURIComponent(b.vehicleRegistration)}`;

  const copyToClipboard = async (text: string, label = "Text") => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessMessage(`${label} copied to clipboard`);
    } catch {
      setSuccessMessage("Failed to copy to clipboard");
    }
  };

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

  const openRow = (row: UnifiedRow) => {
    if (row.kind === "request") setSelectedRequest(row.raw as BookingRequestItem);
    else { setSelectedBooking(row.raw as Booking); setShowEditModal(false); }
  };

  // The single contextual action per row.
  const RowAction = ({ row }: { row: UnifiedRow }) => {
    if (row.kind === "request") {
      const st = (row.raw as BookingRequestItem).status;
      if (st === "approved" || st === "accepted_awaiting_payment") {
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleSendPaymentLink(row.id); }}
            disabled={sendingLink === row.id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {sendingLink === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Send Link
          </button>
        );
      }
      if (st === "payment_link_sent") {
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleSendPaymentLink(row.id); }}
            disabled={sendingLink === row.id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {sendingLink === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Resend
          </button>
        );
      }
      if (st === "pending_review") {
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedRequest(row.raw as BookingRequestItem); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-400"
          >
            <Eye className="h-3 w-3" /> Review
          </button>
        );
      }
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedRequest(row.raw as BookingRequestItem); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Eye className="h-3 w-3" /> View
        </button>
      );
    }
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setSelectedBooking(row.raw as Booking); setShowEditModal(false); }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
      >
        <Eye className="h-3 w-3" /> View
      </button>
    );
  };

  const StatusCell = ({ row }: { row: UnifiedRow }) => (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-tight ${STATUS_BADGE[row.statusKey]}`}>
        {row.statusKey === "active" && <CheckCircle2 className="h-3 w-3" />}
        {row.statusLabel}
      </span>
      {row.cancelRequested && (
        <span className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold leading-tight text-amber-700">
          <AlertTriangle className="h-3 w-3" />
          Cancel requested
        </span>
      )}
      {row.kind === "booking" && row.statusKey === "active" && row.stageLabel && (
        <span className="text-[11px] text-slate-500">{row.stageLabel}</span>
      )}
      {row.kind === "booking" && row.paidAt && row.statusKey !== "rejected" && (
        <span className="text-xs text-slate-400">{formatPaidAt(row.paidAt)}</span>
      )}
    </div>
  );

  const RefBadge = ({ value }: { value: string }) => (
    <span className="inline-block w-fit whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
      {value}
    </span>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {successMessage && (
          <div className="fixed top-20 right-4 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Bookings</h1>
            <p className="mt-1 text-slate-600">Requests and bookings across the full pipeline</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-slate-400">
                Updated {lastUpdated.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={() => fetchAll()}
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              <RefreshCw className={`h-4 w-4 transition-transform group-hover:rotate-180 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stat cards (click to filter) */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Inbox} iconBg="bg-amber-100" iconColor="text-amber-600" value={stats.needs_review} label="Needs Review" active={tab === "needs_review"} onClick={() => setTab(tab === "needs_review" ? "all" : "needs_review")} />
          <StatCard icon={CreditCard} iconBg="bg-blue-100" iconColor="text-blue-600" value={stats.awaiting_payment} label="Awaiting Payment" active={tab === "awaiting_payment"} onClick={() => setTab(tab === "awaiting_payment" ? "all" : "awaiting_payment")} />
          <StatCard icon={Truck} iconBg="bg-emerald-100" iconColor="text-emerald-600" value={stats.active} label="Active" active={tab === "active"} onClick={() => setTab(tab === "active" ? "all" : "active")} />
          <StatCard icon={CheckCircle2} iconBg="bg-slate-100" iconColor="text-slate-600" value={stats.completed} label="Completed" active={tab === "completed"} onClick={() => setTab(tab === "completed" ? "all" : "completed")} />
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference, name, rego, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-400">Service date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          {/* Pill tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  tab === t.key ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
            <button onClick={() => fetchAll()} className="mt-3 text-sm font-medium text-red-600 hover:text-red-700">
              Try again
            </button>
          </div>
        )}

        {/* List */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
              <p className="mt-3 text-sm text-slate-500">Loading pipeline…</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Car className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">
                {hasActiveFilters ? "No results" : "Nothing in the pipeline yet"}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
                  <X className="h-3.5 w-3.5" /> Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-4">Reference</th>
                      <th className="px-4 py-4">Customer</th>
                      <th className="px-4 py-4">Vehicle</th>
                      <th className="px-4 py-4">Service date</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row) => (
                      <tr key={`${row.kind}-${row.id}`} onClick={() => openRow(row)} className="cursor-pointer transition hover:bg-slate-50">
                        <td className="px-4 py-4"><RefBadge value={row.reference} /></td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-900">{row.customerName}</p>
                          <p className="text-xs text-slate-500">{row.email}</p>
                        </td>
                        <td className="px-4 py-4"><span className="font-mono text-sm font-semibold text-slate-900">{row.rego}</span></td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-slate-900">{serviceDateShort(row.serviceDate)}</p>
                          {compactSlots(row) && <p className="text-xs text-slate-500">{compactSlots(row)}</p>}
                        </td>
                        <td className="px-4 py-4"><StatusCell row={row} /></td>
                        <td className="px-4 py-4 text-right"><RowAction row={row} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredRows.map((row) => (
                  <div key={`${row.kind}-${row.id}`} onClick={() => openRow(row)} className="cursor-pointer p-4 transition hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <RefBadge value={row.reference} />
                        <p className="mt-1 font-medium text-slate-900">{row.customerName}</p>
                        <p className="truncate text-xs text-slate-500">{row.email}</p>
                      </div>
                      <StatusCell row={row} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-600">
                        <span className="font-mono font-semibold text-slate-900">{row.rego}</span>
                        <span className="mx-2 text-slate-300">·</span>
                        <span>{serviceDateShort(row.serviceDate)}</span>
                        {compactSlots(row) && <span className="text-slate-400"> · {compactSlots(row)}</span>}
                      </div>
                      <RowAction row={row} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-400">
                  Showing {filteredRows.length} of {rows.length}
                  {hasActiveFilters && <> · <button onClick={clearFilters} className="font-medium text-emerald-600 hover:text-emerald-700">clear filters</button></>}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Booking modals (reused verbatim) */}
        {selectedBooking && !showEditModal && (
          <ViewDetailsModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onEdit={() => setShowEditModal(true)}
            getStageLabel={stageLabelFor}
            formatDateTime={formatDateTime}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            getTrackingLink={getTrackingLink}
            copyToClipboard={copyToClipboard}
            onBookingUpdated={(updated) => {
              setBookings((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
              setSelectedBooking(updated);
            }}
          />
        )}
        {selectedBooking && showEditModal && (
          <EditBookingModal
            booking={selectedBooking}
            onSave={handleSaveBooking}
            onClose={() => setShowEditModal(false)}
            saving={saving}
          />
        )}

        {/* Request modal (reused verbatim from the retired requests page) */}
        {selectedRequest && (
          <RequestDetailModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onRefresh={() => { fetchAll({ silent: true }); setSelectedRequest(null); }}
            onRequestUpdated={(updated) => {
              // Edit-in-place: keep the modal open, sync the row list underneath.
              setRequests((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
              setSelectedRequest(updated);
            }}
          />
        )}
      </div>
    </div>
  );
}
