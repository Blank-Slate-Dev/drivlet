import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import {
  sendEmail,
  bookingDetailsHtml,
  bookingDetailsText,
  emailPolicyFooterHtml,
  emailPolicyFooterText,
} from "@/lib/email";
import { getPickupSlotLabel, getDropoffSlotLabel, getServiceTypeByValue } from "@/config/timeSlots";
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

    if (!["approved", "payment_link_sent"].includes(bookingRequest.status)) {
      return NextResponse.json(
        { error: `Cannot send payment link for status "${bookingRequest.status}"` },
        { status: 400 }
      );
    }

    if (!bookingRequest.paymentToken) {
      bookingRequest.paymentToken = crypto.randomBytes(32).toString("hex");
      bookingRequest.paymentTokenCreatedAt = new Date();
    }

    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const payLink = `${appUrl}/pay/${bookingRequest.paymentToken}`;
    const amountDisplay = `$${(bookingRequest.quotedAmount / 100).toFixed(2)}`;
    const ref = bookingRequest._id.toString().slice(-6).toUpperCase();
    const firstName = bookingRequest.userName.split(" ")[0];

    const vehicleDescription = [bookingRequest.vehicleYear, bookingRequest.vehicleModel]
      .filter(Boolean)
      .join(" ") || undefined;
    const details = {
      vehicleRegistration: bookingRequest.vehicleRegistration,
      vehicleDescription,
      serviceType: getServiceTypeByValue(bookingRequest.serviceType)?.label || bookingRequest.serviceType,
      serviceDate: bookingRequest.serviceDate,
      pickupTime: bookingRequest.pickupTimeSlot ? getPickupSlotLabel(bookingRequest.pickupTimeSlot) : undefined,
      dropoffTime: bookingRequest.dropoffTimeSlot ? getDropoffSlotLabel(bookingRequest.dropoffTimeSlot) : undefined,
      pickupAddress: bookingRequest.pickupAddress,
      garageName: bookingRequest.garageName || undefined,
      amount: bookingRequest.quotedAmount,
    };

    const subject = `Your drivlet booking is approved — pay ${amountDisplay} to confirm (Ref: ${ref})`;

    const textContent = [
      `Hi ${firstName},`,
      ``,
      `Good news — your booking request has been approved.`,
      ``,
      bookingDetailsText(details),
      `  Reference: ${ref}`,
      ``,
      `How to pay:`,
      `1. Open your secure payment page: ${payLink}`,
      `2. Check your booking details and pay by card (processed securely by Stripe).`,
      `3. You'll receive a confirmation email with a tracking code so you can follow your booking.`,
      ``,
      `Your booking is only locked in once payment is confirmed.`,
      ``,
      emailPolicyFooterText(),
      ``,
      `Cheers,`,
      `The drivlet team`,
    ].filter(Boolean).join("\n");

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:36px 32px 28px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Booking approved</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Ref: ${ref}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;color:#475569;font-size:16px;line-height:1.6;">Good news — your booking request has been approved. Pay the transport amount below to lock in your booking.</p>
          ${bookingDetailsHtml(details)}
          <!-- How to pay -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">How to pay</p>
            <ol style="margin:0;padding-left:18px;color:#166534;font-size:14px;line-height:1.7;">
              <li>Tap the button below to open your secure payment page.</li>
              <li>Check your booking details and pay by card — processed securely by Stripe.</li>
              <li>You'll get a confirmation email with a tracking code to follow your booking.</li>
            </ol>
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td align="center" style="padding:0 0 8px;">
              <a href="${payLink}" style="display:inline-block;background-color:#059669;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 40px;border-radius:9999px;box-shadow:0 4px 14px 0 rgba(0,0,0,0.15);">Pay ${amountDisplay} &amp; confirm booking</a>
            </td></tr>
          </table>
          <p style="margin:16px 0 20px;color:#64748b;font-size:14px;text-align:center;">Your booking is only locked in once payment is confirmed.</p>
          ${emailPolicyFooterHtml()}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;background-color:#f8fafc;">
          <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">Questions? Reply to this email or visit <a href="https://drivlet.com.au" style="color:#059669;text-decoration:none;">drivlet.com.au</a></p>
          <p style="margin:0;color:#cbd5e1;font-size:11px;">&copy; ${new Date().getFullYear()} drivlet &middot; Newcastle, Australia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

    const emailSent = await sendEmail({
      to: bookingRequest.userEmail,
      toName: bookingRequest.userName,
      subject,
      textContent,
      htmlContent,
    });

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
