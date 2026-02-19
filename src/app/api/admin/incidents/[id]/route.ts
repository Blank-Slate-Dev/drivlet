// src/app/api/admin/incidents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import Incident from "@/models/Incident";
import Booking from "@/models/Booking";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// GET /api/admin/incidents/[id] — Get single incident with full details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
    }

    const incident = await Incident.findById(id)
      .populate("driverId", "firstName lastName phone email")
      .populate("bookingId", "vehicleRegistration garageName userName userEmail pickupAddress currentStage status vehicleModel vehicleColor")
      .populate("reportedBy", "username email")
      .populate("resolution.resolvedBy", "username email")
      .populate("adminNotes.addedBy", "username email")
      .lean();

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    return NextResponse.json({ incident });
  } catch (error) {
    console.error("Error fetching incident:", error);
    return NextResponse.json({ error: "Failed to fetch incident" }, { status: 500 });
  }
}

// PATCH /api/admin/incidents/[id] — Update incident
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, exceptionState, vehicleStatus, customerNotified, resolution } = body;

    if (status) incident.status = status;
    if (exceptionState) incident.exceptionState = exceptionState;
    if (vehicleStatus) incident.vehicleStatus = vehicleStatus;

    if (customerNotified !== undefined) {
      incident.customerNotified = customerNotified;
      if (customerNotified && !incident.customerNotifiedAt) {
        incident.customerNotifiedAt = new Date();
      }
    }

    if (resolution) {
      incident.status = "resolved";
      incident.resolution = {
        resolvedBy: adminCheck.session.user.id,
        resolvedAt: new Date(),
        outcome: resolution.outcome || "",
        notes: resolution.notes || "",
        insuranceClaim: resolution.insuranceClaim || false,
        claimReference: resolution.claimReference || undefined,
      };
    }

    await incident.save();

    // Update booking exception state if changed
    if (exceptionState || status === "resolved" || status === "closed") {
      const bookingUpdate: Record<string, unknown> = {};

      if (status === "resolved" || status === "closed") {
        // Check if there are other active incidents on this booking
        const activeIncidents = await Incident.countDocuments({
          bookingId: incident.bookingId,
          _id: { $ne: incident._id },
          status: { $in: ["open", "investigating", "awaiting_response"] },
        });

        if (activeIncidents === 0) {
          bookingUpdate.hasActiveIncident = false;
          bookingUpdate.incidentExceptionState = "none";
        }
      } else if (exceptionState) {
        bookingUpdate.incidentExceptionState = exceptionState;
      }

      if (Object.keys(bookingUpdate).length > 0) {
        await Booking.findByIdAndUpdate(incident.bookingId, bookingUpdate);
      }
    }

    return NextResponse.json({ incident });
  } catch (error) {
    console.error("Error updating incident:", error);
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 });
  }
}
