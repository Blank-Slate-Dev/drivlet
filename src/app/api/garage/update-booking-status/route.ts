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
      // Gate on the GARAGE's own lifecycle, not the booking's overall status
      // (audit B-2) — the booking now stays `in_progress` for the whole job,
      // so the old `booking.status !== "in_progress"` check would never pass.
      //
      // "acknowledged" is accepted as well as "in_progress": a garage that
      // finished a quick job without pressing Start must not be trapped with
      // no way to close it out.
      if (!["acknowledged", "in_progress"].includes(booking.garageStatus)) {
        return NextResponse.json(
          { error: "Booking must be acknowledged before completing" },
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
    // The garage lifecycle lives entirely in `garageStatus`. Top-level `status`
    // stays "in_progress" until the driver delivers the car — writing
    // "completed" here is what previously killed the customer's tracking
    // (410 from /api/bookings/track) and removed the job from the dispatch
    // board so no return driver could be assigned.
    //
    // We DO set status to "in_progress" on start: the job genuinely is running,
    // the driver's start_pickup sets the same value, and several garage/admin
    // queries key off it. What we never do from here is set it to "completed".
    const nextProgress = status === "completed" ? 85 : 72;

    // Never rewind the customer's tracker. If the return driver has already
    // departed (driver_returning, 86) a late "mark complete" from the garage
    // must not drag the customer back to "Service In Progress".
    const movesForward = (booking.overallProgress ?? 0) < nextProgress;

    await Booking.findByIdAndUpdate(bookingId, {
      $set: {
        garageStatus: status === "completed" ? "completed" : "in_progress",
        ...(status === "in_progress" ? { status: "in_progress" } : {}),
        // "service_in_progress" is the only stage the customer tracker, the
        // stage-email map and the SMS map all understand between drop-off and
        // the return leg. Writing anything outside that set (e.g.
        // "service_completed") snaps the tracker back to step 1 — audit D-17.
        // Progress alone conveys "service done, awaiting return driver", and
        // 72/85 match the values the rest of the app already uses for those
        // two points (src/app/api/driver/jobs/route.ts, lib/servicePayment.ts).
        ...(movesForward
          ? { currentStage: "service_in_progress", overallProgress: nextProgress }
          : {}),
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
