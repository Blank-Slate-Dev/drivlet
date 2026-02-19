// src/app/admin/incidents/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Search,
  Loader2,
  RefreshCw,
  ChevronRight,
  Shield,
  Eye,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────

interface Incident {
  _id: string;
  incidentType: string;
  severity: string;
  title: string;
  status: string;
  exceptionState: string;
  occurredAt: string;
  createdAt: string;
  driverId?: { firstName: string; lastName: string };
  bookingId?: { vehicleRegistration: string; userName: string };
}

interface Stats {
  openCount: number;
  criticalHighCount: number;
  investigatingCount: number;
  resolvedThisWeek: number;
}

// ─── Config ────────────────────────────────────────────

const SEVERITY_BADGE: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  investigating: "bg-purple-100 text-purple-800",
  awaiting_response: "bg-yellow-100 text-yellow-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-100 text-slate-700",
};

const TYPE_LABELS: Record<string, string> = {
  road_accident: "Road Accident",
  damage_dispute: "Vehicle Damage",
  breakdown: "Breakdown",
  customer_unavailable: "Customer Unavailable",
  workshop_refusal: "Workshop Issue",
  keys_incident: "Keys Incident",
  safety_risk: "Safety Risk",
  privacy_incident: "Privacy Incident",
  other: "Other",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "awaiting_response", label: "Awaiting Response" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// ─── Component ─────────────────────────────────────────

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Stats>({
    openCount: 0,
    criticalHighCount: 0,
    investigatingCount: 0,
    resolvedThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/incidents/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/incidents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, severityFilter, search]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Incidents</h1>
            <p className="mt-1 text-sm text-slate-500">
              {total} total incident{total !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => {
              fetchStats();
              fetchIncidents();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="text-2xl font-bold text-blue-700">{stats.openCount}</div>
            <div className="text-xs text-blue-600">Open Incidents</div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
            <div className="text-2xl font-bold text-red-700">{stats.criticalHighCount}</div>
            <div className="text-xs text-red-600">Critical / High</div>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
            <div className="text-2xl font-bold text-purple-700">{stats.investigatingCount}</div>
            <div className="text-xs text-purple-600">Investigating</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="text-2xl font-bold text-emerald-700">{stats.resolvedThisWeek}</div>
            <div className="text-xs text-emerald-600">Resolved This Week</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search incidents..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Status: {opt.label}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Severity: {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Incidents List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : incidents.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Booking
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidents.map((incident) => (
                    <tr
                      key={incident._id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            SEVERITY_BADGE[incident.severity] || SEVERITY_BADGE.low
                          }`}
                        >
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {TYPE_LABELS[incident.incidentType] || incident.incidentType}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900 line-clamp-1">
                          {incident.title}
                        </span>
                        {(incident.exceptionState === "hold" || incident.exceptionState === "stop") && (
                          <span
                            className={`ml-1 inline-block rounded px-1 py-0.5 text-[9px] font-bold uppercase ${
                              incident.exceptionState === "stop"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {incident.exceptionState}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {incident.driverId
                          ? `${incident.driverId.firstName} ${incident.driverId.lastName}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {incident.bookingId ? (
                          <span className="font-mono text-xs text-slate-600 uppercase">
                            {incident.bookingId.vehicleRegistration}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(incident.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            STATUS_BADGE[incident.status] || STATUS_BADGE.open
                          }`}
                        >
                          {incident.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/incidents/${incident._id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-500"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
            <Shield className="mx-auto h-8 w-8 text-slate-200 mb-2" />
            <p className="text-sm text-slate-500">No incidents found</p>
            <p className="text-xs text-slate-400 mt-1">
              Incidents reported by drivers will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
