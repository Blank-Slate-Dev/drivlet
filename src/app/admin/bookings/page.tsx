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
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  Building,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { SERVICE_CATEGORIES, getCategoryById, getTotalSelectedCount } from "@/constants/serviceCategories";

const STAGES = [
  { id: "booking_confirmed", label: "Booking Confirmed", progress: 14 },
  { id: "driver_en_route", label: "Driver En Route", progress: 28 },
  { id: "car_picked_up", label: "Car Picked Up", progress: 42 },
  { id: "at_garage", label: "At Garage", progress: 57 },
  { id: "service_in_progress", label: "Service In Progress", progress: 72 },
  { id: "driver_returning", label: "Driver Returning", progress: 86 },
  { id: "delivered", label: "Delivered", progress: 100 },
];

interface Update {
  stage: string;
  timestamp: string;
  message: string;
  updatedBy: string;
}

interface SelectedService {
  category: string;
  services: string[];
}

interface Booking {
  _id: string;
  userId: string | null;
  userEmail: string;
  userName: string;
  isGuest: boolean;
  guestPhone?: string;
  vehicleRegistration: string;
  vehicleState: string;
  serviceType: string;
  pickupAddress: string;
  pickupTime: string;
  dropoffTime: string;
  hasExistingBooking: boolean;
  garageName?: string;
  existingBookingRef?: string;
  existingBookingNotes?: string;
  paymentStatus?: string;
  paymentId?: string;
  paymentAmount?: number;
  transmissionType?: 'automatic' | 'manual';
  isManualTransmission?: boolean;
  selectedServices?: SelectedService[];
  primaryServiceCategory?: string | null;
  serviceNotes?: string;
  currentStage: string;
  overallProgress: number;
  status: string;
  updates: Update[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
      
      // Filter by user type client-side (API doesn't support this filter)
      let filteredBookings = data.bookings;
      if (userTypeFilter === "guest") {
        filteredBookings = data.bookings.filter((b: Booking) => b.isGuest);
      } else if (userTypeFilter === "registered") {
        filteredBookings = data.bookings.filter((b: Booking) => !b.isGuest);
      }

      setBookings(filteredBookings);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
      setError("");
    } catch {
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, stageFilter, userTypeFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(cents / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "in_progress":
        return "bg-emerald-100 text-emerald-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "failed":
        return "bg-red-100 text-red-700";
      case "refunded":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStageLabel = (stageId: string) => {
    const stage = STAGES.find((s) => s.id === stageId);
    return stage?.label || stageId;
  };

  const getStageIndex = (stageId: string) => {
    return STAGES.findIndex((s) => s.id === stageId);
  };

  const handleQuickStageUpdate = async (bookingId: string, newStage: string) => {
    const booking = bookings.find((b) => b._id === bookingId);
    if (!booking) return;

    const currentIndex = getStageIndex(booking.currentStage);
    const newIndex = getStageIndex(newStage);

    if (newIndex < currentIndex) {
      alert("Cannot move to an earlier stage from the table. Use the Edit modal to override this.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStage: newStage }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }

      const updated = await response.json();
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? updated : b))
      );
      if (selectedBooking?._id === bookingId) {
        setSelectedBooking(updated);
      }
      setSuccessMessage("Progress updated successfully!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update booking progress");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBooking = async (data: Record<string, unknown>) => {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save");
      }

      const updated = await response.json();
      setBookings((prev) =>
        prev.map((b) => (b._id === selectedBooking._id ? updated : b))
      );
      setSelectedBooking(updated);
      setShowEditModal(false);
      setSuccessMessage("Booking updated successfully!");
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Generate tracking link for a booking
  const getTrackingLink = (booking: Booking) => {
    return `/track?email=${encodeURIComponent(booking.userEmail)}&rego=${encodeURIComponent(booking.vehicleRegistration)}`;
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

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Manage Bookings</h1>
            <p className="mt-1 text-slate-600">
              {total} total bookings • View and manage all customer bookings
            </p>
          </div>
          <button
            onClick={fetchBookings}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 transition-transform group-hover:rotate-180 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, registration..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-8 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
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
              className="appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Stages</option>
              {STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
            <select
              value={userTypeFilter}
              onChange={(e) => {
                setUserTypeFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Users</option>
              <option value="registered">Registered</option>
              <option value="guest">Guests</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={fetchBookings}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
              <p className="mt-3 text-sm text-slate-500">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Car className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">No bookings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Vehicle</th>
                    <th className="px-4 py-4">Service</th>
                    <th className="px-4 py-4">Pickup</th>
                    <th className="px-4 py-4">Stage</th>
                    <th className="px-4 py-4">Payment</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((booking) => (
                    <tr key={booking._id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">
                            {booking.userName}
                          </p>
                          {booking.isGuest && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              Guest
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {booking.userEmail}
                        </p>
                        {booking.guestPhone && (
                          <p className="text-xs text-slate-400">
                            {booking.guestPhone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">
                            {booking.vehicleRegistration}
                          </p>
                          {booking.isManualTransmission && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700" title="Manual transmission - requires manual-capable driver">
                              Manual
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {booking.vehicleState}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-slate-700">
                          {booking.serviceType}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {booking.hasExistingBooking && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                              <Building className="h-3 w-3" />
                              {booking.garageName}
                            </span>
                          )}
                          {booking.selectedServices && booking.selectedServices.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              <Wrench className="h-3 w-3" />
                              {booking.selectedServices.reduce((acc, s) => acc + s.services.length, 0)} services
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-slate-900">
                          {booking.pickupTime}
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-[150px]">
                          {booking.pickupAddress}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={booking.currentStage}
                          onChange={(e) =>
                            handleQuickStageUpdate(booking._id, e.target.value)
                          }
                          disabled={saving || booking.status === "cancelled" || booking.status === "completed"}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        >
                          {STAGES.map((stage) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}
                          >
                            {booking.paymentStatus || "pending"}
                          </span>
                          {booking.paymentAmount && (
                            <span className="text-xs text-slate-500">
                              {formatCurrency(booking.paymentAmount)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}
                        >
                          {booking.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowEditModal(true);
                            }}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <Link
                            href={getTrackingLink(booking)}
                            target="_blank"
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                            title="View Tracking Page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
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
                Page {page} of {totalPages} ({total} bookings)
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

        {selectedBooking && !showEditModal && (
          <ViewDetailsModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onEdit={() => setShowEditModal(true)}
            getStageLabel={getStageLabel}
            formatDateTime={formatDateTime}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            getTrackingLink={getTrackingLink}
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
      </div>
    </div>
  );
}

function ViewDetailsModal({
  booking,
  onClose,
  onEdit,
  getStageLabel,
  formatDateTime,
  formatDate,
  formatCurrency,
  getTrackingLink,
}: {
  booking: Booking;
  onClose: () => void;
  onEdit: () => void;
  getStageLabel: (id: string) => string;
  formatDateTime: (date: string) => string;
  formatDate: (date: string) => string;
  formatCurrency: (cents: number) => string;
  getTrackingLink: (booking: Booking) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Booking Details
            </h2>
            {booking.isGuest && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                Guest
              </span>
            )}
            {booking.hasExistingBooking && (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                Existing Booking
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Booking ID</p>
            <p className="font-mono text-sm text-slate-900">{booking._id}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <User className="h-4 w-4 text-emerald-600" />
              Customer
              {booking.isGuest && (
                <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  Guest Checkout
                </span>
              )}
            </div>
            <div className="mt-3">
              <p className="font-medium text-slate-900">{booking.userName}</p>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                <Mail className="h-3.5 w-3.5" />
                {booking.userEmail}
              </div>
              {booking.guestPhone && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                  <Phone className="h-3.5 w-3.5" />
                  {booking.guestPhone}
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Payment
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium mt-1 ${
                  booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                  booking.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {booking.paymentStatus || 'pending'}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500">Amount</p>
                <p className="font-medium text-slate-900">
                  {booking.paymentAmount ? formatCurrency(booking.paymentAmount) : '—'}
                </p>
              </div>
              {booking.paymentId && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Payment ID</p>
                  <p className="font-mono text-xs text-slate-600 break-all">
                    {booking.paymentId}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Car className="h-4 w-4 text-emerald-600" />
              Vehicle
              {booking.isManualTransmission && (
                <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Manual Transmission
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Registration</p>
                <p className="font-medium text-slate-900">
                  {booking.vehicleRegistration}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">State</p>
                <p className="font-medium text-slate-900">
                  {booking.vehicleState}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Transmission</p>
                <p className={`font-medium ${booking.isManualTransmission ? 'text-amber-600' : 'text-slate-900'}`}>
                  {booking.transmissionType === 'manual' ? 'Manual' : 'Automatic'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Wrench className="h-4 w-4 text-emerald-600" />
              Service Details
            </div>
            <div className="mt-3">
              <p className="text-xs text-slate-500">Service Type</p>
              <p className="font-medium text-slate-900">{booking.serviceType}</p>
            </div>
            {booking.primaryServiceCategory && (
              <div className="mt-3">
                <p className="text-xs text-slate-500">Primary Category</p>
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {getCategoryById(booking.primaryServiceCategory)?.name || booking.primaryServiceCategory}
                </span>
              </div>
            )}
          </div>

          {/* Selected Services */}
          {booking.selectedServices && booking.selectedServices.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <Wrench className="h-4 w-4" />
                Services Requested ({booking.selectedServices.reduce((acc, s) => acc + s.services.length, 0)})
              </div>
              <div className="mt-3 space-y-2">
                {booking.selectedServices.map((sel) => {
                  const cat = getCategoryById(sel.category);
                  return (
                    <div key={sel.category}>
                      <p className="text-xs font-medium text-emerald-800">{cat?.name || sel.category}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {sel.services.map((service) => (
                          <span
                            key={service}
                            className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {booking.serviceNotes && (
                <div className="mt-3 border-t border-emerald-200 pt-3">
                  <p className="text-xs text-emerald-600">Service Notes:</p>
                  <p className="mt-1 text-sm text-emerald-800">{booking.serviceNotes}</p>
                </div>
              )}
            </div>
          )}

          {booking.hasExistingBooking && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <Building className="h-4 w-4" />
                Existing Garage Booking
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs text-blue-600">Garage Name</p>
                  <p className="font-medium text-blue-900">{booking.garageName}</p>
                </div>
                {booking.existingBookingRef && (
                  <div>
                    <p className="text-xs text-blue-600">Booking Reference</p>
                    <p className="font-medium text-blue-900">{booking.existingBookingRef}</p>
                  </div>
                )}
                {booking.existingBookingNotes && (
                  <div>
                    <p className="text-xs text-blue-600">Notes</p>
                    <p className="text-sm text-blue-800">{booking.existingBookingNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Clock className="h-4 w-4 text-emerald-600" />
              Schedule
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Pickup Time</p>
                <p className="font-medium text-slate-900">{booking.pickupTime}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Dropoff Time</p>
                <p className="font-medium text-slate-900">{booking.dropoffTime}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs text-slate-500">Pickup Address</p>
              <p className="text-sm text-slate-900">{booking.pickupAddress}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Progress
              </div>
              <span className="text-sm font-semibold text-emerald-600">
                {booking.overallProgress}%
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${booking.overallProgress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Current Stage:{" "}
              <span className="font-medium text-slate-900">
                {getStageLabel(booking.currentStage)}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              Updates History
            </div>
            <div className="mt-4 space-y-3">
              {booking.updates.length > 0 ? (
                booking.updates.map((update, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {getStageLabel(update.stage)}
                      </p>
                      <p className="text-sm text-slate-600">{update.message}</p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(update.timestamp)} • {update.updatedBy}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No updates yet</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
            <div>
              <p>Created: {formatDate(booking.createdAt)}</p>
            </div>
            <div>
              <p>Updated: {formatDateTime(booking.updatedAt)}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onEdit}
              className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
            >
              Edit Booking
            </button>
            <Link
              href={getTrackingLink(booking)}
              target="_blank"
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              View Tracking
            </Link>
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditBookingModal({
  booking,
  onSave,
  onClose,
  saving,
}: {
  booking: Booking;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    currentStage: booking.currentStage,
    status: booking.status,
    message: "",
    pickupTime: booking.pickupTime,
    dropoffTime: booking.dropoffTime,
    pickupAddress: booking.pickupAddress,
    allowBackwardsProgression: false,
  });
  const [error, setError] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState<"cancelled" | "completed" | null>(null);

  const currentStageIndex = STAGES.findIndex((s) => s.id === booking.currentStage);
  const newStageIndex = STAGES.findIndex((s) => s.id === formData.currentStage);
  const isBackwardsProgression = newStageIndex < currentStageIndex;
  const newProgress = STAGES[newStageIndex]?.progress || booking.overallProgress;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.status !== booking.status && (formData.status === "cancelled" || formData.status === "completed")) {
      setShowConfirmDialog(formData.status as "cancelled" | "completed");
      return;
    }

    await submitForm();
  };

  const submitForm = async () => {
    try {
      await onSave({
        ...formData,
        currentStage: formData.currentStage !== booking.currentStage ? formData.currentStage : undefined,
        status: formData.status !== booking.status ? formData.status : undefined,
        message: formData.message || undefined,
        pickupTime: formData.pickupTime !== booking.pickupTime ? formData.pickupTime : undefined,
        dropoffTime: formData.dropoffTime !== booking.dropoffTime ? formData.dropoffTime : undefined,
        pickupAddress: formData.pickupAddress !== booking.pickupAddress ? formData.pickupAddress : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save booking");
    }
  };

  const handleConfirmedStatusChange = async () => {
    setShowConfirmDialog(null);
    await submitForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
          <h2 className="text-lg font-semibold text-slate-900">Edit Booking</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Current Stage
            </label>
            <select
              value={formData.currentStage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currentStage: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label} ({stage.progress}%)
                </option>
              ))}
            </select>

            {formData.currentStage !== booking.currentStage && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <span>Progress: {booking.overallProgress}%</span>
                  <span>→</span>
                  <span className="font-semibold">{newProgress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${newProgress}%` }}
                  />
                </div>
              </div>
            )}

            {isBackwardsProgression && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Going back to an earlier stage
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      This will move the booking from &quot;{STAGES[currentStageIndex]?.label}&quot; back to &quot;{STAGES[newStageIndex]?.label}&quot;.
                    </p>
                    <label className="mt-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.allowBackwardsProgression}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            allowBackwardsProgression: e.target.checked,
                          })
                        }
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm text-amber-800">
                        I confirm this change
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {formData.status === "cancelled" && formData.status !== booking.status && (
              <p className="mt-2 text-xs text-red-600">
                ⚠️ This will cancel the booking
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Update Message
              <span className="ml-1 font-normal text-slate-400">(shown to customer)</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Optional: Custom message for this update..."
            />
            <p className="mt-1 text-xs text-slate-500">
              Leave empty to use the default message for the selected stage.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pickup Time
            </label>
            <input
              type="text"
              value={formData.pickupTime}
              onChange={(e) =>
                setFormData({ ...formData, pickupTime: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Dropoff Time
            </label>
            <input
              type="text"
              value={formData.dropoffTime}
              onChange={(e) =>
                setFormData({ ...formData, dropoffTime: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pickup Address
            </label>
            <input
              type="text"
              value={formData.pickupAddress}
              onChange={(e) =>
                setFormData({ ...formData, pickupAddress: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || (isBackwardsProgression && !formData.allowBackwardsProgression)}
              className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Update Booking"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${showConfirmDialog === "cancelled" ? "bg-red-100" : "bg-green-100"}`}>
                <AlertTriangle className={`h-6 w-6 ${showConfirmDialog === "cancelled" ? "text-red-600" : "text-green-600"}`} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {showConfirmDialog === "cancelled" ? "Cancel Booking?" : "Complete Booking?"}
              </h3>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              {showConfirmDialog === "cancelled"
                ? "Are you sure you want to cancel this booking? The customer will be notified."
                : "Are you sure you want to mark this booking as completed? This indicates the service is finished and the car has been returned."}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleConfirmedStatusChange}
                disabled={saving}
                className={`flex-1 rounded-full py-3 text-sm font-semibold text-white shadow-lg ${showConfirmDialog === "cancelled" ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"} disabled:opacity-50`}
              >
                {saving ? "Saving..." : "Yes, Confirm"}
              </button>
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
