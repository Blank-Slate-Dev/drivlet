// src/app/admin/dispatch/page.tsx
// Dispatch board, condensed (2026-08-07 redesign): bookings render as
// compact colour-coded tiles (emerald = pickup leg, blue = return leg,
// consistent with the driver app) showing plate / suburb / time window at a
// glance. Clicking a tile expands it in place to reveal full dispatch detail
// (customer, route, phone, workshop, assign/unassign). All data flow and
// actions are unchanged from the previous board.
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Users,
  MapPin,
  Clock,
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
  Building2,
  ChevronDown,
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
  /** Workshop typed manually by the customer — verify before dispatch */
  garageManualEntry?: boolean;
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

// Bordered chips, matching the dashboard/bookings palette
function getStateBadgeColor(state: string | null | undefined): string {
  switch (state) {
    case "assigned": return "border-blue-200 bg-blue-50 text-blue-700";
    case "started": return "border-amber-200 bg-amber-50 text-amber-700";
    case "arrived": return "border-purple-200 bg-purple-50 text-purple-700";
    case "collected": return "border-amber-200 bg-amber-50 text-amber-700";
    case "delivering": return "border-blue-200 bg-blue-50 text-blue-700";
    case "completed": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default: return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

/**
 * Best-effort suburb from a full address: the second comma segment with the
 * state + postcode stripped ("12 Smith St, Mayfield NSW 2304, Australia" →
 * "Mayfield"). Falls back to a truncated address.
 */
function suburbOf(address: string | undefined): string {
  if (!address) return "—";
  const parts = address.split(",").map((p) => p.trim());
  const candidate = (parts[1] || parts[0] || "")
    .replace(/\b(NSW|ACT|VIC|QLD|SA|WA|TAS|NT)\b\s*\d{0,4}/i, "")
    .trim();
  return candidate || address.slice(0, 24);
}

const LEG_TILE = {
  pickup: {
    tile: "border-emerald-200 bg-emerald-50/70 hover:border-emerald-300",
    tileOpen: "border-emerald-300 ring-2 ring-emerald-100",
    chip: "bg-emerald-600 text-white",
    Icon: ArrowRight,
    label: "Pickup",
    button: "bg-emerald-600 hover:bg-emerald-500",
  },
  return: {
    tile: "border-blue-200 bg-blue-50/70 hover:border-blue-300",
    tileOpen: "border-blue-300 ring-2 ring-blue-100",
    chip: "bg-blue-600 text-white",
    Icon: ArrowLeft,
    label: "Return",
    button: "bg-blue-600 hover:bg-blue-500",
  },
} as const;

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
  // Which tile is expanded: "<kind>-<leg?>-<id>"
  const [expandedTile, setExpandedTile] = useState<string | null>(null);

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

  const toggleTile = (key: string) =>
    setExpandedTile((current) => (current === key ? null : key));

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const unassignedTiles: Array<{ booking: DispatchBooking; leg: "pickup" | "return" }> = [
    ...data.unassignedPickups.map((b) => ({ booking: b, leg: "pickup" as const })),
    ...data.unassignedReturns.map((b) => ({ booking: b, leg: "return" as const })),
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Top bar — dashboard rhythm */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Dispatch Board</h1>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError("")} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{successMsg}</span>
          </div>
        )}

        {/* Stats row — dashboard card language */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              { label: "Unassigned Pickups", value: data.unassignedPickups.length, icon: ArrowRight, iconClass: "text-emerald-600" },
              { label: "Unassigned Returns", value: data.unassignedReturns.length, icon: ArrowLeft, iconClass: "text-blue-600" },
              { label: "Drivers On Shift", value: data.availableDrivers.filter((d) => d.isClockedIn).length, sub: `${data.availableDrivers.length} total`, icon: Users, iconClass: "text-emerald-600" },
              { label: "Today's Active", value: data.todaysDispatched.length, icon: Truck, iconClass: "text-slate-500" },
            ] as const
          ).map((card) => {
            const CardIcon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-900">{card.value}</span>
                  <CardIcon className={`h-4 w-4 ${card.iconClass}`} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {card.label}
                  {"sub" in card && card.sub && (
                    <span className="text-slate-400"> · {card.sub}</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        {/* Three-column layout */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Column 1: Unassigned Jobs — compact tile grid */}
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <Truck className="h-3.5 w-3.5" />
              Unassigned Jobs
            </h2>

            {unassignedTiles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-8 text-center">
                <CheckCircle className="mx-auto h-8 w-8 text-emerald-400" />
                <p className="mt-2 text-sm text-slate-500">All jobs assigned!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {unassignedTiles.map(({ booking, leg }) => {
                  const key = `u-${leg}-${booking._id}`;
                  const open = expandedTile === key;
                  const style = LEG_TILE[leg];
                  const LegIcon = style.Icon;
                  const timeWindow = leg === "pickup" ? booking.pickupTime : booking.dropoffTime;
                  const slot = leg === "pickup" ? booking.pickupTimeSlot : booking.dropoffTimeSlot;
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border transition ${open ? `col-span-2 bg-white ${style.tileOpen}` : `cursor-pointer ${style.tile}`}`}
                    >
                      {/* Collapsed face: plate / suburb / time, leg colour */}
                      <button
                        onClick={() => toggleTile(key)}
                        className="flex w-full flex-col items-start gap-1 p-2.5 text-left"
                        aria-expanded={open}
                      >
                        <div className="flex w-full items-center justify-between gap-1">
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${style.chip}`}>
                            <LegIcon className="h-2.5 w-2.5" />
                            {style.label.toUpperCase()}
                          </span>
                          <span className="flex items-center gap-1">
                            {booking.isManualTransmission && (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">M</span>
                            )}
                            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                          </span>
                        </div>
                        <span className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide text-slate-800">
                          {booking.vehicleRegistration}
                        </span>
                        <span className="truncate text-[11px] text-slate-600">
                          {suburbOf(booking.pickupAddress)}
                          {timeWindow && <span className="text-slate-400"> · {timeWindow}</span>}
                        </span>
                      </button>

                      {/* Expanded detail */}
                      {open && (
                        <div className="space-y-2 border-t border-slate-100 p-3 text-xs text-slate-600">
                          <p className="text-sm font-medium text-slate-900">
                            {booking.customerName}
                            <span className="ml-2 font-normal text-slate-400">{booking.serviceType}</span>
                          </p>
                          <div className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-400" />
                            <span>
                              {leg === "pickup"
                                ? `${booking.pickupAddress} → ${booking.garageName || "Workshop"}`
                                : `${booking.garageName || "Workshop"} → ${booking.pickupAddress}`}
                            </span>
                          </div>
                          {booking.garageAddress && (
                            <div className="flex items-start gap-1.5">
                              <Building2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-400" />
                              <span>{booking.garageAddress}</span>
                            </div>
                          )}
                          {booking.garageManualEntry && (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              Workshop entered manually — verify before dispatch
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>
                              {timeWindow}
                              {slot && ` (${slot})`}
                            </span>
                          </div>
                          {booking.customerPhone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <a href={`tel:${booking.customerPhone}`} className="text-emerald-700 hover:underline">
                                {booking.customerPhone}
                              </a>
                            </div>
                          )}
                          <button
                            onClick={() => setAssignModal({ booking, leg })}
                            disabled={actionLoading === booking._id}
                            className={`mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 ${style.button}`}
                          >
                            {actionLoading === booking._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4" />
                            )}
                            Assign Driver
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Available Drivers — condensed rows */}
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <Users className="h-3.5 w-3.5" />
              Available Drivers
            </h2>

            {data.availableDrivers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-8 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No drivers available</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                  {[...data.availableDrivers]
                    .sort((a, b) => {
                      if (a.isClockedIn && !b.isClockedIn) return -1;
                      if (!a.isClockedIn && b.isClockedIn) return 1;
                      return a.todaysJobCount - b.todaysJobCount;
                    })
                    .map((driver) => {
                      const atLimit = driver.todaysJobCount >= driver.maxJobsPerDay;
                      return (
                        <li
                          key={driver._id}
                          className={`px-3 py-2 ${driver.isClockedIn ? "" : "opacity-50"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span
                                className={`h-2 w-2 flex-shrink-0 rounded-full ${driver.isClockedIn ? "bg-emerald-500" : "bg-slate-300"}`}
                              />
                              <span className="truncate text-sm font-medium text-slate-900">
                                {driver.firstName} {driver.lastName}
                              </span>
                              {atLimit && (
                                <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                                  FULL
                                </span>
                              )}
                            </div>
                            <span className="flex-shrink-0 text-[11px] text-slate-500">
                              {driver.todaysJobCount}/{driver.maxJobsPerDay} today
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 pl-3.5">
                            <span className="text-[10px] capitalize text-slate-400">
                              {driver.shiftPreference.replace("_", " ")}
                            </span>
                            {driver.preferredAreas.map((area) => (
                              <span
                                key={area}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </div>

          {/* Column 3: Today's Active — compact tiles */}
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <CheckCircle className="h-3.5 w-3.5" />
              {"Today's Active"}
            </h2>

            {data.todaysDispatched.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-8 text-center">
                <Truck className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No dispatched jobs today</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {data.todaysDispatched.map((booking) => {
                  const key = `d-${booking._id}`;
                  const open = expandedTile === key;
                  const pickupStarted = booking.pickupDriverState && booking.pickupDriverState !== "assigned";
                  const returnStarted = booking.returnDriverState && booking.returnDriverState !== "assigned";
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border bg-white transition ${
                        open
                          ? "col-span-2 border-slate-300 ring-2 ring-slate-100"
                          : "cursor-pointer border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Collapsed face: plate + per-leg state dots */}
                      <button
                        onClick={() => toggleTile(key)}
                        className="flex w-full flex-col items-start gap-1 p-2.5 text-left"
                        aria-expanded={open}
                      >
                        <div className="flex w-full items-center justify-between gap-1">
                          <span className="rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide text-slate-800">
                            {booking.vehicleRegistration}
                          </span>
                          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {booking.assignedDriverId && (
                            <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${getStateBadgeColor(booking.pickupDriverState)}`}>
                              <ArrowRight className="h-2.5 w-2.5" />
                              {getStateLabel(booking.pickupDriverState, "pickup")}
                            </span>
                          )}
                          {booking.returnDriverId && (
                            <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${getStateBadgeColor(booking.returnDriverState)}`}>
                              <ArrowLeft className="h-2.5 w-2.5" />
                              {getStateLabel(booking.returnDriverState, "return")}
                            </span>
                          )}
                        </div>
                        <span className="truncate text-[11px] text-slate-500">
                          {suburbOf(booking.pickupAddress)}
                        </span>
                      </button>

                      {/* Expanded detail: customer + leg rows w/ unassign */}
                      {open && (
                        <div className="space-y-2 border-t border-slate-100 p-3 text-xs text-slate-600">
                          <p className="text-sm font-medium text-slate-900">{booking.customerName}</p>
                          <div className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-400" />
                            <span>
                              {booking.pickupAddress} → {booking.garageName || "Workshop"}
                            </span>
                          </div>
                          {booking.customerPhone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <a href={`tel:${booking.customerPhone}`} className="text-emerald-700 hover:underline">
                                {booking.customerPhone}
                              </a>
                            </div>
                          )}

                          {/* Pickup leg */}
                          {booking.assignedDriverId && (
                            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                              <div className="flex items-center gap-2">
                                <ArrowRight className="h-3 w-3 text-emerald-600" />
                                <span className="text-xs text-slate-700">
                                  {getDriverName(booking.assignedDriverId)}
                                </span>
                                <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${getStateBadgeColor(booking.pickupDriverState)}`}>
                                  {getStateLabel(booking.pickupDriverState, "pickup")}
                                </span>
                              </div>
                              {!pickupStarted && (
                                <button
                                  onClick={() => unassignDriver(booking._id, "pickup")}
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
                                <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${getStateBadgeColor(booking.returnDriverState)}`}>
                                  {getStateLabel(booking.returnDriverState, "return")}
                                </span>
                              </div>
                              {!returnStarted && (
                                <button
                                  onClick={() => unassignDriver(booking._id, "return")}
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ ASSIGN MODAL (unchanged) ═══ */}
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
