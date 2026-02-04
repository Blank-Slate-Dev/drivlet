// src/app/admin/testimonials/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Star,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Sparkles,
  Quote,
} from "lucide-react";

interface Testimonial {
  _id: string;
  customerName: string;
  customerLocation?: string;
  rating: number;
  review: string;
  vehicleType?: string;
  serviceType?: string;
  isApproved: boolean;
  isDisplayed: boolean;
  source: "user_submitted" | "admin_created";
  submittedAt: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  displayed: number;
}

type ModalMode = "add" | "edit";

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    customerName: "",
    customerLocation: "",
    rating: 5,
    review: "",
    vehicleType: "",
    serviceType: "",
  });

  const fetchTestimonials = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/testimonials?${params}`);
      if (!response.ok) throw new Error("Failed to fetch testimonials");

      const data = await response.json();
      setTestimonials(data.testimonials);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
      setStats(data.stats);
      setError("");
    } catch {
      setError("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleApprove = async (id: string, isApproved: boolean) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved }),
      });
      if (!response.ok) throw new Error("Failed to update");
      setSuccessMessage(isApproved ? "Testimonial approved!" : "Approval removed");
      fetchTestimonials();
    } catch {
      alert("Failed to update testimonial");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDisplay = async (id: string, isDisplayed: boolean) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisplayed }),
      });
      if (!response.ok) throw new Error("Failed to update");
      setSuccessMessage(isDisplayed ? "Now displayed on homepage" : "Hidden from homepage");
      fetchTestimonials();
    } catch {
      alert("Failed to update testimonial");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;

    try {
      setDeleting(id);
      const response = await fetch(`/api/admin/testimonials/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      setSuccessMessage("Testimonial deleted");
      fetchTestimonials();
    } catch {
      alert("Failed to delete testimonial");
    } finally {
      setDeleting(null);
    }
  };

  const handleSeed = async () => {
    if (!confirm("Seed 8 test testimonials? This only works if no testimonials exist.")) return;

    try {
      setSeeding(true);
      const response = await fetch("/api/admin/testimonials/seed", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to seed testimonials");
        return;
      }

      setSuccessMessage(`Seeded ${data.count} testimonials!`);
      fetchTestimonials();
    } catch {
      alert("Failed to seed testimonials");
    } finally {
      setSeeding(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      customerName: "",
      customerLocation: "",
      rating: 5,
      review: "",
      vehicleType: "",
      serviceType: "",
    });
    setModalMode("add");
    setEditingTestimonial(null);
    setShowModal(true);
  };

  const openEditModal = (testimonial: Testimonial) => {
    setFormData({
      customerName: testimonial.customerName,
      customerLocation: testimonial.customerLocation || "",
      rating: testimonial.rating,
      review: testimonial.review,
      vehicleType: testimonial.vehicleType || "",
      serviceType: testimonial.serviceType || "",
    });
    setModalMode("edit");
    setEditingTestimonial(testimonial);
    setShowModal(true);
  };

  const handleSubmitForm = async () => {
    if (!formData.customerName.trim() || !formData.review.trim()) {
      alert("Name and review are required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        customerName: formData.customerName.trim(),
        customerLocation: formData.customerLocation.trim() || undefined,
        rating: formData.rating,
        review: formData.review.trim(),
        vehicleType: formData.vehicleType.trim() || undefined,
        serviceType: formData.serviceType.trim() || undefined,
      };

      let response;
      if (modalMode === "edit" && editingTestimonial) {
        response = await fetch(`/api/admin/testimonials/${editingTestimonial._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/admin/testimonials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to save testimonial");
        return;
      }

      setSuccessMessage(modalMode === "edit" ? "Testimonial updated!" : "Testimonial created!");
      setShowModal(false);
      fetchTestimonials();
    } catch {
      alert("Failed to save testimonial");
    } finally {
      setSaving(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "fill-slate-200 text-slate-200"
            }`}
          />
        ))}
      </div>
    );
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
            <h1 className="text-3xl font-bold text-slate-900">Testimonials</h1>
            <p className="mt-1 text-slate-600">
              {stats?.total || 0} total testimonials &bull; Manage customer reviews
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:opacity-50"
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Seed Data
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Add Testimonial
            </button>
            <button
              onClick={fetchTestimonials}
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              <RefreshCw className={`h-4 w-4 transition-transform group-hover:rotate-180 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Quote className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-sm text-slate-500">Total</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                  <p className="text-sm text-slate-500">Pending</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.approved}</p>
                  <p className="text-sm text-slate-500">Approved</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.displayed}</p>
                  <p className="text-sm text-slate-500">Displayed</p>
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
              placeholder="Search by customer name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "displayed", label: "Displayed" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setStatusFilter(filter.value);
                  setPage(1);
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  statusFilter === filter.value
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
                {stats && filter.value !== "all" && (
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                    {filter.value === "pending"
                      ? stats.pending
                      : filter.value === "approved"
                      ? stats.approved
                      : stats.displayed}
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
              onClick={fetchTestimonials}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Testimonials Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
              <p className="mt-3 text-sm text-slate-500">Loading testimonials...</p>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Star className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">No testimonials found</p>
              <p className="mt-1 text-xs text-slate-400">
                {statusFilter !== "all"
                  ? "Try changing the filter"
                  : "Add testimonials or seed test data to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Rating</th>
                    <th className="px-4 py-4">Review</th>
                    <th className="px-4 py-4">Source</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testimonials.map((testimonial) => (
                    <tr key={testimonial._id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900">{testimonial.customerName}</p>
                        {testimonial.customerLocation && (
                          <p className="text-xs text-slate-500">{testimonial.customerLocation}</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {testimonial.vehicleType && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              {testimonial.vehicleType}
                            </span>
                          )}
                          {testimonial.serviceType && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
                              {testimonial.serviceType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {renderStars(testimonial.rating)}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-slate-700 line-clamp-2 max-w-xs">
                          {testimonial.review}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            testimonial.source === "admin_created"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {testimonial.source === "admin_created" ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                              testimonial.isApproved
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {testimonial.isApproved ? "Approved" : "Pending"}
                          </span>
                          {testimonial.isApproved && (
                            <span
                              className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                testimonial.isDisplayed
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {testimonial.isDisplayed ? (
                                <>
                                  <Eye className="h-3 w-3" />
                                  Visible
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-3 w-3" />
                                  Hidden
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-slate-900">{formatDate(testimonial.createdAt)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          {!testimonial.isApproved && (
                            <button
                              onClick={() => handleApprove(testimonial._id, true)}
                              disabled={saving}
                              title="Approve"
                              className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {testimonial.isApproved && (
                            <button
                              onClick={() => handleToggleDisplay(testimonial._id, !testimonial.isDisplayed)}
                              disabled={saving}
                              title={testimonial.isDisplayed ? "Hide from homepage" : "Show on homepage"}
                              className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
                            >
                              {testimonial.isDisplayed ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(testimonial)}
                            title="Edit"
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(testimonial._id)}
                            disabled={deleting === testimonial._id}
                            title="Delete"
                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {deleting === testimonial._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
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
                Page {page} of {totalPages} ({total} testimonials)
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

        {/* Add/Edit Modal */}
        {showModal && (
          <TestimonialModal
            mode={modalMode}
            formData={formData}
            setFormData={setFormData}
            onClose={() => setShowModal(false)}
            onSubmit={handleSubmitForm}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

function TestimonialModal({
  mode,
  formData,
  setFormData,
  onClose,
  onSubmit,
  saving,
}: {
  mode: ModalMode;
  formData: {
    customerName: string;
    customerLocation: string;
    rating: number;
    review: string;
    vehicleType: string;
    serviceType: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      customerName: string;
      customerLocation: string;
      rating: number;
      review: string;
      vehicleType: string;
      serviceType: string;
    }>
  >;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === "edit" ? "Edit Testimonial" : "Add Testimonial"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Customer Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
              placeholder="John Smith"
              maxLength={100}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Customer Location */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Location
            </label>
            <input
              type="text"
              value={formData.customerLocation}
              onChange={(e) => setFormData((prev) => ({ ...prev, customerLocation: e.target.value }))}
              placeholder="Newcastle, NSW"
              maxLength={100}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
                  className="p-1 transition"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= formData.rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-slate-200 text-slate-200 hover:fill-amber-200 hover:text-amber-200"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Review <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.review}
              onChange={(e) => setFormData((prev) => ({ ...prev, review: e.target.value }))}
              placeholder="Write the customer's review..."
              rows={4}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="mt-1 text-xs text-slate-400">{formData.review.length}/500</p>
          </div>

          {/* Vehicle Type & Service Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Vehicle Type
              </label>
              <input
                type="text"
                value={formData.vehicleType}
                onChange={(e) => setFormData((prev) => ({ ...prev, vehicleType: e.target.value }))}
                placeholder="Toyota Camry"
                maxLength={50}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Service Type
              </label>
              <input
                type="text"
                value={formData.serviceType}
                onChange={(e) => setFormData((prev) => ({ ...prev, serviceType: e.target.value }))}
                placeholder="Vehicle Transport"
                maxLength={100}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={saving || !formData.customerName.trim() || !formData.review.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : mode === "edit" ? (
                "Update Testimonial"
              ) : (
                "Add Testimonial"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
