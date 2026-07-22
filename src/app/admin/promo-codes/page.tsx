// src/app/admin/promo-codes/page.tsx
// Admin promo-code management: create codes (custom or auto-generated) with a
// per-code % discount, and see status + which booking each was redeemed on.
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Tag,
  Plus,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  Ban,
  RotateCcw,
} from "lucide-react";

type PromoStatus = "active" | "used" | "disabled";

interface PromoRow {
  _id: string;
  code: string;
  percentOff: number;
  status: PromoStatus;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  usedAt: string | null;
  usedByReference: string | null;
  usedByBookingId: string | null;
  discountAmount: number | null;
}

const STATUS_CHIP: Record<PromoStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  used: "bg-slate-100 text-slate-600",
  disabled: "bg-red-50 text-red-700",
};

export default function AdminPromoCodesPage() {
  const [codes, setCodes] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form
  const [customCode, setCustomCode] = useState("");
  const [percentOff, setPercentOff] = useState("10");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/promo-codes");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load promo codes");
      setCodes(data.codes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleCreate = async () => {
    const pct = parseInt(percentOff, 10);
    if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
      setCreateError("Discount must be between 1 and 100");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: customCode.trim() || undefined,
          percentOff: pct,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create code");
      setCustomCode("");
      setNotes("");
      fetchCodes();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create code");
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (id: string, action: "disable" | "activate") => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/admin/promo-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update code");
      fetchCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update code");
    } finally {
      setActioningId(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
          <Tag className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promo Codes</h1>
          <p className="text-sm text-slate-500">
            Single-use percentage discounts off the Drivlet booking fee
          </p>
        </div>
      </div>

      {/* Create card */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Create a code</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Code <span className="font-normal text-slate-400">(leave blank to auto-generate)</span>
            </label>
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME10"
              maxLength={24}
              disabled={creating}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm uppercase text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Discount (%)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={percentOff}
              onChange={(e) => setPercentOff(e.target.value)}
              disabled={creating}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Notes <span className="font-normal text-slate-400">(optional, internal)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. flyer campaign July"
            disabled={creating}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
          />
        </div>
        {createError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {createError}
          </div>
        )}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create code
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="mt-2 text-sm text-slate-500">Loading codes…</p>
          </div>
        ) : codes.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No promo codes yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Create your first code above
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {codes.map((promo) => (
              <li
                key={promo._id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => copyCode(promo.code)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-white transition hover:bg-slate-700"
                      title="Copy code"
                    >
                      {promo.code}
                      {copiedCode === promo.code ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      {promo.percentOff}% off
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_CHIP[promo.status]}`}
                    >
                      {promo.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Created {formatDate(promo.createdAt)}
                    {promo.createdBy && ` by ${promo.createdBy}`}
                    {promo.notes && <span className="text-slate-500"> · {promo.notes}</span>}
                  </p>
                  {promo.status === "used" && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Redeemed{promo.usedAt ? ` ${formatDate(promo.usedAt)}` : ""}
                      {promo.usedByReference && (
                        <>
                          {" "}on booking{" "}
                          <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-600">
                            {promo.usedByReference}
                          </span>
                        </>
                      )}
                      {typeof promo.discountAmount === "number" &&
                        ` · saved $${(promo.discountAmount / 100).toFixed(2)}`}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {promo.status === "active" && (
                    <button
                      onClick={() => handleAction(promo._id, "disable")}
                      disabled={actioningId === promo._id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Disable
                    </button>
                  )}
                  {promo.status === "disabled" && (
                    <button
                      onClick={() => handleAction(promo._id, "activate")}
                      disabled={actioningId === promo._id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Re-activate
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
