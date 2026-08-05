// src/app/api/garage/update-booking-status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import Booking from "@/models/Booking";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    const { bookingId, status } = await request.json();

    if (!bookingId || !status) {
      return NextResponse.json(
        { error: "Booking ID and status are required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["in_progress", "completed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'in_progress' or 'completed'" },
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

    // Only approved garages can update status
    if (garage.status !== "approved") {
      return NextResponse.json(
        { error: "Garage must be approved to update booking status" },
        { status: 403 }
      );
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify this booking belongs to this garage
    if (booking.assignedGarageId?.toString() !== garage._id.toString()) {
      return NextResponse.json(
        { error: "This booking is not assigned to your garage" },
        { status: 403 }
      );
    }

    // Validate status transitions
    if (status === "in_progress") {
      if (booking.garageStatus !== "acknowledged") {
        return NextResponse.json(
          { error: "Booking must be acknowledged before starting" },
          { status: 400 }
        );
      }
    } else if (status === "completed") {
      // Gate on the GARAGE's own state, not the booking's overall status
      // (audit B-2). The booking stays `in_progress` for the whole job now,
      // so checking booking.status here would never pass.
      if (booking.garageStatus !== "in_progress") {
        return NextResponse.json(
          { error: "Service must be started before completing" },
          { status: 400 }
        );
      }
    }

    // Build update object
    const now = new Date();
    const updateMessage =
      status === "in_progress"
        ? `${garage.businessName} has started the service`
        : `${garage.businessName} has completed the service`;

    const updateStage =
      status === "in_progress" ? "service_started" : "service_completed";

    // IMPORTANT (audit B-2 / B-3): the garage finishing the SERVICE is not the
    // job finishing. This used to write top-level `status: "completed"`, which
    //   1. made /api/bookings/track return 410 "tracking code no longer
    //      active" while the car was still at the workshop, and
    //   2. removed the booking from the dispatch board's unassigned-returns
    //      query, so no return driver could ever be assigned.
    // Only `status: "delivered"` on the driver's return leg completes a job.
    //
    // We also now write currentStage/overallProgress (B-3) — the customer
    // tracker renders from those, so garage progress was previously invisible
    // — and the correct schema fields `garageAcceptedAt`/`garageCompletedAt`
    // (D-2). `startedAt`/`completedAt` do not exist at Booking top level and
    // were being silently dropped by Mongoose, which is why the garage's
    // "Completed (Month)" and revenue tiles always read zero.
    await Booking.findByIdAndUpdate(bookingId, {
      $set: {
        // top-level `status` deliberately left untouched
        garageStatus: status === "completed" ? "completed" : "in_progress",
        // Both map to "service_in_progress" because that is the only stage the
        // customer tracker, the stage-email map and the SMS map all understand
        // between drop-off and the return leg. Writing a stage outside that set
        // (e.g. "service_completed") snaps the tracker back to step 1 — see
        // audit D-17/D-18. Progress alone conveys "service done, awaiting
        // return driver".
        currentStage: "service_in_progress",
        overallProgress: status === "completed" ? 65 : 50,
        updatedAt: now,
        ...(status === "in_progress" && { garageAcceptedAt: now }),
        ...(status === "completed" && { garageCompletedAt: now }),
      },
      $push: {
        updates: {
          stage: updateStage,
          timestamp: now,
          message: updateMessage,
          updatedBy: user._id.toString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Booking status updated to ${status}`,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    return NextResponse.json(
      { error: "Failed to update booking status" },
      { status: 500 }
    );
  }
}
