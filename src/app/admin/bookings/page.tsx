// src/app/admin/bookings/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Car,
  Clock,
  MapPin,
  Wrench,
  User,
  Calendar,
  MessageSquare,
} from "lucide-react";

type JourneyStage =
  | "Booking Confirmed"
  | "Driver En Route To You"
  | "Car Picked Up"
  | "At Garage"
  | "Service In Progress"
  | "Driver En Route Back"
  | "Delivered";

interface Booking {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  vehicle: {
    make: string;
    model: string;
    year?: string;
    color?: string;
    plate: string;
    state: string;
  };
  serviceType: string;
  pickupAddress: string;
  pickupDate: string;
  pickupTimeStart: string;
  pickupTimeEnd: string;
  dropoffTimeStart: string;
  dropoffTimeEnd: string;
  garageName: string;
  garageAddress: string;
  currentStage: JourneyStage;
  journeyEvents: Array<{
    stage: JourneyStage;
    timestamp: string | null;
    completed: boolean;
    notes?: string;
  }>;
  overallProgress: number;
  status: string;
  statusMessage: string;
  etaToGarage?: string;
  etaReturn?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const JOURNEY_STAGES: JourneyStage[] = [
  "Booking Confirmed",
  "Driver En Route To You",
  "Car Picked Up",
  "At Garage",
  "Service In Progress",
  "Driver En Route Back",
  "Delivered",
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(stageFilter !== "all" && { stage: stageFilter }),
      });

      const response = await fetch(`/api/admin/bookings?${params}`);
      if (!response.ok) throw new Error("Failed to fetch bookings");

      const data = await response.json();
      setBookings(data.bookings);
      setTotalPages(data.pagination.totalPages);
      setError("");
    } catch {
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, stageFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "active":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const handleUpdateProgress = async (
    bookingId: string,
    newStage: JourneyStage
  ) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStage: newStage }),
      });

      if (!response.ok) throw new Error("Failed to update");

      const updated = await response.json();
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? updated : b))
      );
      if (selectedBooking?._id === bookingId) {
        setSelectedBooking(updated);
      }
    } catch {
      alert("Failed to update booking progress");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBooking = async (data: Partial<Booking>) => {
    if (!selectedBooking) return;

    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/bookings/${selectedBooking._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) throw new Error("Failed to save");

      const updated = await response.json();
      setBookings((prev) =>
        prev.map((b) => (b._id === selectedBooking._id ? updated : b))
      );
      setSelectedBooking(updated);
      setShowEditModal(false);
    } catch {
      alert("Failed to save booking");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Bookings</h1>
          <p className="mt-1 text-sm text-slate-600">
            View and manage all customer bookings
          </p>
        </div>
        <button
          onClick={fetchBookings}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, plate..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-8 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
            className="appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Stages</option>
            {JOURNEY_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Bookings Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
            <p className="mt-2 text-sm text-slate-500">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center">
            <Car className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Pickup</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {booking.userName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {booking.userEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900">
                        {booking.vehicle.make} {booking.vehicle.model}
                      </p>
                      <p className="text-xs text-slate-500">
                        {booking.vehicle.plate}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {booking.serviceType}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900">
                        {formatDate(booking.pickupDate)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {booking.pickupTimeStart} - {booking.pickupTimeEnd}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={booking.currentStage}
                        onChange={(e) =>
                          handleUpdateProgress(
                            booking._id,
                            e.target.value as JourneyStage
                          )
                        }
                        disabled={saving}
                        className="rounded border border-slate-200 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                      >
                        {JOURNEY_STAGES.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${booking.overallProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {booking.overallProgress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowEditModal(true);
                          }}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {selectedBooking && !showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Booking Details
              </h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Customer Info */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <User className="h-4 w-4" />
                  Customer
                </div>
                <div className="mt-2">
                  <p className="font-medium text-slate-900">
                    {selectedBooking.userName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedBooking.userEmail}
                  </p>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Car className="h-4 w-4" />
                  Vehicle
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Make/Model</p>
                    <p className="font-medium text-slate-900">
                      {selectedBooking.vehicle.make}{" "}
                      {selectedBooking.vehicle.model}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Plate</p>
                    <p className="font-medium text-slate-900">
                      {selectedBooking.vehicle.plate} (
                      {selectedBooking.vehicle.state})
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Info */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Wrench className="h-4 w-4" />
                  Service Details
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Service Type</p>
                    <p className="font-medium text-slate-900">
                      {selectedBooking.serviceType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Garage</p>
                    <p className="font-medium text-slate-900">
                      {selectedBooking.garageName || "TBD"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Calendar className="h-4 w-4" />
                  Schedule
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Pickup</p>
                    <p className="font-medium text-slate-900">
                      {formatDate(selectedBooking.pickupDate)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {selectedBooking.pickupTimeStart} -{" "}
                      {selectedBooking.pickupTimeEnd}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Address</p>
                    <p className="text-sm text-slate-900">
                      {selectedBooking.pickupAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Clock className="h-4 w-4" />
                  Progress ({selectedBooking.overallProgress}%)
                </div>
                <div className="mt-4 space-y-3">
                  {selectedBooking.journeyEvents.map((event, index) => (
                    <div key={event.stage} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
                          event.completed
                            ? "bg-emerald-500 text-white"
                            : "border-2 border-slate-300 bg-white"
                        }`}
                      >
                        {event.completed && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${event.completed ? "text-slate-900" : "text-slate-400"}`}
                        >
                          {event.stage}
                        </p>
                        {event.timestamp && (
                          <p className="text-xs text-slate-500">
                            {formatDateTime(event.timestamp)}
                          </p>
                        )}
                        {event.notes && (
                          <p className="mt-1 text-xs text-slate-600">
                            {event.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Message */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MessageSquare className="h-4 w-4" />
                  Status Message (shown to customer)
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {selectedBooking.statusMessage}
                </p>
              </div>

              {/* Admin Notes */}
              {selectedBooking.adminNotes && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-medium text-amber-700">
                    Admin Notes
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    {selectedBooking.adminNotes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Edit Booking
                </button>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedBooking && showEditModal && (
        <EditBookingModal
          booking={selectedBooking}
          onSave={handleSaveBooking}
          onClose={() => setShowEditModal(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

// Edit Modal Component
function EditBookingModal({
  booking,
  onSave,
  onClose,
  saving,
}: {
  booking: Booking;
  onSave: (data: Partial<Booking>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    currentStage: booking.currentStage,
    statusMessage: booking.statusMessage,
    adminNotes: booking.adminNotes || "",
    garageName: booking.garageName,
    garageAddress: booking.garageAddress,
    status: booking.status,
    etaReturn: booking.etaReturn
      ? new Date(booking.etaReturn).toISOString().slice(0, 16)
      : "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      etaReturn: formData.etaReturn || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Edit Booking</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Current Stage */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Current Stage
            </label>
            <select
              value={formData.currentStage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currentStage: e.target.value as JourneyStage,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {JOURNEY_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Status Message */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Status Message (shown to customer)
            </label>
            <textarea
              value={formData.statusMessage}
              onChange={(e) =>
                setFormData({ ...formData, statusMessage: e.target.value })
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="What's happening with this booking..."
            />
          </div>

          {/* Garage Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Garage Name
            </label>
            <input
              type="text"
              value={formData.garageName}
              onChange={(e) =>
                setFormData({ ...formData, garageName: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Garage Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Garage Address
            </label>
            <input
              type="text"
              value={formData.garageAddress}
              onChange={(e) =>
                setFormData({ ...formData, garageAddress: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* ETA Return */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Estimated Return Time
            </label>
            <input
              type="datetime-local"
              value={formData.etaReturn}
              onChange={(e) =>
                setFormData({ ...formData, etaReturn: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Admin Notes (internal only)
            </label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) =>
                setFormData({ ...formData, adminNotes: e.target.value })
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Internal notes..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
