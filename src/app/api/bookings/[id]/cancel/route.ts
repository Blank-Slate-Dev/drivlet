// src/app/api/bookings/[id]/cancel/route.ts
// Handles booking cancellation requests with refund processing

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { calculateRefund, formatRefundAmount } from "@/lib/refund-calculator";
import { releasePromoCodeForUsage } from "@/lib/promoCodes";
import { requireValidOrigin } from "@/lib/validation";
import { notifyGarageOfCancellation } from "@/lib/notifications";

interface CancelRequestBody {
  cancellationReason?: string;
  forceFullRefund?: boolean; // Admin only
  // Guest cancellation verification
  guestEmail?: string;
  guestPhone?: string;
  guestVehicleRego?: string; // Required when phone not on booking
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection - validate request origin for state-changing operation
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json(
      { error: originCheck.error },
      { status: 403 }
    );
  }

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

    // Direct cancellation is an admin-only action. Customers file a
    // cancellation request via /api/bookings/[id]/cancel-request instead
    // (>3h before pickup), or call support inside the cutoff.
    const isAdmin = session?.user?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json(
        {
          error:
            "Bookings can no longer be cancelled directly. Please use the cancellation request option on your dashboard, or call support.",
        },
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

    // Cancelling never moves money — refunds are a separate manual admin
    // action via /api/admin/bookings/[id]/refund.
    const cancellationDetails = {
      cancelledAt: new Date(),
      cancelledBy: session?.user?.id || "admin",
      cancelledByRole: "admin",
      reason: body.cancellationReason || undefined,
      refundAmount: 0,
      refundPercentage: 0,
      refundStatus: "not_applicable" as const,
    };

    const cancellationMessage =
      booking.paymentStatus === "paid"
        ? "Booking cancelled by drivlet. Any refund will be processed separately by our team."
        : "Booking cancelled by drivlet.";

    // Free any redeemed promo code — the cancelled booking never used it
    if (booking.promoCode) {
      await releasePromoCodeForUsage({
        code: booking.promoCode,
        bookingId: booking._id,
        requestId: null,
      });
    }

    await Booking.findByIdAndUpdate(bookingId, {
      $set: {
        status: "cancelled",
        currentStage: "cancelled",
        cancellation: cancellationDetails,
        updatedAt: new Date(),
      },
      $push: {
        updates: {
          stage: "cancelled",
          timestamp: new Date(),
          message: cancellationMessage,
          updatedBy: "admin",
        },
      },
    });

    // Notify assigned garage if applicable
    if (booking.assignedGarageId) {
      try {
        await notifyGarageOfCancellation(booking.assignedGarageId, {
          _id: booking._id,
          vehicleRegistration: booking.vehicleRegistration,
          userName: booking.userName || booking.userEmail,
        });
      } catch (notifyErr) {
        console.error("Failed to notify garage of cancellation:", notifyErr);
      }
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
