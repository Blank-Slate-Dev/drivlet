// src/app/admin/forms/page.tsx
// Signed Forms archive — permanent admin access to every consent/return/claim
// form ever signed, independent of booking status. Built for dispute and
// emergency retrieval: search by tracking code, rego, or customer.
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileSignature,
  Search,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

type FormType = "pickup_consent" | "return_confirmation" | "claim_lodgement";

interface FormRow {
  _id: string;
  formType: FormType;
  formVersion: string;
  submittedByName: string;
  submittedBy: string;
  submittedAt: string;
  customerRefused: boolean;
}

// Grouped by booking (2026-08-09): a booking's pickup and return forms
// travel together, sorted by the group's most recent activity.
interface BookingGroup {
  bookingId: string | null;
  trackingCode: string | null;
  vehicleRegistration: string | null;
  vehicleState: string | null;
  customerName: string | null;
  bookingStatus: string | null;
  lastActivity: string;
  hasDispute: boolean;
  forms: FormRow[];
}

const TYPE_META: Record<FormType, { label: string; badge: string }> = {
  pickup_consent: {
    label: "Pick-up Consent",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  return_confirmation: {
    label: "Return Confirmation",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
  },
  claim_lodgement: {
    label: "Claim Lodgement",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const TYPE_FILTERS: Array<{ key: FormType | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "pickup_consent", label: "Pick-up Consent" },
  { key: "return_confirmation", label: "Return Confirmation" },
  { key: "claim_lodgement", label: "Claims" },
];

export default function AdminFormsPage() {
  const [groups, setGroups] = useState<BookingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState<FormType | "all">("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("formType", typeFilter);
      params.set("page", String(page));
      params.set("limit", "25");

      const res = await fetch(`/api/admin/forms?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch forms");
      setGroups(data.groups || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch forms");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, page]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <FileSignature className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Signed Forms</h1>
            <p className="text-sm text-slate-500">
              Permanent archive of all consent, return, and claim forms
            </p>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={submitSearch} className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tracking code, rego, or customer…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setTypeFilter(f.key);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                typeFilter === f.key
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Grouped list: one card per booking, its forms nested inside */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-2 text-sm text-slate-500">Loading forms…</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <FileSignature className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">
            No forms found
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {search
              ? "Try a different tracking code, rego, or customer name"
              : "Signed forms will appear here as drivers and customers complete them"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.bookingId || group.forms[0]?._id}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                group.hasDispute ? "border-red-200" : "border-slate-200"
              }`}
            >
              {/* Booking header */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                {group.vehicleRegistration && (
                  <span className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide text-slate-800">
                    {group.vehicleRegistration}
                    {group.vehicleState ? ` · ${group.vehicleState}` : ""}
                  </span>
                )}
                <span className="truncate text-sm font-medium text-slate-900">
                  {group.customerName || group.forms[0]?.submittedByName || "Unknown customer"}
                </span>
                {group.trackingCode && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                    {group.trackingCode}
                  </span>
                )}
                {group.hasDispute && (
                  <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    Dispute
                  </span>
                )}
                <span className="ml-auto text-[11px] text-slate-400">
                  Last activity {formatDate(group.lastActivity)}
                </span>
              </div>

              {/* Nested forms (chronological: pickup naturally first) */}
              <ul className="divide-y divide-slate-100">
                {group.forms.map((form) => {
                  const meta = TYPE_META[form.formType];
                  return (
                    <li
                      key={form._id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}
                          >
                            {meta.label}
                          </span>
                          {form.customerRefused && (
                            <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              Refused to sign · dispute
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Signed {formatDate(form.submittedAt)} &middot; {form.formVersion}
                          {form.submittedByName && (
                            <> &middot; by {form.submittedByName}</>
                          )}
                        </p>
                      </div>
                      <a
                        href={`/api/admin/forms/${form._id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && groups.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {total} booking{total === 1 ? "" : "s"} with forms
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
