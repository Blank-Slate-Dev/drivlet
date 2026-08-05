// src/app/api/garage/acknowledge-booking/route.ts
// ⚠️ MUST FIX BEFORE PHASE 2 (item 1 in src/lib/garagePortal.ts): the
// name-normalisation below splits on the first " - ", letting chain
// branches with the same bare name claim each other's bookings. Require
// garagePlaceId equality / full-name comparison before re-enabling.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import Booking from "@/models/Booking";
import { garagePortalGate } from "@/lib/garagePortal";

export async function POST(request: Request) {
  // PHASE 1: garage portal is inert — see src/lib/garagePortal.ts
  const gate = garagePortalGate();
  if (gate) return gate;

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const garage = await Garage.findOne({ userId: user._id });
    if (!garage) {
      return NextResponse.json(
        { error: "Garage profile not found" },
        { status: 404 }
      );
    }

    // Only approved garages can acknowledge
    if (garage.status !== "approved") {
      return NextResponse.json(
        { error: "Garage must be approved to acknowledge bookings" },
        { status: 403 }
      );
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify this booking belongs to this garage
    const linkedPlaceId = garage.linkedGaragePlaceId || "";
    const linkedGarageName = garage.linkedGarageName || "";

    // SECURITY (audit RISK-1): this authorisation check previously used an
    // UNANCHORED substring match on the garage name AND did not require the
    // booking to be unassigned — while the write below overwrites
    // `assignedGarageId`. A garage whose linked name is a substring of another
    // garage's name (e.g. "Midas" vs "Midas Tuggeranong") could POST any
    // booking id and seize a job already assigned to that other garage,
    // gaining the customer's contact details and the revenue attribution.
    //
    // Now: an already-assigned booking may only be acknowledged by the garage
    // it is assigned to. An unassigned booking may be claimed on an exact
    // placeId match, or — as a fallback for bookings created before placeIds
    // were captured — an EXACT (case-insensitive, trimmed) name match.
    const alreadyAssigned = Boolean(booking.assignedGarageId);
    const isAssigned =
      booking.assignedGarageId?.toString() === garage._id.toString();

    // The booking's garageName comes from GarageAutocomplete, which formats it
    // as "<name> - <suburb>"; the garage's linkedGarageName is the bare Places
    // display name. Compare the part before the suburb suffix so the fallback
    // can actually match, while staying an EXACT comparison (a substring match
    // is what allowed one garage to seize another's bookings).
    const normalise = (v: string) =>
      v.split(" - ")[0].replace(/\s+/g, " ").trim().toLowerCase();
    const matchesPlaceId = Boolean(
      linkedPlaceId && booking.garagePlaceId === linkedPlaceId
    );
    const matchesName = Boolean(
      linkedGarageName &&
        booking.garageName &&
        normalise(booking.garageName) === normalise(linkedGarageName)
    );

    const authorised = isAssigned || (!alreadyAssigned && (matchesPlaceId || matchesName));

    if (!authorised) {
      return NextResponse.json(
        { error: "This booking is not assigned to your garage" },
        { status: 403 }
      );
    }

    // Update booking to acknowledged status
    const now = new Date();
    await Booking.findByIdAndUpdate(bookingId, {
      $set: {
        garageStatus: "acknowledged",
        assignedGarageId: garage._id, // Ensure it's assigned
        assignedAt: booking.assignedAt || now,
        updatedAt: now,
      },
      $push: {
        updates: {
          stage: "garage_acknowledged",
          timestamp: now,
          message: `${garage.businessName} has acknowledged this booking`,
          updatedBy: user._id.toString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Booking acknowledged successfully",
    });
  } catch (error) {
    console.error("Error acknowledging booking:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge booking" },
      { status: 500 }
    );
  }
}
