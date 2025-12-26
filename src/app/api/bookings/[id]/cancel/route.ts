// src/app/api/bookings/[id]/cancel/route.ts
// Handles booking cancellation requests with refund processing

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { calculateRefund, formatRefundAmount } from "@/lib/refund-calculator";
import { processRefund } from "@/lib/stripe-refund";

interface CancelRequestBody {
  cancellationReason?: string;
  forceFullRefund?: boolean; // Admin only
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: bookingId } = await params;

    // Parse request body
    let body: CancelRequestBody = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    await connectDB();

    // Find the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Determine if user is authorized to cancel
    const isAdmin = session?.user?.role === "admin";
    const isOwner =
      (session?.user?.id && booking.userId?.toString() === session.user.id) ||
      (session?.user?.email &&
        booking.userEmail.toLowerCase() === session.user.email.toLowerCase());

    // Guest cancellation - allow if email matches
    const isGuestOwner = !session?.user && booking.isGuest;

    if (!isAdmin && !isOwner && !isGuestOwner) {
      return NextResponse.json(
        { error: "You are not authorized to cancel this booking" },
        { status: 403 }
      );
    }

    // Check if already cancelled
    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "This booking has already been cancelled" },
        { status: 400 }
      );
    }

    // Calculate refund eligibility
    const refundCalc = calculateRefund(
      booking.pickupTime,
      booking.paymentAmount || 0,
      booking.status,
      booking.currentStage
    );

    // If can't cancel and not admin, block
    if (!refundCalc.canCancel && !isAdmin) {
      return NextResponse.json(
        {
          error: refundCalc.reason,
          canCancel: false,
        },
        { status: 400 }
      );
    }

    // Admin override for full refund
    let finalRefundAmount = refundCalc.amount;
    let finalRefundPercentage = refundCalc.percentage;

    if (isAdmin && body.forceFullRefund && booking.paymentAmount) {
      finalRefundAmount = booking.paymentAmount;
      finalRefundPercentage = 100;
    }

    // Process Stripe refund if applicable
    let refundResult: {
      success: boolean;
      refundId?: string;
      estimatedArrival?: string;
      error?: string;
    } = {
      success: true,
    };

    if (finalRefundAmount > 0 && booking.paymentId) {
      refundResult = await processRefund(
        booking.paymentId,
        finalRefundAmount,
        body.cancellationReason || "Customer requested cancellation"
      );

      if (!refundResult.success) {
        // Log refund failure but still cancel the booking
        console.error("Refund failed for booking:", bookingId, refundResult);
      }
    }

    // Determine refund status
    let refundStatus: "pending" | "succeeded" | "failed" | "not_applicable" =
      "not_applicable";
    if (finalRefundAmount > 0) {
      refundStatus = refundResult.success ? "succeeded" : "failed";
    }

    // Update booking status
    const cancellationDetails = {
      cancelledAt: new Date(),
      cancelledBy: session?.user?.id || "guest",
      cancelledByRole: isAdmin ? "admin" : "customer",
      reason: body.cancellationReason || undefined,
      refundAmount: finalRefundAmount,
      refundPercentage: finalRefundPercentage,
      refundId: refundResult.refundId,
      refundStatus,
    };

    // Build cancellation update message
    let cancellationMessage = "Booking cancelled";
    if (finalRefundAmount > 0 && refundResult.success) {
      cancellationMessage = `Booking cancelled. A refund of ${formatRefundAmount(finalRefundAmount)} (${finalRefundPercentage}%) has been processed.`;
    } else if (finalRefundAmount > 0 && !refundResult.success) {
      cancellationMessage = `Booking cancelled. Refund processing failed - our team will process this manually.`;
    } else {
      cancellationMessage =
        "Booking cancelled. No refund applicable based on cancellation policy.";
    }

    await Booking.findByIdAndUpdate(bookingId, {
      $set: {
        status: "cancelled",
        currentStage: "cancelled",
        cancellation: cancellationDetails,
        paymentStatus:
          refundStatus === "succeeded"
            ? "refunded"
            : booking.paymentStatus,
        updatedAt: new Date(),
      },
      $push: {
        updates: {
          stage: "cancelled",
          timestamp: new Date(),
          message: cancellationMessage,
          updatedBy: isAdmin ? "admin" : "customer",
        },
      },
    });

    // Notify assigned garage if applicable
    if (booking.assignedGarageId) {
      // TODO: Send notification to garage
      console.log(
        `Garage ${booking.assignedGarageId} should be notified of cancellation`
      );
    }

    // Prepare response
    const response = {
      success: true,
      message: cancellationMessage,
      booking: {
        _id: booking._id,
        vehicleRegistration: booking.vehicleRegistration,
        status: "cancelled",
      },
      refund: {
        amount: finalRefundAmount,
        amountFormatted: formatRefundAmount(finalRefundAmount),
        percentage: finalRefundPercentage,
        refundId: refundResult.refundId,
        status: refundStatus,
        estimatedArrival: refundResult.estimatedArrival,
      },
      policy: {
        reason: refundCalc.reason,
        hoursUntilPickup: refundCalc.hoursUntilPickup,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking. Please try again." },
      { status: 500 }
    );
  }
}

// GET - Check cancellation eligibility and refund amount
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: bookingId } = await params;

    await connectDB();

    // Find the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check authorization
    const isAdmin = session?.user?.role === "admin";
    const isOwner =
      (session?.user?.id && booking.userId?.toString() === session.user.id) ||
      (session?.user?.email &&
        booking.userEmail.toLowerCase() === session.user.email.toLowerCase());

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Calculate refund eligibility
    const refundCalc = calculateRefund(
      booking.pickupTime,
      booking.paymentAmount || 0,
      booking.status,
      booking.currentStage
    );

    return NextResponse.json({
      canCancel: refundCalc.canCancel,
      eligible: refundCalc.eligible,
      refund: {
        amount: refundCalc.amount,
        amountFormatted: formatRefundAmount(refundCalc.amount),
        percentage: refundCalc.percentage,
      },
      policy: {
        reason: refundCalc.reason,
        hoursUntilPickup: refundCalc.hoursUntilPickup,
        freeUntil: refundCalc.freeUntil?.toISOString(),
      },
      booking: {
        _id: booking._id,
        vehicleRegistration: booking.vehicleRegistration,
        pickupTime: booking.pickupTime,
        status: booking.status,
        currentStage: booking.currentStage,
        paymentAmount: booking.paymentAmount,
      },
    });
  } catch (error) {
    console.error("Error checking cancellation eligibility:", error);
    return NextResponse.json(
      { error: "Failed to check cancellation eligibility" },
      { status: 500 }
    );
  }
}
