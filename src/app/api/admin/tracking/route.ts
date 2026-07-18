// src/app/api/admin/tracking/route.ts
// Read-only live operations feed for the admin tracking board (/admin/tracking).
// Returns all ACTIVE paid bookings (Booking Confirmed → Driver Returning inclusive)
// with the fields the cards render. Makes zero writes.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import VehiclePhoto from "@/models/VehiclePhoto";
import Incident from "@/models/Incident";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

// Active lifecycle stages (excludes the terminal "delivered" / completed).
const ACTIVE_STAGES = [
  "booking_confirmed",
  "driver_en_route",
  "car_picked_up",
  "at_garage",
  "service_in_progress",
  "driver_returning",
];

// Short leg labels for photo grouping (checkpointType → leg).
const LEG_LABELS: Record<string, string> = {
  pre_pickup: "Pickup",
  service_dropoff: "Drop-off",
  service_pickup: "Return",
  final_delivery: "Delivery",
};

const PHOTO_TYPE_LABELS: Record<string, string> = {
  front: "Front",
  back: "Rear",
  left_side: "Left side",
  right_side: "Right side",
  odometer: "Odometer",
};

const MAX_PHOTOS_PER_BOOKING = 40;
const MAX_UPDATES_PER_BOOKING = 10;

// ─── Response types ─────────────────────────────────────────────
export interface TrackingDriver {
  firstName: string;
  state: string; // derived leg state, e.g. "assigned" | "started" | "collected" | "completed"
}

export interface TrackingPhoto {
  id: string;
  leg: string; // checkpointType
  legLabel: string;
  typeLabel: string;
  url: string;
  capturedAt: string | null;
  capturedLocation: string | null;
}

export interface TrackingUpdate {
  stage: string;
  message: string;
  timestamp: string;
  actor: string; // updatedBy: customer | admin | system | driver
}

export interface TrackingIncident {
  id: string;
  type: string;
  severity: string;
  title: string;
  status: string;
  exceptionState: string;
  occurredAt: string | null;
  createdAt: string;
}

export interface TrackingCard {
  id: string;
  trackingCode: string | null;
  currentStage: string;
  status: string;
  overallProgress: number;
  vehicle: {
    model: string | null;
    year: string | null;
    rego: string;
    regoState: string | null;
    transmission: "automatic" | "manual";
    isManual: boolean;
  };
  customerFirstName: string;
  pickupSuburb: string;
  workshopName: string | null;
  workshopSuburb: string;
  serviceDate: string | null;
  pickupTimeSlot: string | null;
  dropoffTimeSlot: string | null;
  pickupDriver: TrackingDriver | null;
  returnDriver: TrackingDriver | null;
  photos: TrackingPhoto[];
  updates: TrackingUpdate[];
  incidents: TrackingIncident[];
  hasActiveIncident: boolean;
  incidentExceptionState: string;
  /** Service payment state: null = no link issued, "pending" = link sent, "paid" = paid */
  servicePaymentStatus: "pending" | "paid" | null;
  servicePaymentAmount: number | null;
  /** How it was paid: Stripe link or directly to the service centre by phone */
  servicePaymentMethod: "stripe_link" | "phone_direct" | null;
  createdAt: string;
  updatedAt: string;
}

// Best-effort suburb from a free-text AU address (avoids sending full street PII).
function deriveSuburb(addr?: string | null): string {
  if (!addr) return "";
  const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  const candidate = parts.length >= 2 ? parts[parts.length - 2] : parts[parts.length - 1];
  const cleaned = candidate
    .replace(/\b(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\b\s*\d{0,4}\s*$/i, "")
    .replace(/\bAustralia\b/i, "")
    .trim();
  return cleaned || candidate;
}

// Derive a leg's driver state from the leg timestamps (mirrors the driver jobs API).
function pickupState(leg?: { startedAt?: Date; arrivedAt?: Date; collectedAt?: Date; completedAt?: Date }): string {
  if (!leg) return "assigned";
  if (leg.completedAt) return "completed";
  if (leg.collectedAt) return "collected";
  if (leg.arrivedAt) return "arrived";
  if (leg.startedAt) return "started";
  return "assigned";
}

function returnState(leg?: { startedAt?: Date; collectedAt?: Date; arrivedAt?: Date; completedAt?: Date }): string {
  if (!leg) return "assigned";
  if (leg.completedAt) return "completed";
  if (leg.arrivedAt) return "delivering";
  if (leg.collectedAt) return "collected";
  if (leg.startedAt) return "started";
  return "assigned";
}

export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();

    // Active paid bookings only. Exclude completed/cancelled and any cancelled record.
    const bookings = await Booking.find({
      currentStage: { $in: ACTIVE_STAGES },
      status: { $nin: ["completed", "cancelled"] },
      "cancellation.cancelledAt": { $exists: false },
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (bookings.length === 0) {
      return NextResponse.json({ bookings: [], count: 0, serverTime: new Date().toISOString() });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lean() docs are untyped Mongoose objects
    const rawBookings = bookings as any[];

    const bookingIds = rawBookings
      .map((b) => b._id)
      .filter((id): id is Types.ObjectId => id instanceof Types.ObjectId);

    // Collect driver ids (pickup + return legs), guarding types.
    const driverIdSet = new Set<string>();
    for (const b of rawBookings) {
      const pid = b.pickupDriver?.driverId;
      const rid = b.returnDriver?.driverId;
      if (pid) driverIdSet.add(pid.toString());
      if (rid) driverIdSet.add(rid.toString());
    }
    const driverObjectIds = Array.from(driverIdSet)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const [drivers, photos, incidents] = await Promise.all([
      driverObjectIds.length > 0
        ? Driver.find({ _id: { $in: driverObjectIds } }).select("firstName").lean()
        : Promise.resolve([]),
      bookingIds.length > 0
        ? VehiclePhoto.find({ bookingId: { $in: bookingIds }, superseded: { $ne: true } })
            .select("bookingId checkpointType photoType cloudUrl capturedAt capturedLocation uploadedAt")
            .sort({ uploadedAt: 1 })
            .lean()
        : Promise.resolve([]),
      bookingIds.length > 0
        ? Incident.find({ bookingId: { $in: bookingIds }, status: { $nin: ["resolved", "closed"] } })
            .select("bookingId incidentType severity title status exceptionState occurredAt createdAt")
            .sort({ createdAt: -1 })
            .lean()
        : Promise.resolve([]),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lean() docs untyped
    const driverMap = new Map<string, string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (drivers as any[]).forEach((d) => driverMap.set(d._id.toString(), d.firstName || "Driver"));

    // Group photos + incidents by bookingId.
    const photosByBooking = new Map<string, TrackingPhoto[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (photos as any[]).forEach((p) => {
      const key = p.bookingId.toString();
      const list = photosByBooking.get(key) || [];
      if (list.length >= MAX_PHOTOS_PER_BOOKING) return;
      list.push({
        id: p._id.toString(),
        leg: p.checkpointType,
        legLabel: LEG_LABELS[p.checkpointType] || p.checkpointType,
        typeLabel: PHOTO_TYPE_LABELS[p.photoType] || p.photoType,
        url: p.cloudUrl || `/api/photos/${p._id.toString()}`,
        capturedAt: p.capturedAt ? new Date(p.capturedAt).toISOString() : (p.uploadedAt ? new Date(p.uploadedAt).toISOString() : null),
        capturedLocation: p.capturedLocation || null,
      });
      photosByBooking.set(key, list);
    });

    const incidentsByBooking = new Map<string, TrackingIncident[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (incidents as any[]).forEach((inc) => {
      const key = inc.bookingId.toString();
      const list = incidentsByBooking.get(key) || [];
      list.push({
        id: inc._id.toString(),
        type: inc.incidentType,
        severity: inc.severity,
        title: inc.title,
        status: inc.status,
        exceptionState: inc.exceptionState || "continue",
        occurredAt: inc.occurredAt ? new Date(inc.occurredAt).toISOString() : null,
        createdAt: new Date(inc.createdAt).toISOString(),
      });
      incidentsByBooking.set(key, list);
    });

    const cards: TrackingCard[] = rawBookings.map((b) => {
      const id = b._id.toString();

      const pickupDriverId = b.pickupDriver?.driverId?.toString();
      const returnDriverId = b.returnDriver?.driverId?.toString();

      const pickupDriver: TrackingDriver | null =
        b.pickupDriver && pickupDriverId
          ? { firstName: driverMap.get(pickupDriverId) || "Driver", state: pickupState(b.pickupDriver) }
          : null;
      const rtnDriver: TrackingDriver | null =
        b.returnDriver && returnDriverId
          ? { firstName: driverMap.get(returnDriverId) || "Driver", state: returnState(b.returnDriver) }
          : null;

      // Most recent updates first, capped.
      const rawUpdates = Array.isArray(b.updates) ? b.updates : [];
      const updates: TrackingUpdate[] = rawUpdates
        .slice(-MAX_UPDATES_PER_BOOKING)
        .reverse()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((u: any) => ({
          stage: u.stage,
          message: u.message,
          timestamp: new Date(u.timestamp).toISOString(),
          actor: u.updatedBy || "system",
        }));

      return {
        id,
        trackingCode: b.trackingCode || null,
        currentStage: b.currentStage,
        status: b.status,
        overallProgress: b.overallProgress ?? 0,
        vehicle: {
          model: b.vehicleModel || null,
          year: b.vehicleYear || null,
          rego: b.vehicleRegistration,
          regoState: b.vehicleState || null,
          transmission: b.transmissionType || "automatic",
          isManual: !!b.isManualTransmission,
        },
        customerFirstName: (b.userName || "Customer").split(" ")[0],
        pickupSuburb: deriveSuburb(b.pickupAddress),
        workshopName: b.garageName || null,
        workshopSuburb: deriveSuburb(b.garageAddress),
        serviceDate: b.serviceDate ? new Date(b.serviceDate).toISOString() : null,
        pickupTimeSlot: b.pickupTimeSlot || null,
        dropoffTimeSlot: b.dropoffTimeSlot || null,
        pickupDriver,
        returnDriver: rtnDriver,
        photos: photosByBooking.get(id) || [],
        updates,
        incidents: incidentsByBooking.get(id) || [],
        hasActiveIncident: !!b.hasActiveIncident || (incidentsByBooking.get(id)?.length ?? 0) > 0,
        incidentExceptionState: b.incidentExceptionState || "none",
        // "pending" only counts when a link actually exists — customers often
        // pay the service centre by phone, in which case nothing should show.
        servicePaymentStatus:
          b.servicePaymentStatus === "paid"
            ? "paid"
            : b.servicePaymentStatus === "pending" && b.servicePaymentUrl
              ? "pending"
              : null,
        servicePaymentAmount: b.servicePaymentAmount ?? null,
        servicePaymentMethod: b.servicePaymentMethod || null,
        createdAt: new Date(b.createdAt).toISOString(),
        updatedAt: new Date(b.updatedAt).toISOString(),
      };
    });

    return NextResponse.json({
      bookings: cards,
      count: cards.length,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    // Log server-side only; never leak PII to the client.
    console.error("Error fetching live tracking data:", error);
    return NextResponse.json({ error: "Failed to load live tracking data" }, { status: 500 });
  }
}
