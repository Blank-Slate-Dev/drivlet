import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const rateCheck = withRateLimit(request, RATE_LIMITS.form, "pay-verify");
  if (!rateCheck.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { token } = await params;

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  try {
    await connectDB();

    const bookingRequest = await BookingRequest.findOne({ paymentToken: token });

    if (!bookingRequest) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }

    if (bookingRequest.status === "paid" || bookingRequest.convertedBookingId) {
      // Include the reference so the pay page can show a friendly, identifiable "already paid" state.
      return NextResponse.json(
        { error: "already_paid", reference: bookingRequest._id.toString().slice(-6).toUpperCase() },
        { status: 410 }
      );
    }

    if (!["approved", "payment_link_sent"].includes(bookingRequest.status)) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }

    const firstName = bookingRequest.userName.split(" ")[0];
    const ref = bookingRequest._id.toString().slice(-6).toUpperCase();

    return NextResponse.json({
      firstName,
      vehicleRegistration: bookingRequest.vehicleRegistration,
      pickupAddress: bookingRequest.pickupAddress,
      garageName: bookingRequest.garageName || null,
      amount: bookingRequest.quotedAmount,
      amountDisplay: `$${(bookingRequest.quotedAmount / 100).toFixed(2)}`,
      reference: ref,
      status: bookingRequest.status,
    });
  } catch (error) {
    console.error("Failed to verify payment token:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
