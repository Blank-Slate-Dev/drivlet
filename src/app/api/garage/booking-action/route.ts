// src/app/api/garage/booking-action/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import Booking from "@/models/Booking";
import GarageNotification from "@/models/GarageNotification";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const garage = await Garage.findOne({ userId: user._id });
    if (!garage) {
      return NextResponse.json({ error: "Garage profile not found" }, { status: 404 });
    }

    // Only approved garages can take actions
    if (garage.status !== "approved") {
      return NextResponse.json(
        { error: "Garage must be approved to take booking actions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { bookingId, action, notes } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    if (!action || !["accept", "decline", "start", "complete"].includes(action)) {
      return NextResponse.json(
        { error: "Valid action is required (accept, decline, start, complete)" },
        { status: 400 }
      );
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify this booking belongs to this garage (either assigned or matches linked garage)
    const isAssigned = booking.assignedGarageId?.toString() === garage._id.toString();
    const matchesLinkedGarage =
      (garage.linkedGaragePlaceId && booking.garagePlaceId === garage.linkedGaragePlaceId) ||
      (garage.linkedGarageName && booking.garageName?.toLowerCase() === garage.linkedGarageName.toLowerCase());

    if (!isAssigned && !matchesLinkedGarage) {
      return NextResponse.json(
        { error: "This booking is not assigned to your garage" },
        { status: 403 }
      );
    }

    // Process the action
    const now = new Date();
    let updateData: Record<string, unknown> = {};
    let notificationTitle = "";
    let notificationMessage = "";

    switch (action) {
      case "accept":
        if (booking.garageStatus !== "new") {
          return NextResponse.json(
            { error: "Can only accept new bookings" },
            { status: 400 }
          );
        }
        updateData = {
          garageStatus: "accepted",
          garageAcceptedAt: now,
          assignedGarageId: garage._id,
          assignedAt: booking.assignedAt || now,
          garageResponse: {
            respondedAt: now,
            respondedBy: user._id,
            notes: notes || "",
          },
          $push: {
            updates: {
              stage: "garage_accepted",
              timestamp: now,
              message: `Booking accepted by ${garage.businessName}${notes ? `: ${notes}` : ""}`,
              updatedBy: user._id.toString(),
            },
          },
        };
        notificationTitle = "Booking Accepted";
        notificationMessage = `You have accepted the booking for ${booking.vehicleRegistration}`;
        break;

      case "decline":
        if (booking.garageStatus !== "new") {
          return NextResponse.json(
            { error: "Can only decline new bookings" },
            { status: 400 }
          );
        }
        updateData = {
          garageStatus: "declined",
          garageResponse: {
            respondedAt: now,
            respondedBy: user._id,
            notes: notes || "",
          },
          $push: {
            updates: {
              stage: "garage_declined",
              timestamp: now,
              message: `Booking declined by ${garage.businessName}${notes ? `: ${notes}` : ""}`,
              updatedBy: user._id.toString(),
            },
          },
        };
        // Clear assignment so booking can be reassigned
        if (booking.assignedGarageId?.toString() === garage._id.toString()) {
          updateData.assignedGarageId = null;
          updateData.assignedAt = null;
        }
        notificationTitle = "Booking Declined";
        notificationMessage = `You have declined the booking for ${booking.vehicleRegistration}`;
        break;

      case "start":
        if (booking.garageStatus !== "accepted") {
          return NextResponse.json(
            { error: "Can only start accepted bookings" },
            { status: 400 }
          );
        }
        updateData = {
          garageStatus: "in_progress",
          status: "in_progress",
          currentStage: "service_in_progress",
          overallProgress: 50,
          $push: {
            updates: {
              stage: "service_started",
              timestamp: now,
              message: `Service started by ${garage.businessName}${notes ? `: ${notes}` : ""}`,
              updatedBy: user._id.toString(),
            },
          },
        };
        notificationTitle = "Service Started";
        notificationMessage = `Service has been started for ${booking.vehicleRegistration}`;
        break;

      case "complete":
        if (booking.garageStatus !== "in_progress") {
          return NextResponse.json(
            { error: "Can only complete in-progress bookings" },
            { status: 400 }
          );
        }
        updateData = {
          garageStatus: "completed",
          garageCompletedAt: now,
          status: "completed",
          currentStage: "service_completed",
          overallProgress: 100,
          $push: {
            updates: {
              stage: "service_completed",
              timestamp: now,
              message: `Service completed by ${garage.businessName}${notes ? `: ${notes}` : ""}`,
              updatedBy: user._id.toString(),
            },
          },
        };
        notificationTitle = "Service Completed";
        notificationMessage = `Service has been completed for ${booking.vehicleRegistration}`;
        break;
    }

    // Update the booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      updateData,
      { new: true }
    );

    // Create notification for the garage
    await GarageNotification.create({
      garageId: garage._id,
      bookingId: booking._id,
      type: "booking_update",
      title: notificationTitle,
      message: notificationMessage,
      metadata: {
        vehicleRegistration: booking.vehicleRegistration,
        serviceType: booking.serviceType,
        pickupTime: new Date(booking.pickupTime),
        customerName: booking.userName,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Booking ${action}ed successfully`,
      booking: {
        _id: updatedBooking?._id.toString(),
        garageStatus: updatedBooking?.garageStatus,
        status: updatedBooking?.status,
      },
    });
  } catch (error) {
    console.error("Error processing booking action:", error);
    return NextResponse.json(
      { error: "Failed to process booking action" },
      { status: 500 }
    );
  }
}
