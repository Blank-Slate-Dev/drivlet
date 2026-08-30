import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import Booking from "@/models/Booking";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { isPaymentLinkExpired } from "@/lib/paymentLinkExpiry";
import { releasePromoCodeForUsage } from "@/lib/promoCodes";
import { stripe } from "@/lib/stripe";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const rateCheck = await withRateLimit(request, RATE_LIMITS.form, "pay-verify");
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
      // Already paid — include the summary and (once the webhook has converted the
      // request into a Booking) the tracking code, so the confirmation screen can
      // show it without waiting for the email.
      let trackingCode: string | null = null;
      if (bookingRequest.convertedBookingId) {
        const booking = await Booking.findById(bookingRequest.convertedBookingId)
          .select("trackingCode")
          .lean();
        trackingCode = booking?.trackingCode || null;
      }

      return NextResponse.json(
        {
          error: "already_paid",
          reference: bookingRequest._id.toString().slice(-6).toUpperCase(),
          trackingCode,
          vehicleRegistration: bookingRequest.vehicleRegistration,
          pickupAddress: bookingRequest.pickupAddress,
          garageName: bookingRequest.garageName || null,
          serviceDate: bookingRequest.serviceDate
            ? bookingRequest.serviceDate.toISOString()
            : null,
          pickupTimeSlot: bookingRequest.pickupTimeSlot || null,
          dropoffTimeSlot: bookingRequest.dropoffTimeSlot || null,
          amount: bookingRequest.quotedAmount,
          amountDisplay: `$${(bookingRequest.quotedAmount / 100).toFixed(2)}`,
        },
        { status: 410 }
      );
    }

    if (!["approved", "payment_link_sent"].includes(bookingRequest.status)) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }

    // Lazy expiry (re-audit 2026-08-30): links older than the TTL are marked
    // expired on first use — mirroring decline: token nulled, PI cancelled,
    // promo released, slot freed. Admins revive via "Resend Payment Link".
    // The atomic status filter means a request the webhook just converted can
    // never be clobbered to "expired".
    if (isPaymentLinkExpired(bookingRequest)) {
      const expiredRequest = await BookingRequest.findOneAndUpdate(
        {
          _id: bookingRequest._id,
          status: { $in: ["approved", "payment_link_sent"] },
        },
        {
          $set: {
            status: "expired",
            paymentToken: null,
            adminNotes: [bookingRequest.adminNotes, "Payment link expired (7-day TTL)"]
              .filter(Boolean)
              .join("\n"),
            updatedAt: new Date(),
          },
        },
        { new: true }
      );
      if (expiredRequest) {
        if (expiredRequest.paymentIntentId) {
          try {
            await stripe.paymentIntents.cancel(expiredRequest.paymentIntentId);
          } catch {
            // Already succeeded/cancelled or transient — the webhook's
            // expired-status refusal is the backstop
          }
        }
        if (expiredRequest.promoCode) {
          await releasePromoCodeForUsage({
            code: expiredRequest.promoCode,
            requestId: expiredRequest._id,
          });
        }
      }
      // If the atomic update matched nothing the request was just paid —
      // the generic invalid response is fine; a refresh shows already-paid.
      return NextResponse.json({ error: "expired" }, { status: 404 });
    }

    const firstName = bookingRequest.userName.split(" ")[0];
    const ref = bookingRequest._id.toString().slice(-6).toUpperCase();

    return NextResponse.json({
      firstName,
      vehicleRegistration: bookingRequest.vehicleRegistration,
      pickupAddress: bookingRequest.pickupAddress,
      garageName: bookingRequest.garageName || null,
      serviceDate: bookingRequest.serviceDate
        ? bookingRequest.serviceDate.toISOString()
        : null,
      pickupTimeSlot: bookingRequest.pickupTimeSlot || null,
      dropoffTimeSlot: bookingRequest.dropoffTimeSlot || null,
      amount: bookingRequest.quotedAmount,
      amountDisplay: `$${(bookingRequest.quotedAmount / 100).toFixed(2)}`,
      // Promo applied at booking (quotedAmount is already discounted)
      promoCode: bookingRequest.promoCode || null,
      promoPercentOff: bookingRequest.promoPercentOff || null,
      promoDiscountAmount: bookingRequest.promoDiscountAmount || null,
      reference: ref,
      status: bookingRequest.status,
    });
  } catch (error) {
    console.error("Failed to verify payment token:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
