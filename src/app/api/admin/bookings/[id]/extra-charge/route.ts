// src/app/api/admin/bookings/[id]/extra-charge/route.ts
// POST — admin requests an additional payment from the customer via a custom
// Stripe Checkout link (e.g. extra work approved by the customer, parking fees).
// Pushes an extraCharges entry (status: pending) + a timeline update, and emails
// the customer the payment link. Completion is handled by the service payment
// webhook (metadata.type === "extra_charge").

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { stripe } from "@/lib/stripe";
import {
  sendEmail,
  bookingDetailsHtml,
  bookingDetailsText,
  emailPolicyFooterHtml,
  emailPolicyFooterText,
  BookingEmailDetails,
} from "@/lib/email";

const MIN_EXTRA_CHARGE = 1000;   // $10.00
const MAX_EXTRA_CHARGE = 200000; // $2,000.00
const MIN_DESCRIPTION_LENGTH = 5;
const MAX_DESCRIPTION_LENGTH = 200;

function getAppUrl(): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    const body = await request.json().catch(() => ({}));

    const amount = body.amount;
    if (
      typeof amount !== "number" ||
      !Number.isInteger(amount) ||
      amount < MIN_EXTRA_CHARGE ||
      amount > MAX_EXTRA_CHARGE
    ) {
      return NextResponse.json(
        {
          error: `amount must be an integer amount in cents between ${MIN_EXTRA_CHARGE} ($${(MIN_EXTRA_CHARGE / 100).toFixed(2)}) and ${MAX_EXTRA_CHARGE} ($${(MAX_EXTRA_CHARGE / 100).toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (description.length < MIN_DESCRIPTION_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `description must be between ${MIN_DESCRIPTION_LENGTH} and ${MAX_DESCRIPTION_LENGTH} characters` },
        { status: 400 }
      );
    }

    await connectDB();

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Cannot request an extra charge on a cancelled booking" }, { status: 400 });
    }

    const amountDisplay = `$${(amount / 100).toFixed(2)}`;
    const appUrl = getAppUrl();

    // Create Stripe Checkout session (same pattern as the driver generate_payment flow)
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: booking.userEmail,
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: `Additional Payment - ${booking.vehicleRegistration}`,
              description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: id,
        type: "extra_charge",
        description,
      },
      success_url: `${appUrl}/payment/success?booking=${id}&type=extra_charge`,
      cancel_url: `${appUrl}/payment/cancelled?booking=${id}`,
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Failed to create payment link" }, { status: 502 });
    }

    const now = new Date();
    const adminEmail = adminCheck.session.user?.email || "admin";

    booking.extraCharges = booking.extraCharges || [];
    booking.extraCharges.push({
      description,
      amount,
      status: "pending",
      checkoutSessionId: checkoutSession.id,
      paymentUrl: checkoutSession.url,
      createdBy: adminEmail,
      createdAt: now,
    });
    booking.updates.push({
      stage: "extra_charge_requested",
      timestamp: now,
      message: `Extra charge of ${amountDisplay} requested: ${description}`,
      updatedBy: "admin",
    });

    await booking.save();

    // ── Email the customer the payment link (non-blocking) ──
    if (booking.userEmail) {
      const firstName = (booking.userName || "there").split(" ")[0];
      const details: BookingEmailDetails = {
        vehicleRegistration: booking.vehicleRegistration,
        serviceType: booking.serviceType,
        serviceDate: booking.serviceDate,
        pickupAddress: booking.pickupAddress,
        garageName: booking.garageName,
        trackingCode: booking.trackingCode,
      };

      const textContent = [
        `Hi ${firstName},`,
        ``,
        `An additional payment of ${amountDisplay} AUD has been requested for your booking ${booking.trackingCode || booking.vehicleRegistration}:`,
        ``,
        `  ${description}`,
        ``,
        bookingDetailsText(details),
        ``,
        `Pay securely by card: ${checkoutSession.url}`,
        ``,
        `This payment link is valid for 24 hours. If it expires, just get in touch and we'll send you a new one.`,
        ``,
        emailPolicyFooterText(),
        ``,
        `Thanks,`,
        `The drivlet team`,
      ].join("\n");

      const htmlContent = [
        `<p style="color: #475569; font-size: 16px;">Hi ${escapeHtml(firstName)},</p>`,
        `<p style="color: #475569; font-size: 16px; line-height: 1.6;">An additional payment of <strong>${amountDisplay} AUD</strong> has been requested for your booking <strong>${escapeHtml(booking.trackingCode || booking.vehicleRegistration)}</strong>:</p>`,
        `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">`,
        `<p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600;">${escapeHtml(description)}</p>`,
        `<p style="margin: 8px 0 0; color: #475569; font-size: 14px;">Amount: <strong>${amountDisplay} AUD</strong></p>`,
        `</div>`,
        bookingDetailsHtml(details),
        `<a href="${checkoutSession.url}" style="display: block; background: #059669; color: white; text-decoration: none; text-align: center; padding: 16px 32px; border-radius: 9999px; font-size: 16px; font-weight: 600; margin-bottom: 16px;">Pay ${amountDisplay} securely</a>`,
        `<p style="margin: 0 0 24px; color: #64748b; font-size: 13px; text-align: center; line-height: 1.6;">Payment is processed securely by Stripe. This link is valid for 24 hours — if it expires, just get in touch and we'll send you a new one.</p>`,
        emailPolicyFooterHtml(),
      ].join("");

      sendEmail({
        to: booking.userEmail,
        toName: booking.userName || booking.userEmail,
        subject: `Additional payment requested — ${booking.vehicleRegistration}`,
        textContent,
        htmlContent,
      }).catch((err) => console.error("Failed to send extra charge email:", err));
    }

    return NextResponse.json({
      success: true,
      paymentUrl: checkoutSession.url,
      extraCharge: {
        description,
        amount,
        status: "pending",
        checkoutSessionId: checkoutSession.id,
        paymentUrl: checkoutSession.url,
        createdBy: adminEmail,
        createdAt: now,
      },
      message: `Extra charge of ${amountDisplay} requested. The customer has been emailed the payment link.`,
    });
  } catch (error) {
    console.error("Failed to create extra charge:", error);
    return NextResponse.json({ error: "Failed to create extra charge" }, { status: 500 });
  }
}
