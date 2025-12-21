// src/app/garage/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  TrendingUp,
  User,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Car,
  Wrench,
  MapPin,
  Star,
  DollarSign,
  Phone,
  Mail,
  Eye,
  Check,
  X,
  Loader2,
  Shield,
  Flag,
  Play,
} from "lucide-react";
import { GarageDashboardHeader } from "@/components/garage/GarageDashboardHeader";

// Types
interface GarageProfile {
  _id: string;
  businessName: string;
  tradingName?: string;
  abn: string;
  businessAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  primaryContact: {
    name: string;
    role: string;
    phone: string;
    email: string;
  };
  operatingHours: Record<string, { open: string; close: string; closed: boolean }>;
  serviceBays: number;
  servicesOffered: string[];
  vehicleTypes: string[];
  serviceRadius: number;
  status: "pending" | "approved" | "suspended" | "rejected";
  ratings?: number;
  completedJobs?: number;
}

interface Booking {
  _id: string;
  userName: string;
  userEmail: string;
  vehicleRegistration: string;
  vehicleState: string;
  serviceType: string;
  pickupAddress: string;
  pickupTime: string;
  dropoffTime: string;
  status: string;
  currentStage: string;
  garageStatus?: "new" | "accepted" | "declined" | "in_progress" | "completed";
  selectedServices?: { category: string; services: string[] }[];
  serviceNotes?: string;
  paymentStatus?: string;
  createdAt: string;
}

interface DashboardStats {
  pendingBookings: number;
  acceptedBookings: number;
  completedThisMonth: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
}

type TabType = "bookings" | "services" | "profile" | "schedule" | "analytics";

const SERVICE_LABELS: Record<string, string> = {
  mechanical: "Mechanical Repairs",
  panel_beating: "Panel Beating",
  detailing: "Detailing",
  electrical: "Electrical",
  tyres: "Tyres & Wheels",
  aircon: "Air Conditioning",
  other: "Other Services",
};

const VEHICLE_LABELS: Record<string, string> = {
  sedan: "Sedans",
  suv: "SUVs",
  ute: "Utes",
  truck: "Trucks",
  motorcycle: "Motorcycles",
  electric: "Electric Vehicles",
  hybrid: "Hybrid Vehicles",
  commercial: "Commercial Vehicles",
};

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function GarageDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("bookings");
  const [loading, setLoading] = useState(true);
  const [garageProfile, setGarageProfile] = useState<GarageProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Redirect if not authenticated or not a garage user
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/garage/login");
      return;
    }

    if (session.user.role !== "garage") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch dashboard data
  useEffect(() => {
    if (session?.user.role === "garage") {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");

    try {
      const [profileRes, bookingsRes, statsRes] = await Promise.all([
        fetch("/api/garage/profile"),
        fetch("/api/garage/bookings"),
        fetch("/api/garage/stats"),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setGarageProfile(profileData.garage);
      }

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.bookings || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (
    bookingId: string,
    action: "accept" | "decline" | "start" | "complete",
    notes?: string
  ) => {
    setActionLoading(bookingId);
    try {
      const response = await fetch("/api/garage/booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action, notes }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state
        setBookings(prev =>
          prev.map(b =>
            b._id === bookingId
              ? { ...b, garageStatus: data.booking?.garageStatus || b.garageStatus }
              : b
          )
        );
        // Refresh stats
        const statsRes = await fetch("/api/garage/stats");
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } else {
        const data = await response.json();
        alert(data.error || "Action failed");
      }
    } catch (err) {
      console.error("Action error:", err);
      alert("Failed to process action");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-emerald-100 text-emerald-700",
      suspended: "bg-red-100 text-red-700",
      rejected: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const getBookingStatusBadge = (status?: string) => {
    const styles: Record<string, string> = {
      new: "bg-blue-100 text-blue-700",
      accepted: "bg-emerald-100 text-emerald-700",
      declined: "bg-red-100 text-red-700",
      in_progress: "bg-amber-100 text-amber-700",
      completed: "bg-green-100 text-green-700",
    };
    return styles[status || "new"] || "bg-slate-100 text-slate-700";
  };

  const filteredBookings = bookings.filter(b => {
    if (bookingFilter === "all") return true;
    return b.garageStatus === bookingFilter || (!b.garageStatus && bookingFilter === "new");
  });

  // Loading state
  if (status === "loading" || (loading && !garageProfile)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded bg-slate-200" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-200" />
              ))}
            </div>
            <div className="h-96 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  // Pending approval state
  if (garageProfile?.status === "pending") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">Application Under Review</h2>
            <p className="mt-2 text-slate-600">
              Your garage partner application is currently being reviewed by our team.
              We&apos;ll notify you via email once a decision has been made.
            </p>
            <div className="mt-6 rounded-lg bg-white p-4 text-left">
              <h3 className="font-semibold text-slate-900">{garageProfile.businessName}</h3>
              <p className="text-sm text-slate-500">
                {garageProfile.businessAddress.suburb}, {garageProfile.businessAddress.state}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Submitted: {formatDate(garageProfile._id)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Suspended state
  if (garageProfile?.status === "suspended") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">Account Suspended</h2>
            <p className="mt-2 text-slate-600">
              Your garage partner account has been suspended. Please contact support for assistance.
            </p>
            <a
              href="mailto:support@drivlet.com"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-white transition hover:bg-red-700"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !garageProfile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">Failed to Load Dashboard</h2>
            <p className="mt-2 text-slate-600">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-white transition hover:bg-emerald-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header with Notification Bell */}
        <GarageDashboardHeader
          garageProfile={garageProfile}
          onRefresh={fetchDashboardData}
          loading={loading}
        />

        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending Bookings</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.pendingBookings || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completed (Month)</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.completedThisMonth || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Rating</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.averageRating?.toFixed(1) || "N/A"}
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    ({stats?.totalReviews || 0} reviews)
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-emerald-600 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-emerald-100">Revenue (Month)</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
          {[
            { id: "bookings" as TabType, label: "Bookings", icon: ClipboardList },
            { id: "services" as TabType, label: "Services", icon: Wrench },
            { id: "profile" as TabType, label: "Profile", icon: Building2 },
            { id: "schedule" as TabType, label: "Schedule", icon: Calendar },
            { id: "analytics" as TabType, label: "Analytics", icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border border-slate-200 bg-white">
          {/* Bookings Tab */}
          {activeTab === "bookings" && (
            <div>
              <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Incoming Bookings</h2>
                <div className="flex gap-2">
                  {["all", "new", "accepted", "in_progress", "completed"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setBookingFilter(filter)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        bookingFilter === filter
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1).replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="p-12 text-center">
                  <Car className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">No bookings found</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {bookingFilter === "all"
                      ? "Bookings from customers in your service area will appear here."
                      : `No ${bookingFilter.replace("_", " ")} bookings at the moment.`}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredBookings.map((booking) => (
                    <div key={booking._id} className="p-4 transition hover:bg-slate-50">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{booking.userName}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getBookingStatusBadge(booking.garageStatus)}`}>
                              {(booking.garageStatus || "new").replace("_", " ")}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{booking.userEmail}</p>

                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Car className="h-4 w-4 text-slate-400" />
                              {booking.vehicleRegistration} ({booking.vehicleState})
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Wrench className="h-4 w-4 text-slate-400" />
                              {booking.serviceType}
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              {formatDate(booking.pickupTime)}
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              {booking.pickupAddress.substring(0, 30)}...
                            </div>
                          </div>

                          {booking.selectedServices && booking.selectedServices.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {booking.selectedServices.flatMap(s => s.services).slice(0, 3).map((service, i) => (
                                <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                  {service}
                                </span>
                              ))}
                              {booking.selectedServices.flatMap(s => s.services).length > 3 && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                  +{booking.selectedServices.flatMap(s => s.services).length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>

                          {/* New booking actions */}
                          {(!booking.garageStatus || booking.garageStatus === "new") && (
                            <>
                              <button
                                onClick={() => handleBookingAction(booking._id, "accept")}
                                disabled={actionLoading === booking._id}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {actionLoading === booking._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                Accept
                              </button>
                              <button
                                onClick={() => handleBookingAction(booking._id, "decline")}
                                disabled={actionLoading === booking._id}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                <X className="h-4 w-4" />
                                Decline
                              </button>
                            </>
                          )}

                          {/* Accepted booking - Start service */}
                          {booking.garageStatus === "accepted" && (
                            <button
                              onClick={() => handleBookingAction(booking._id, "start")}
                              disabled={actionLoading === booking._id}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                            >
                              {actionLoading === booking._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                              Start Service
                            </button>
                          )}

                          {/* In progress booking - Complete service */}
                          {booking.garageStatus === "in_progress" && (
                            <button
                              onClick={() => handleBookingAction(booking._id, "complete")}
                              disabled={actionLoading === booking._id}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {actionLoading === booking._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === "services" && (
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Services Offered</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {garageProfile?.servicesOffered?.map((service) => (
                  <div
                    key={service}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                        <Wrench className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {SERVICE_LABELS[service] || service}
                        </p>
                        <p className="text-sm text-slate-500">Active</p>
                      </div>
                    </div>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Vehicle Types</h3>
                <div className="flex flex-wrap gap-2">
                  {garageProfile?.vehicleTypes?.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                    >
                      {VEHICLE_LABELS[type] || type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="p-6">
              <h2 className="mb-6 text-lg font-semibold text-slate-900">Business Profile</h2>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Business Details */}
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                      <h3 className="font-semibold text-slate-900">Business Details</h3>
                    </div>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Business Name</dt>
                        <dd className="font-medium text-slate-900">{garageProfile?.businessName}</dd>
                      </div>
                      {garageProfile?.tradingName && (
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Trading Name</dt>
                          <dd className="font-medium text-slate-900">{garageProfile.tradingName}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-slate-500">ABN</dt>
                        <dd className="font-medium text-slate-900">{garageProfile?.abn}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Service Bays</dt>
                        <dd className="font-medium text-slate-900">{garageProfile?.serviceBays}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                      <h3 className="font-semibold text-slate-900">Location</h3>
                    </div>
                    <p className="text-sm text-slate-900">
                      {garageProfile?.businessAddress.street}<br />
                      {garageProfile?.businessAddress.suburb}, {garageProfile?.businessAddress.state}{" "}
                      {garageProfile?.businessAddress.postcode}
                    </p>
                    <p className="mt-3 text-sm text-slate-500">
                      Service Radius: <span className="font-medium text-slate-900">{garageProfile?.serviceRadius} km</span>
                    </p>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-emerald-600" />
                      <h3 className="font-semibold text-slate-900">Primary Contact</h3>
                    </div>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Name</dt>
                        <dd className="font-medium text-slate-900">{garageProfile?.primaryContact.name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Role</dt>
                        <dd className="font-medium text-slate-900">{garageProfile?.primaryContact.role}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500">Phone</dt>
                        <dd className="flex items-center gap-2 font-medium text-slate-900">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {garageProfile?.primaryContact.phone}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500">Email</dt>
                        <dd className="flex items-center gap-2 font-medium text-slate-900">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {garageProfile?.primaryContact.email}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-600" />
                      <h3 className="font-semibold text-slate-900">Account Status</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusBadge(garageProfile?.status || "pending")}`}>
                        {garageProfile?.status?.charAt(0).toUpperCase()}{garageProfile?.status?.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === "schedule" && (
            <div className="p-6">
              <h2 className="mb-6 text-lg font-semibold text-slate-900">Operating Hours</h2>

              <div className="space-y-3">
                {DAY_ORDER.map((day) => {
                  const hours = garageProfile?.operatingHours[day];
                  return (
                    <div
                      key={day}
                      className={`flex items-center justify-between rounded-xl border p-4 ${
                        hours?.closed ? "border-slate-200 bg-slate-50" : "border-slate-200"
                      }`}
                    >
                      <span className="font-medium capitalize text-slate-900">{day}</span>
                      {hours?.closed ? (
                        <span className="text-sm text-slate-500">Closed</span>
                      ) : (
                        <span className="text-sm text-slate-900">
                          {hours?.open} - {hours?.close}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="p-6">
              <h2 className="mb-6 text-lg font-semibold text-slate-900">Performance Analytics</h2>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-6">
                  <h3 className="mb-4 font-semibold text-slate-900">Booking Summary</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Pending</span>
                      <span className="text-xl font-bold text-slate-900">{stats?.pendingBookings || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Accepted</span>
                      <span className="text-xl font-bold text-slate-900">{stats?.acceptedBookings || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Completed This Month</span>
                      <span className="text-xl font-bold text-emerald-600">{stats?.completedThisMonth || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-6">
                  <h3 className="mb-4 font-semibold text-slate-900">Customer Feedback</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                      <Star className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-slate-900">
                        {stats?.averageRating?.toFixed(1) || "N/A"}
                      </p>
                      <p className="text-sm text-slate-500">
                        Based on {stats?.totalReviews || 0} reviews
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-6 lg:col-span-2">
                  <h3 className="mb-4 font-semibold text-slate-900">Revenue Overview</h3>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-sm text-slate-500">This Month</p>
                      <p className="text-3xl font-bold text-emerald-600">
                        {formatCurrency(stats?.totalRevenue || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Booking Detail Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Booking Details</h2>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 font-semibold text-slate-900">Customer Information</h3>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Name</dt>
                      <dd className="font-medium text-slate-900">{selectedBooking.userName}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Email</dt>
                      <dd className="font-medium text-slate-900">{selectedBooking.userEmail}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 font-semibold text-slate-900">Vehicle & Service</h3>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Registration</dt>
                      <dd className="font-medium text-slate-900">
                        {selectedBooking.vehicleRegistration} ({selectedBooking.vehicleState})
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Service Type</dt>
                      <dd className="font-medium text-slate-900">{selectedBooking.serviceType}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Pickup Address</dt>
                      <dd className="font-medium text-slate-900">{selectedBooking.pickupAddress}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Pickup Time</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selectedBooking.pickupTime)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Dropoff Time</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selectedBooking.dropoffTime)}</dd>
                    </div>
                  </dl>
                </div>

                {selectedBooking.selectedServices && selectedBooking.selectedServices.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="mb-3 font-semibold text-slate-900">Requested Services</h3>
                    <div className="space-y-2">
                      {selectedBooking.selectedServices.map((cat, i) => (
                        <div key={i}>
                          <p className="text-sm font-medium text-slate-700">{cat.category}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {cat.services.map((s, j) => (
                              <span key={j} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBooking.serviceNotes && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="mb-3 font-semibold text-slate-900">Service Notes</h3>
                    <p className="text-sm text-slate-600">{selectedBooking.serviceNotes}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                  {(!selectedBooking.garageStatus || selectedBooking.garageStatus === "new") && (
                    <>
                      <button
                        onClick={() => {
                          handleBookingAction(selectedBooking._id, "decline");
                          setSelectedBooking(null);
                        }}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => {
                          handleBookingAction(selectedBooking._id, "accept");
                          setSelectedBooking(null);
                        }}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                      >
                        Accept Booking
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
