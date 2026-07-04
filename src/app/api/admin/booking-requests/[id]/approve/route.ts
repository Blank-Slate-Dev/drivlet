import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import Booking from "@/models/Booking";
import { MAX_BOOKINGS_PER_SLOT } from "@/config/timeSlots";
import crypto from "crypto";

// Statuses (besides live bookings) that already hold a slot for a date.
const SLOT_HOLDING_REQUEST_STATUSES = ["approved", "payment_link_sent", "accepted_awaiting_payment"];

// Count how many bookings + slot-holding requests already occupy a given slot on a date,
// excluding the request currently being approved.
async function countSlotUsage(
  serviceDate: Date,
  slotField: "pickupTimeSlot" | "dropoffTimeSlot",
  slotValue: string,
  excludeRequestId: string
): Promise<number> {
  const startOfDay = new Date(serviceDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(serviceDate);
  endOfDay.setHours(23, 59, 59, 999);

  const [bookingCount, requestCount] = await Promise.all([
    Booking.countDocuments({
      serviceDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: "cancelled" },
      [slotField]: slotValue,
    }),
    BookingRequest.countDocuments({
      _id: { $ne: excludeRequestId },
      serviceDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: SLOT_HOLDING_REQUEST_STATUSES },
      [slotField]: slotValue,
    }),
  ]);

  return bookingCount + requestCount;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  const { id } = await params;

  try {
    await connectDB();

    const bookingRequest = await BookingRequest.findById(id);
    if (!bookingRequest) {
      return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
    }

    if (bookingRequest.status !== "pending_review") {
      return NextResponse.json(
        { error: `Cannot approve a request with status "${bookingRequest.status}"` },
        { status: 400 }
      );
    }

    // Slot capacity guard — approving reserves the slot, so block if either the pickup
    // or drop-off slot for this date is already full (bookings + other approved requests).
    if (bookingRequest.pickupTimeSlot) {
      const pickupUsage = await countSlotUsage(
        bookingRequest.serviceDate,
        "pickupTimeSlot",
        bookingRequest.pickupTimeSlot,
        id
      );
      if (pickupUsage >= MAX_BOOKINGS_PER_SLOT) {
        return NextResponse.json(
          { error: "The pickup slot for this date is fully booked. Edit the request to a different slot before approving." },
          { status: 409 }
        );
      }
    }
    if (bookingRequest.dropoffTimeSlot) {
      const dropoffUsage = await countSlotUsage(
        bookingRequest.serviceDate,
        "dropoffTimeSlot",
        bookingRequest.dropoffTimeSlot,
        id
      );
      if (dropoffUsage >= MAX_BOOKINGS_PER_SLOT) {
        return NextResponse.json(
          { error: "The drop-off slot for this date is fully booked. Edit the request to a different slot before approving." },
          { status: 409 }
        );
      }
    }

    const paymentToken = crypto.randomBytes(32).toString("hex");
    const now = new Date();

    bookingRequest.status = "approved";
    bookingRequest.paymentToken = paymentToken;
    bookingRequest.paymentTokenCreatedAt = now;
    bookingRequest.approvedAt = now;
    bookingRequest.approvedBy = adminCheck.session.user?.email || "admin";
    bookingRequest.reviewedBy = null;
    bookingRequest.reviewedAt = now;

    await bookingRequest.save();

    return NextResponse.json({
      success: true,
      request: bookingRequest,
    });
  } catch (error) {
    console.error("Failed to approve booking request:", error);
    return NextResponse.json({ error: "Failed to approve booking request" }, { status: 500 });
  }
}
