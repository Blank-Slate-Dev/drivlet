import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import { sendConfirmationWithPayLink } from "@/lib/requestConfirmationEmail";
import { isPaymentLinkExpired } from "@/lib/paymentLinkExpiry";
import { countSlotUsage } from "@/lib/slotCapacity";
import { MAX_BOOKINGS_PER_SLOT } from "@/config/timeSlots";
import { claimPromoCode } from "@/lib/promoCodes";
import PromoCode from "@/models/PromoCode";
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

    // Reviving an EXPIRED request must re-earn what lazy expiry gave back
    // (re-audit 2026-08-30 RB-2):
    //  1. The slot — it stopped counting toward capacity and may have been
    //     refilled by another approval. Re-run the approve-time check.
    //  2. The promo code — expiry released it, but quotedAmount is still
    //     discounted. Atomically re-claim it; if someone else has redeemed
    //     it since, refuse with a clear next step instead of silently
    //     double-spending the discount.
    // Slot re-check applies whenever the OLD link had lapsed past the TTL —
    // not only when lazy expiry has already flipped the status. A link can
    // lapse while status stays payment_link_sent (customer never re-opened
    // it); slot counting stopped counting this request the moment its TTL
    // passed, so a plain Resend used to silently re-arm a slot capacity had
    // already given away (re-audit 2026-09-11).
    const isRevival =
      bookingRequest.status === "expired" || isPaymentLinkExpired(bookingRequest);
    if (isRevival) {
      if (bookingRequest.pickupTimeSlot) {
        const pickupUsage = await countSlotUsage(
          bookingRequest.serviceDate,
          "pickupTimeSlot",
          bookingRequest.pickupTimeSlot,
          id
        );
        if (pickupUsage >= MAX_BOOKINGS_PER_SLOT) {
          return NextResponse.json(
            { error: "The pickup slot for this date has since filled up. Edit the request to a different slot before resending the link." },
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
            { error: "The drop-off slot for this date has since filled up. Edit the request to a different slot before resending the link." },
            { status: 409 }
          );
        }
      }

      // Promo re-claim only applies when lazy expiry actually RELEASED the
      // code (status "expired"); a lapsed-but-unflipped request still holds
      // its claim.
      if (bookingRequest.status === "expired" && bookingRequest.promoCode) {
        let reclaimed = await claimPromoCode(bookingRequest.promoCode);
        if (!reclaimed) {
          // Recovery path: a previous revival may have claimed the code but
          // failed before saving — a code already used BY THIS REQUEST is ours.
          reclaimed = await PromoCode.findOne({
            code: bookingRequest.promoCode.trim().toUpperCase(),
            status: "used",
            usedByRequestId: bookingRequest._id,
          });
        }
        if (!reclaimed) {
          return NextResponse.json(
            { error: `Promo code ${bookingRequest.promoCode} was released when the link expired and has since been used elsewhere. Edit the request's quote (remove the discount) or decline it before resending.` },
            { status: 409 }
          );
        }
        // Re-stamp the usage audit trail (mirrors the original claim)
        await PromoCode.updateOne(
          { code: reclaimed.code, status: "used" },
          {
            $set: {
              usedByRequestId: bookingRequest._id,
              usedByReference: bookingRequest._id.toString().slice(-6).toUpperCase(),
              discountAmount: bookingRequest.promoDiscountAmount || 0,
            },
          }
        ).catch((err) => console.error("Failed to record promo usage on revival:", err));
      }

      bookingRequest.adminNotes = [bookingRequest.adminNotes, "Lapsed link revived by admin resend"]
        .filter(Boolean)
        .join("\n");
    }

    // Regenerate when the token is missing (never issued, or nulled by
    // expiry/decline of a previous link) or past its TTL — the resent email
    // must never carry a link that dies on arrival.
    if (!bookingRequest.paymentToken || isPaymentLinkExpired(bookingRequest)) {
      bookingRequest.paymentToken = crypto.randomBytes(32).toString("hex");
      bookingRequest.paymentTokenCreatedAt = new Date();
    }

    // Persist the token BEFORE emailing (re-audit 2026-09-11): if the save
    // failed after the send, the customer held a link that 404'd forever.
    await bookingRequest.save();

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
