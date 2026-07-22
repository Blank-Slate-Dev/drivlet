// src/app/api/admin/bookings/[id]/cancel-request/route.ts
// Admin resolves a customer's cancellation request: approve (cancels the
// booking) or deny (booking continues). Refunds remain a separate manual
// admin action — approving a cancellation never moves money.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { notifyGarageOfCancellation } from "@/lib/notifications";
import { releasePromoCodeForUsage } from "@/lib/promoCodes";
import { sendEmail, bookingDetailsText } from "@/lib/email";
import { SUPPORT_PHONE } from "@/lib/policy";

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
    const action = body.action as "approve" | "deny" | undefined;
    const denyReason = typeof body.denyReason === "string" ? body.denyReason.trim().slice(0, 500) : "";

    if (action !== "approve" && action !== "deny") {
      return NextResponse.json({ error: "action must be 'approve' or 'deny'" }, { status: 400 });
    }
    if (action === "deny" && denyReason.length < 5) {
      return NextResponse.json(
        { error: "Please provide a reason for denying (minimum 5 characters) — it is sent to the customer." },
        { status: 400 }
      );
    }

    await connectDB();
    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.cancellationRequest?.status !== "pending") {
      return NextResponse.json(
        { error: "This booking has no pending cancellation request." },
        { status: 400 }
      );
    }

    const now = new Date();
    const adminEmail = adminCheck.session.user?.email || "admin";
    const firstName = (booking.userName || "there").split(" ")[0];
    const detailsText = bookingDetailsText({
      vehicleRegistration: booking.vehicleRegistration,
      serviceDate: booking.serviceDate,
      pickupAddress: booking.pickupAddress,
      trackingCode: booking.trackingCode,
    });

    if (action === "approve") {
      booking.cancellationRequest.status = "approved";
      booking.cancellationRequest.resolvedAt = now;
      booking.cancellationRequest.resolvedBy = adminEmail;
      booking.status = "cancelled";
      booking.currentStage = "cancelled";
      // Free any redeemed promo code — the cancelled booking never used it
      if (booking.promoCode) {
        await releasePromoCodeForUsage({
          code: booking.promoCode,
          bookingId: booking._id,
        });
      }
      booking.cancellation = {
        cancelledAt: now,
        cancelledBy: adminEmail,
        cancelledByRole: "admin",
        reason: booking.cancellationRequest.reason || "Customer requested cancellation",
        refundAmount: 0,
        refundPercentage: 0,
        refundStatus: "not_applicable",
      };
      booking.updates.push({
        stage: "cancelled",
        timestamp: now,
        message: "Cancellation request approved — booking cancelled.",
        updatedBy: "admin",
      });
      await booking.save();

      // Tell the garage, if one was assigned
      if (booking.assignedGarageId) {
        try {
          await notifyGarageOfCancellation(booking.assignedGarageId, {
            _id: booking._id,
            vehicleRegistration: booking.vehicleRegistration,
            userName: booking.userName || booking.userEmail,
          });
        } catch (err) {
          console.error("Failed to notify garage of cancellation:", err);
        }
      }

      // Confirm to the customer
      if (booking.userEmail) {
        sendEmail({
          to: booking.userEmail,
          toName: booking.userName || booking.userEmail,
          subject: `Your booking has been cancelled — ${booking.vehicleRegistration}`,
          textContent: [
            `Hi ${firstName},`,
            ``,
            `Your cancellation request has been approved and your booking is now cancelled.`,
            ``,
            detailsText,
            ``,
            `If you've already paid, our team will be in touch about your refund shortly.`,
            ``,
            `We'd love to help another time — you can make a new booking at https://drivlet.com.au/booking`,
            ``,
            `Cheers,`,
            `The drivlet team`,
          ].join("\n"),
          htmlContent: [
            `<p>Hi ${firstName},</p>`,
            `<p>Your cancellation request has been approved and your booking is now cancelled.</p>`,
            `<pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-family:inherit;font-size:14px;white-space:pre-wrap">${detailsText}</pre>`,
            `<p>If you've already paid, our team will be in touch about your refund shortly.</p>`,
            `<p>We'd love to help another time — <a href="https://drivlet.com.au/booking" style="color:#059669">make a new booking</a> any time.</p>`,
            `<p style="margin-top:24px;color:#94a3b8;font-size:12px">The drivlet team</p>`,
          ].join(""),
        }).catch((err) => console.error("Failed to send cancellation confirmation:", err));
      }

      return NextResponse.json({ success: true, message: "Cancellation approved — booking cancelled. Process any refund from the booking's payment panel." });
    }

    // Deny
    booking.cancellationRequest.status = "denied";
    booking.cancellationRequest.resolvedAt = now;
    booking.cancellationRequest.resolvedBy = adminEmail;
    booking.cancellationRequest.denyReason = denyReason;
    booking.updates.push({
      stage: "cancellation_denied",
      timestamp: now,
      message: `Cancellation request denied: ${denyReason}`,
      updatedBy: "admin",
    });
    await booking.save();

    if (booking.userEmail) {
      sendEmail({
        to: booking.userEmail,
        toName: booking.userName || booking.userEmail,
        subject: `Update on your cancellation request — ${booking.vehicleRegistration}`,
        textContent: [
          `Hi ${firstName},`,
          ``,
          `We've reviewed your cancellation request and unfortunately we're not able to cancel this booking.`,
          ``,
          `Reason: ${denyReason}`,
          ``,
          detailsText,
          ``,
          `Your booking is still going ahead as scheduled. If you'd like to discuss it, call us on ${SUPPORT_PHONE}.`,
          ``,
          `Cheers,`,
          `The drivlet team`,
        ].join("\n"),
        htmlContent: [
          `<p>Hi ${firstName},</p>`,
          `<p>We've reviewed your cancellation request and unfortunately we're not able to cancel this booking.</p>`,
          `<p><strong>Reason:</strong> ${denyReason.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`,
          `<pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-family:inherit;font-size:14px;white-space:pre-wrap">${detailsText}</pre>`,
          `<p>Your booking is still going ahead as scheduled. If you'd like to discuss it, call us on <strong>${SUPPORT_PHONE}</strong>.</p>`,
          `<p style="margin-top:24px;color:#94a3b8;font-size:12px">The drivlet team</p>`,
        ].join(""),
      }).catch((err) => console.error("Failed to send cancellation denial email:", err));
    }

    return NextResponse.json({ success: true, message: "Cancellation request denied — the customer has been emailed." });
  } catch (error) {
    console.error("Failed to resolve cancellation request:", error);
    return NextResponse.json({ error: "Failed to resolve cancellation request" }, { status: 500 });
  }
}
