// src/app/admin/dispatch/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Users,
  MapPin,
  Clock,
  Car,
  Loader2,
  RefreshCw,
  AlertTriangle,
  X,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Phone,
  UserPlus,
  UserMinus,
  Star,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

interface DispatchBooking {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  vehicleRegistration: string;
  vehicleState: string;
  serviceType: string;
  pickupAddress: string;
  garageName?: string;
  garageAddress?: string;
  pickupTime: string;
  dropoffTime: string;
  pickupTimeSlot?: string;
  dropoffTimeSlot?: string;
  isManualTransmission: boolean;
  status: string;
  currentStage?: string;
  createdAt: string;
  assignedDriverId?: string | null;
  returnDriverId?: string | null;
  servicePaymentStatus?: string | null;
  pickupDriverState?: string | null;
  returnDriverState?: string | null;
}

interface DispatchDriver {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  preferredAreas: string[];
  maxJobsPerDay: number;
  shiftPreference: string;
  isClockedIn: boolean;
  todaysJobCount: number;
  completedJobs: number;
}

interface DispatchData {
  unassignedPickups: DispatchBooking[];
  unassignedReturns: DispatchBooking[];
  availableDrivers: DispatchDriver[];
  todaysDispatched: DispatchBooking[];
}

// ─── Helpers ───────────────────────────────────────────────────

function getStateLabel(state: string | null | undefined, leg: "pickup" | "return"): string {
  if (!state) return "Pending";
  if (leg === "pickup") {
    switch (state) {
      case "assigned": return "Assigned";
      case "started": return "En Route";
      case "arrived": return "At Customer";
      case "collected": return "Car Collected";
      case "completed": return "At Workshop";
      default: return state;
    }
  }
  switch (state) {
    case "assigned": return "Assigned";
    case "started": return "Heading to Workshop";
    case "collected": return "Collected";
    case "delivering": return "Delivering";
    case "completed": return "Delivered";
    default: return state;
  }
}

function getStateBadgeColor(state: string | null | undefined): string {
  switch (state) {
    case "assigned": return "bg-blue-100 text-blue-700";
    case "started": return "bg-amber-100 text-amber-700";
    case "arrived": return "bg-purple-100 text-purple-700";
    case "collected": return "bg-amber-100 text-amber-700";
    case "delivering": return "bg-blue-100 text-blue-700";
    case "completed": return "bg-emerald-100 text-emerald-700";
    default: return "bg-slate-100 text-slate-700";
  }
}

// ─── Main Page Component ──────────────────────────────────────

export default function DispatchPage() {
  const [data, setData] = useState<DispatchData>({
    unassignedPickups: [],
    unassignedReturns: [],
    availableDrivers: [],
    todaysDispatched: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Assign modal state
  const [assignModal, setAssignModal] = useState<{
    booking: DispatchBooking;
    leg: "pickup" | "return";
  } | null>(null);

  // ─── Fetch ─────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dispatch");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ─── Actions ───────────────────────────────────────────────

  const assignDriver = async (bookingId: string, driverId: string, leg: "pickup" | "return") => {
    setActionLoading(bookingId);
    setError("");
    try {
      const res = await fetch("/api/admin/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, driverId, leg }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to assign");
      setSuccessMsg(json.message);
      setTimeout(() => setSuccessMsg(""), 3000);
      setAssignModal(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setActionLoading(null);
    }
  };

  const unassignDriver = async (bookingId: string, leg: "pickup" | "return") => {
    setActionLoading(bookingId);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/dispatch?bookingId=${bookingId}&leg=${leg}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to unassign");
      setSuccessMsg(json.message);
      setTimeout(() => setSuccessMsg(""), 3000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unassign");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Smart driver sorting ─────────────────────────────────

  const getSortedDrivers = (booking: DispatchBooking) => {
    return [...data.availableDrivers].sort((a, b) => {
      // Clocked in first
      if (a.isClockedIn && !b.isClockedIn) return -1;
      if (!a.isClockedIn && b.isClockedIn) return 1;

      // Preferred area match
      const aMatch = a.preferredAreas.some((area) =>
        booking.pickupAddress?.toLowerCase().includes(area.toLowerCase())
      );
      const bMatch = b.preferredAreas.some((area) =>
        booking.pickupAddress?.toLowerCase().includes(area.toLowerCase())
      );
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;

      // Fewer jobs today first
      if (a.todaysJobCount !== b.todaysJobCount) {
        return a.todaysJobCount - b.todaysJobCount;
      }

      // More experienced first
      return b.completedJobs - a.completedJobs;
    });
  };

  // ─── Driver name lookup ───────────────────────────────────

  const getDriverName = (driverId: string | null | undefined) => {
    if (!driverId) return "—";
    const driver = data.availableDrivers.find((d) => d._id === driverId);
    return driver ? `${driver.firstName} ${driver.lastName}` : `Driver ${driverId.slice(-4)}`;
  };

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dispatch Board</h1>
            <p className="text-sm text-slate-500">
              Assign drivers to pickups and returns
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError("")} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-700">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{successMsg}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Unassigned Pickups"
            value={data.unassignedPickups.length}
            color="amber"
          />
          <StatCard
            label="Unassigned Returns"
            value={data.unassignedReturns.length}
            color="blue"
          />
          <StatCard
            label="Available Drivers"
            value={data.availableDrivers.filter((d) => d.isClockedIn).length}
            subtitle={`${data.availableDrivers.length} total`}
            color="emerald"
          />
          <StatCard
            label="Today's Active"
            value={data.todaysDispatched.length}
            color="slate"
          />
        </div>

        {/* Three-column layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Column 1: Unassigned Jobs */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
              <Truck className="h-4 w-4" />
              Unassigned Jobs
            </h2>

            {data.unassignedPickups.length === 0 &&
              data.unassignedReturns.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white py-8 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-emerald-400" />
                  <p className="mt-2 text-sm text-slate-500">
                    All jobs assigned!
                  </p>
                </div>
              )}

            <div className="space-y-3">
              {/* Pickups */}
              {data.unassignedPickups.map((b) => (
                <UnassignedCard
                  key={`p-${b._id}`}
                  booking={b}
                  leg="pickup"
                  actionLoading={actionLoading}
                  onAssign={() => setAssignModal({ booking: b, leg: "pickup" })}
                />
              ))}

              {/* Returns */}
              {data.unassignedReturns.map((b) => (
                <UnassignedCard
                  key={`r-${b._id}`}
                  booking={b}
                  leg="return"
                  actionLoading={actionLoading}
                  onAssign={() => setAssignModal({ booking: b, leg: "return" })}
                />
              ))}
            </div>
          </div>

          {/* Column 2: Available Drivers */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
              <Users className="h-4 w-4" />
              Available Drivers
            </h2>

            {data.availableDrivers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-8 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  No drivers available
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.availableDrivers
                  .sort((a, b) => {
                    if (a.isClockedIn && !b.isClockedIn) return -1;
                    if (!a.isClockedIn && b.isClockedIn) return 1;
                    return a.todaysJobCount - b.todaysJobCount;
                  })
                  .map((driver) => (
                    <DriverCard key={driver._id} driver={driver} />
                  ))}
              </div>
            )}
          </div>

          {/* Column 3: Today's Dispatched */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
              <CheckCircle className="h-4 w-4" />
              {"Today's Active"}
            </h2>

            {data.todaysDispatched.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-8 text-center">
                <Truck className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  No dispatched jobs today
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.todaysDispatched.map((b) => (
                  <DispatchedCard
                    key={`d-${b._id}`}
                    booking={b}
                    getDriverName={getDriverName}
                    actionLoading={actionLoading}
                    onUnassign={unassignDriver}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ ASSIGN MODAL ═══ */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Assign {assignModal.leg === "pickup" ? "Pickup" : "Return"} Driver
                </h2>
                <p className="text-sm text-slate-500">
                  {assignModal.booking.vehicleRegistration} &mdash;{" "}
                  {assignModal.booking.customerName}
                </p>
              </div>
              <button
                onClick={() => setAssignModal(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {/* Booking summary */}
              <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
                <div className="flex items-center gap-2">
                  {assignModal.leg === "pickup" ? (
                    <ArrowRight className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowLeft className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="font-medium text-slate-700">
                    {assignModal.leg === "pickup"
                      ? `${assignModal.booking.pickupAddress} → ${assignModal.booking.garageName || "Workshop"}`
                      : `${assignModal.booking.garageName || "Workshop"} → ${assignModal.booking.pickupAddress}`}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {assignModal.leg === "pickup"
                      ? assignModal.booking.pickupTime
                      : assignModal.booking.dropoffTime}
                  </span>
                  {assignModal.booking.isManualTransmission && (
                    <span className="font-medium text-amber-600">Manual</span>
                  )}
                </div>
              </div>

              {/* Driver list */}
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Select a driver
              </p>
              {getSortedDrivers(assignModal.booking).length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  No eligible drivers available
                </p>
              ) : (
                <div className="space-y-2">
                  {getSortedDrivers(assignModal.booking).map((driver) => {
                    const isAreaMatch = driver.preferredAreas.some((area) =>
                      assignModal.booking.pickupAddress
                        ?.toLowerCase()
                        .includes(area.toLowerCase())
                    );
                    const atLimit =
                      driver.todaysJobCount >= driver.maxJobsPerDay;
                    const isAssigning = actionLoading === assignModal.booking._id;

                    return (
                      <button
                        key={driver._id}
                        onClick={() =>
                          assignDriver(
                            assignModal.booking._id,
                            driver._id,
                            assignModal.leg
                          )
                        }
                        disabled={isAssigning || atLimit}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isAreaMatch
                            ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {driver.firstName} {driver.lastName}
                            </span>
                            {!driver.isClockedIn && (
                              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                                Off-clock
                              </span>
                            )}
                            {isAreaMatch && (
                              <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                                <Star className="h-3 w-3 fill-emerald-400" />
                                Area match
                              </span>
                            )}
                            {atLimit && (
                              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                                At limit
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                            <span>
                              {driver.todaysJobCount}/{driver.maxJobsPerDay} today
                            </span>
                            <span>{driver.completedJobs} completed</span>
                            <span className="capitalize">
                              {driver.shiftPreference.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                        <UserPlus className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: number;
  subtitle?: string;
  color: "amber" | "blue" | "emerald" | "slate";
}) {
  const colorMap = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-75">{label}</p>
      {subtitle && <p className="text-xs opacity-50">{subtitle}</p>}
    </div>
  );
}

// ─── Unassigned Card ───────────────────────────────────────────

function UnassignedCard({
  booking,
  leg,
  actionLoading,
  onAssign,
}: {
  booking: DispatchBooking;
  leg: "pickup" | "return";
  actionLoading: string | null;
  onAssign: () => void;
}) {
  const isPickup = leg === "pickup";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        {isPickup ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
            <ArrowRight className="h-3 w-3" />
            PICKUP
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
            <ArrowLeft className="h-3 w-3" />
            RETURN
          </span>
        )}
        {booking.isManualTransmission && (
          <span className="text-xs font-medium text-amber-600">Manual</span>
        )}
      </div>

      <p className="font-semibold text-slate-900">
        {booking.vehicleRegistration} ({booking.vehicleState})
      </p>
      <p className="text-sm text-slate-600">
        {booking.customerName}
      </p>

      <div className="mt-2 space-y-1 text-xs text-slate-500">
        <div className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span>
            {isPickup
              ? `${booking.pickupAddress} → ${booking.garageName || "Workshop"}`
              : `${booking.garageName || "Workshop"} → ${booking.pickupAddress}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>
            {isPickup ? booking.pickupTime : booking.dropoffTime}
            {booking.pickupTimeSlot && isPickup && ` (${booking.pickupTimeSlot})`}
            {booking.dropoffTimeSlot && !isPickup && ` (${booking.dropoffTimeSlot})`}
          </span>
        </div>
        {booking.customerPhone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3" />
            <span>{booking.customerPhone}</span>
          </div>
        )}
      </div>

      <button
        onClick={onAssign}
        disabled={actionLoading === booking._id}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 ${
          isPickup
            ? "bg-emerald-600 hover:bg-emerald-500"
            : "bg-blue-600 hover:bg-blue-500"
        }`}
      >
        {actionLoading === booking._id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Assign Driver
      </button>
    </div>
  );
}

// ─── Driver Card ───────────────────────────────────────────────

function DriverCard({ driver }: { driver: DispatchDriver }) {
  const atLimit = driver.todaysJobCount >= driver.maxJobsPerDay;

  return (
    <div
      className={`rounded-xl border p-3 ${
        driver.isClockedIn
          ? "border-emerald-200 bg-white"
          : "border-slate-200 bg-slate-50 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">
              {driver.firstName} {driver.lastName}
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                driver.isClockedIn ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
            <span>
              {driver.todaysJobCount}/{driver.maxJobsPerDay} today
            </span>
            <span>&middot;</span>
            <span className="capitalize">
              {driver.shiftPreference.replace("_", " ")}
            </span>
          </div>
        </div>
        {atLimit && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
            FULL
          </span>
        )}
      </div>
      {driver.preferredAreas.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {driver.preferredAreas.map((area) => (
            <span
              key={area}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
            >
              {area}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Dispatched Card ───────────────────────────────────────────

function DispatchedCard({
  booking,
  getDriverName,
  actionLoading,
  onUnassign,
}: {
  booking: DispatchBooking;
  getDriverName: (id: string | null | undefined) => string;
  actionLoading: string | null;
  onUnassign: (bookingId: string, leg: "pickup" | "return") => void;
}) {
  const pickupStarted = booking.pickupDriverState && booking.pickupDriverState !== "assigned";
  const returnStarted = booking.returnDriverState && booking.returnDriverState !== "assigned";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-900">
            {booking.vehicleRegistration}
          </p>
          <p className="text-xs text-slate-500">{booking.customerName}</p>
        </div>
        <Car className="h-4 w-4 text-slate-400" />
      </div>

      <div className="mt-2 space-y-1.5">
        {/* Pickup leg */}
        {booking.assignedDriverId && (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3 text-emerald-600" />
              <span className="text-xs text-slate-700">
                {getDriverName(booking.assignedDriverId)}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getStateBadgeColor(booking.pickupDriverState)}`}
              >
                {getStateLabel(booking.pickupDriverState, "pickup")}
              </span>
            </div>
            {!pickupStarted && (
              <button
                onClick={() => onUnassign(booking._id, "pickup")}
                disabled={actionLoading === booking._id}
                className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                title="Unassign pickup driver"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Return leg */}
        {booking.returnDriverId ? (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-3 w-3 text-blue-600" />
              <span className="text-xs text-slate-700">
                {getDriverName(booking.returnDriverId)}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getStateBadgeColor(booking.returnDriverState)}`}
              >
                {getStateLabel(booking.returnDriverState, "return")}
              </span>
            </div>
            {!returnStarted && (
              <button
                onClick={() => onUnassign(booking._id, "return")}
                disabled={actionLoading === booking._id}
                className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                title="Unassign return driver"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          booking.assignedDriverId && (
            <div className="rounded-lg border border-dashed border-slate-200 px-2.5 py-1.5 text-center text-[10px] text-slate-400">
              No return driver assigned
            </div>
          )
        )}
      </div>
    </div>
  );
}
