import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import { sendEmail } from "@/lib/email";
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

    const subject = `Your Drivlet booking is approved — pay ${amountDisplay} to confirm (Ref: ${ref})`;

    const textContent = [
      `Hi ${firstName},`,
      ``,
      `Great news — your booking request has been approved!`,
      ``,
      `Here are the details:`,
      `  Vehicle: ${bookingRequest.vehicleRegistration}`,
      `  Pickup: ${bookingRequest.pickupAddress}`,
      bookingRequest.garageName ? `  Garage: ${bookingRequest.garageName}` : null,
      `  Amount: ${amountDisplay} AUD`,
      `  Reference: ${ref}`,
      ``,
      `Pay now to lock in your booking:`,
      payLink,
      ``,
      `Once payment is confirmed, we'll get everything sorted and send you a confirmation with your tracking code.`,
      ``,
      `Cheers,`,
      `The Drivlet Team`,
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
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Booking Approved!</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Ref: ${ref}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;color:#475569;font-size:16px;line-height:1.6;">Great news — your booking request has been approved! Pay now to lock it in.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr><td style="padding:0 0 8px;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Vehicle</span><div style="color:#1e293b;font-size:16px;font-weight:600;margin-top:2px;">${bookingRequest.vehicleRegistration}</div></td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #e2e8f0;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Pickup</span><div style="color:#1e293b;font-size:15px;margin-top:2px;">${bookingRequest.pickupAddress.split(",")[0]}</div></td></tr>
              ${bookingRequest.garageName ? `<tr><td style="padding:8px 0;border-top:1px solid #e2e8f0;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Garage</span><div style="color:#1e293b;font-size:15px;margin-top:2px;">${bookingRequest.garageName}</div></td></tr>` : ""}
              <tr><td style="padding:8px 0 0;border-top:1px solid #e2e8f0;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Amount</span><div style="color:#059669;font-size:24px;font-weight:700;margin-top:2px;">${amountDisplay} AUD</div></td></tr>
            </table>
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td align="center" style="padding:0 0 8px;">
              <a href="${payLink}" style="display:inline-block;background-color:#059669;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 40px;border-radius:9999px;box-shadow:0 4px 14px 0 rgba(0,0,0,0.15);">Pay Now & Confirm Booking</a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;color:#64748b;font-size:14px;text-align:center;">Once payment is confirmed, we'll send your booking confirmation with a tracking code.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;background-color:#f8fafc;">
          <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">Questions? Reply to this email or visit <a href="https://drivlet.com.au" style="color:#059669;text-decoration:none;">drivlet.com.au</a></p>
          <p style="margin:0;color:#cbd5e1;font-size:11px;">&copy; ${new Date().getFullYear()} Drivlet &middot; Newcastle, Australia</p>
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
