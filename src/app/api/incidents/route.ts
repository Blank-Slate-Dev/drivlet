// src/app/api/incidents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Incident from "@/models/Incident";
import Booking from "@/models/Booking";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// POST /api/incidents — Create a new incident report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      bookingId,
      incidentType,
      severity,
      title,
      description,
      location,
      photos,
      thirdParty,
      policeInvolved,
      policeReference,
      vehicleStatus,
      dashcamFootageRef,
    } = body;

    // Validate required
    if (!bookingId || !incidentType || !severity || !title || !description || !location?.address) {
      return NextResponse.json(
        { error: "Missing required fields: bookingId, incidentType, severity, title, description, location.address" },
        { status: 400 }
      );
    }

    // Validate booking exists and driver is assigned
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const driverIdStr = user.driverProfile.toString();
    if (
      booking.assignedDriverId?.toString() !== driverIdStr &&
      booking.returnDriverId?.toString() !== driverIdStr
    ) {
      return NextResponse.json(
        { error: "You are not assigned to this booking" },
        { status: 403 }
      );
    }

    // Auto-determine exception state based on severity/type
    let exceptionState: "continue" | "hold" | "stop" = "continue";
    if (severity === "critical" || incidentType === "road_accident") {
      exceptionState = "stop";
    } else if (severity === "high") {
      exceptionState = "hold";
    }

    const incident = await Incident.create({
      bookingId,
      driverId: user.driverProfile,
      reportedBy: session.user.id,
      incidentType,
      severity,
      title,
      description,
      occurredAt: new Date(),
      location,
      bookingStage: booking.currentStage || "unknown",
      photos: photos || [],
      thirdParty: thirdParty || undefined,
      policeInvolved: policeInvolved || false,
      policeReference: policeReference || undefined,
      exceptionState,
      status: "open",
      vehicleStatus: vehicleStatus || "unknown",
      dashcamFootageRef: dashcamFootageRef || undefined,
    });

    // Update booking with incident reference
    await Booking.findByIdAndUpdate(bookingId, {
      $push: { incidents: incident._id },
      hasActiveIncident: true,
      incidentExceptionState: exceptionState,
    });

    return NextResponse.json({ incident, exceptionState }, { status: 201 });
  } catch (error) {
    console.error("Error creating incident:", error);
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 });
  }
}
