// src/app/admin/inquiries/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  RefreshCw,
  X,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
} from "lucide-react";

interface Inquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: "new" | "in-progress" | "resolved";
  adminNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  new: number;
  "in-progress": number;
  resolved: number;
  total: number;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/inquiries?${params}`);
      if (!response.ok) throw new Error("Failed to fetch inquiries");

      const data = await response.json();

      // Filter by search term client-side
      let filteredInquiries = data.inquiries;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredInquiries = data.inquiries.filter((i: Inquiry) =>
          i.name.toLowerCase().includes(searchLower) ||
          i.email.toLowerCase().includes(searchLower) ||
          i.message.toLowerCase().includes(searchLower) ||
          (i.phone && i.phone.includes(search))
        );
      }

      setInquiries(filteredInquiries);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
      setStats(data.stats);
      setError("");
    } catch {
      setError("Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-700";
      case "in-progress":
        return "bg-amber-100 text-amber-700";
      case "resolved":
        return "bg-green-100 text-green-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new":
        return "New";
      case "in-progress":
        return "In Progress";
      case "resolved":
        return "Resolved";
      default:
        return status;
    }
  };

  const handleStatusChange = async (inquiryId: string, newStatus: string) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const updated = await response.json();
      setInquiries((prev) =>
        prev.map((i) => (i._id === inquiryId ? updated : i))
      );
      if (selectedInquiry?._id === inquiryId) {
        setSelectedInquiry(updated);
      }
      setSuccessMessage("Status updated successfully!");
      fetchInquiries(); // Refresh stats
    } catch {
      alert("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async (inquiryId: string, notes: string) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: notes }),
      });

      if (!response.ok) throw new Error("Failed to save notes");

      const updated = await response.json();
      setInquiries((prev) =>
        prev.map((i) => (i._id === inquiryId ? updated : i))
      );
      if (selectedInquiry?._id === inquiryId) {
        setSelectedInquiry(updated);
      }
      setSuccessMessage("Notes saved successfully!");
    } catch {
      alert("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Customer Inquiries</h1>
            <p className="mt-1 text-slate-600">
              {total} total inquiries • Manage contact form submissions
            </p>
          </div>
          <button
            onClick={fetchInquiries}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 transition-transform group-hover:rotate-180 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <Inbox className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.new}</p>
                  <p className="text-sm text-slate-500">New</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats["in-progress"]}</p>
                  <p className="text-sm text-slate-500">In Progress</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.resolved}</p>
                  <p className="text-sm text-slate-500">Resolved</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <MessageSquare className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-sm text-slate-500">Total</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, message..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex gap-2">
            {["all", "new", "in-progress", "resolved"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  statusFilter === status
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status === "all" ? "All" : getStatusLabel(status)}
                {stats && status !== "all" && (
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                    {stats[status as keyof Omit<Stats, "total">]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={fetchInquiries}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Inquiries Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
              <p className="mt-3 text-sm text-slate-500">Loading inquiries...</p>
            </div>
          ) : inquiries.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <MessageSquare className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">No inquiries found</p>
              <p className="mt-1 text-xs text-slate-400">
                {statusFilter !== "all" ? "Try changing the filter" : "Inquiries will appear here when customers submit the contact form"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Contact</th>
                    <th className="px-4 py-4">Message</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inquiries.map((inquiry) => (
                    <tr
                      key={inquiry._id}
                      className="transition hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedInquiry(inquiry)}
                    >
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-900">
                          {formatDate(inquiry.createdAt)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(inquiry.createdAt).toLocaleTimeString("en-AU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900">{inquiry.name}</p>
                        <p className="text-xs text-slate-500">{inquiry.email}</p>
                        {inquiry.phone && (
                          <p className="text-xs text-slate-400">{inquiry.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-slate-700 line-clamp-2 max-w-xs">
                          {inquiry.message}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={inquiry.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChange(inquiry._id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={saving}
                          className={`rounded-lg border-0 px-2.5 py-1.5 text-xs font-medium ${getStatusColor(inquiry.status)} focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
                        >
                          <option value="new">New</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInquiry(inquiry);
                          }}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-4">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages} ({total} inquiries)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedInquiry && (
          <InquiryDetailModal
            inquiry={selectedInquiry}
            onClose={() => setSelectedInquiry(null)}
            onStatusChange={handleStatusChange}
            onSaveNotes={handleSaveNotes}
            saving={saving}
            formatDateTime={formatDateTime}
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
          />
        )}
      </div>
    </div>
  );
}

function InquiryDetailModal({
  inquiry,
  onClose,
  onStatusChange,
  onSaveNotes,
  saving,
  formatDateTime,
  getStatusColor,
  getStatusLabel,
}: {
  inquiry: Inquiry;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  saving: boolean;
  formatDateTime: (date: string) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}) {
  const [notes, setNotes] = useState(inquiry.adminNotes || "");
  const [notesChanged, setNotesChanged] = useState(false);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setNotesChanged(value !== (inquiry.adminNotes || ""));
  };

  const handleSaveNotes = async () => {
    await onSaveNotes(inquiry._id, notes);
    setNotesChanged(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Inquiry Details</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(inquiry.status)}`}>
              {getStatusLabel(inquiry.status)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* Contact Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <User className="h-4 w-4 text-emerald-600" />
              Contact Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-900">{inquiry.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <a href={`mailto:${inquiry.email}`} className="text-emerald-600 hover:underline">
                  {inquiry.email}
                </a>
              </div>
              {inquiry.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${inquiry.phone}`} className="text-emerald-600 hover:underline">
                    {inquiry.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              Message
            </h3>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{inquiry.message}</p>
          </div>

          {/* Timestamps */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Timeline
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Submitted</span>
                <span className="text-slate-900">{formatDateTime(inquiry.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Updated</span>
                <span className="text-slate-900">{formatDateTime(inquiry.updatedAt)}</span>
              </div>
              {inquiry.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Resolved</span>
                  <span className="text-green-600">{formatDateTime(inquiry.resolvedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Change */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Update Status</h3>
            <div className="flex gap-2">
              {["new", "in-progress", "resolved"].map((status) => (
                <button
                  key={status}
                  onClick={() => onStatusChange(inquiry._id, status)}
                  disabled={saving || inquiry.status === status}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
                    inquiry.status === status
                      ? getStatusColor(status)
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  } disabled:opacity-50`}
                >
                  {saving && inquiry.status !== status ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    getStatusLabel(status)
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Admin Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add internal notes about this inquiry..."
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {notesChanged && (
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Notes"
                )}
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
