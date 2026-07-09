// src/app/api/admin/bookings/[id]/refund/route.ts
// Manual admin refunds. Refunds are never automatic anywhere in the app —
// this endpoint is the only place money moves back to a customer.
// target "transport" refunds the booking payment; "service" refunds the
// garage service payment. Amount defaults to the full payment, partial allowed.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { processRefund } from "@/lib/stripe-refund";
import { sendEmail } from "@/lib/email";

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
    const body = await request.json().catch(() => ({}));
    const target = body.target as "transport" | "service" | undefined;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";

    if (target !== "transport" && target !== "service") {
      return NextResponse.json({ error: "target must be 'transport' or 'service'" }, { status: 400 });
    }

    await connectDB();
    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Resolve payment reference + paid amount for the chosen target
    const paymentIntentId = target === "transport" ? booking.paymentId : booking.servicePaymentIntentId;
    const paidAmount = target === "transport" ? booking.paymentAmount : booking.servicePaymentAmount;
    const paidStatus = target === "transport" ? booking.paymentStatus : booking.servicePaymentStatus;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: `No Stripe payment reference found for the ${target} payment on this booking.` },
        { status: 400 }
      );
    }
    if (paidStatus === "refunded") {
      return NextResponse.json(
        { error: `The ${target} payment has already been refunded.` },
        { status: 400 }
      );
    }
    if (!paidAmount || paidAmount <= 0) {
      return NextResponse.json(
        { error: `No paid amount recorded for the ${target} payment.` },
        { status: 400 }
      );
    }

    // Amount: default full, allow partial
    const alreadyRefunded = (booking.refunds || [])
      .filter((r) => r.target === target)
      .reduce((sum, r) => sum + r.amount, 0);
    const maxRefundable = paidAmount - alreadyRefunded;
    let amount = typeof body.amount === "number" && Number.isFinite(body.amount)
      ? Math.round(body.amount)
      : maxRefundable;

    if (amount <= 0) {
      return NextResponse.json({ error: "Refund amount must be greater than zero." }, { status: 400 });
    }
    if (amount > maxRefundable) {
      return NextResponse.json(
        { error: `Refund amount exceeds the remaining refundable amount ($${(maxRefundable / 100).toFixed(2)}).` },
        { status: 400 }
      );
    }

    const adminEmail = adminCheck.session.user?.email || "admin";
    const result = await processRefund(paymentIntentId, amount, reason || "Refund processed by drivlet admin", {
      bookingId: id,
      target,
      processed_by: adminEmail,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Stripe refund failed" }, { status: 502 });
    }

    const now = new Date();
    const isFullRefund = alreadyRefunded + amount >= paidAmount;

    booking.refunds = booking.refunds || [];
    booking.refunds.push({
      target,
      amount,
      refundId: result.refundId,
      reason: reason || undefined,
      processedBy: adminEmail,
      processedAt: now,
    });
    if (isFullRefund) {
      if (target === "transport") booking.paymentStatus = "refunded";
      else booking.servicePaymentStatus = "refunded";
    }
    booking.updates.push({
      stage: "refund_processed",
      timestamp: now,
      message: `${target === "transport" ? "Transport" : "Service"} payment refund of $${(amount / 100).toFixed(2)} processed${isFullRefund ? " (full refund)" : " (partial)"}.`,
      updatedBy: "admin",
    });
    await booking.save();

    // Let the customer know — non-blocking
    if (booking.userEmail) {
      const firstName = (booking.userName || "there").split(" ")[0];
      const amountDisplay = `$${(amount / 100).toFixed(2)}`;
      sendEmail({
        to: booking.userEmail,
        toName: booking.userName || booking.userEmail,
        subject: `Your refund of ${amountDisplay} is on its way — ${booking.vehicleRegistration}`,
        textContent: [
          `Hi ${firstName},`,
          ``,
          `We've processed a refund of ${amountDisplay} AUD to your original payment method for booking ${booking.trackingCode || booking.vehicleRegistration}.`,
          ``,
          `Refunds usually appear on your statement within 5-10 business days.`,
          ``,
          `Cheers,`,
          `The drivlet team`,
        ].join("\n"),
        htmlContent: [
          `<p>Hi ${firstName},</p>`,
          `<p>We've processed a refund of <strong>${amountDisplay} AUD</strong> to your original payment method for booking <strong>${booking.trackingCode || booking.vehicleRegistration}</strong>.</p>`,
          `<p>Refunds usually appear on your statement within 5–10 business days.</p>`,
          `<p style="margin-top:24px;color:#94a3b8;font-size:12px">The drivlet team</p>`,
        ].join(""),
      }).catch((err) => console.error("Failed to send refund email:", err));
    }

    return NextResponse.json({
      success: true,
      refundId: result.refundId,
      amount,
      isFullRefund,
      estimatedArrival: result.estimatedArrival,
      message: `Refund of $${(amount / 100).toFixed(2)} processed. The customer has been emailed.`,
    });
  } catch (error) {
    console.error("Failed to process refund:", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
