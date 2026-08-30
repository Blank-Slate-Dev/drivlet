import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import { sendConfirmationWithPayLink } from "@/lib/requestConfirmationEmail";
import { isPaymentLinkExpired } from "@/lib/paymentLinkExpiry";
import crypto from "crypto";

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

    // audit B-20: "accepted_awaiting_payment" is a live enum value that is
    // included in OPEN_REQUEST_STATUSES, so those rows render a "Send Link"
    // button on /admin/bookings — but this route rejected them, making the row
    // a dead end.
    // "expired" allowed since 2026-08-30: resending is the admin's way to
    // REVIVE a lapsed payment link (7-day TTL) — a fresh token is issued below.
    if (!["approved", "payment_link_sent", "accepted_awaiting_payment", "expired"].includes(bookingRequest.status)) {
      return NextResponse.json(
        { error: `Cannot send payment link for status "${bookingRequest.status}"` },
        { status: 400 }
      );
    }

    // Regenerate when the token is missing (never issued, or nulled by
    // expiry/decline of a previous link) or past its TTL — the resent email
    // must never carry a link that dies on arrival.
    if (!bookingRequest.paymentToken || isPaymentLinkExpired(bookingRequest)) {
      bookingRequest.paymentToken = crypto.randomBytes(32).toString("hex");
      bookingRequest.paymentTokenCreatedAt = new Date();
    }

    // Shared email builder (same one approval sends automatically)
    const { sent: emailSent, payLink } = await sendConfirmationWithPayLink(bookingRequest);

    bookingRequest.status = "payment_link_sent";
    bookingRequest.paymentLinkSentAt = new Date();
    bookingRequest.paymentLinkUrl = payLink;
    await bookingRequest.save();

    return NextResponse.json({
      success: true,
      emailSent,
      paymentLink: payLink,
    });
  } catch (error) {
    console.error("Failed to send payment link:", error);
    return NextResponse.json({ error: "Failed to send payment link" }, { status: 500 });
  }
}
