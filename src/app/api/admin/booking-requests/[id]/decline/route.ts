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
import { getPickupSlotLabel, getServiceTypeByValue } from "@/config/timeSlots";

// Escape user-supplied strings placed directly in email HTML
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
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason || reason.length < 5) {
      return NextResponse.json(
        { error: "Please provide a decline reason (minimum 5 characters) — it is sent to the customer." },
        { status: 400 }
      );
    }
    if (reason.length > 500) {
      return NextResponse.json(
        { error: "Decline reason is too long (maximum 500 characters)." },
        { status: 400 }
      );
    }

    await connectDB();

    const bookingRequest = await BookingRequest.findById(id);
    if (!bookingRequest) {
      return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
    }

    // Only unpaid requests can be declined. Paid/converted go through cancel + refund instead.
    if (!["pending_review", "approved", "payment_link_sent"].includes(bookingRequest.status)) {
      return NextResponse.json(
        { error: `Cannot decline a request with status "${bookingRequest.status}"` },
        { status: 400 }
      );
    }

    const now = new Date();
    const adminEmail = adminCheck.session.user?.email || "admin";
    bookingRequest.status = "declined";
    bookingRequest.declineReason = reason;
    bookingRequest.reviewedBy = null;
    bookingRequest.reviewedAt = now;
    bookingRequest.adminNotes = [bookingRequest.adminNotes, `Declined by ${adminEmail}`]
      .filter(Boolean)
      .join("\n");
    // Invalidate any previously issued payment link
    bookingRequest.paymentToken = null;

    await bookingRequest.save();

    // Notify the customer (non-blocking result — decline succeeds even if email fails)
    const firstName = bookingRequest.userName.split(" ")[0];
    const details = {
      vehicleRegistration: bookingRequest.vehicleRegistration,
      serviceType: getServiceTypeByValue(bookingRequest.serviceType)?.label || bookingRequest.serviceType,
      serviceDate: bookingRequest.serviceDate,
      pickupTime: bookingRequest.pickupTimeSlot ? getPickupSlotLabel(bookingRequest.pickupTimeSlot) : undefined,
      pickupAddress: bookingRequest.pickupAddress,
    };

    const subject = `Update on your drivlet booking request — ${bookingRequest.vehicleRegistration}`;

    const textContent = [
      `Hi ${firstName},`,
      ``,
      `Thanks for your booking request. Unfortunately we're not able to take this one on.`,
      ``,
      `Reason: ${reason}`,
      ``,
      bookingDetailsText(details),
      ``,
      `You haven't been charged anything.`,
      ``,
      `If your plans change — a different date, garage, or pickup address — we'd love to help. You can submit a new request any time at https://drivlet.com.au/booking`,
      ``,
      emailPolicyFooterText(),
      ``,
      `Cheers,`,
      `The drivlet team`,
    ].join("\n");

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">
        <tr><td style="background:#334155;padding:36px 32px 28px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Booking request update</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.6;">Hi ${escapeHtml(firstName)},</p>
          <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.6;">Thanks for your booking request. Unfortunately we're not able to take this one on.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
            <p style="margin:0;color:#991b1b;font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
          </div>
          ${bookingDetailsHtml(details)}
          <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">You haven't been charged anything. If your plans change — a different date, garage, or pickup address — we'd love to help.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td align="center" style="padding:0 0 20px;">
              <a href="https://drivlet.com.au/booking" style="display:inline-block;background-color:#059669;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 40px;border-radius:9999px;">Make a new booking</a>
            </td></tr>
          </table>
          ${emailPolicyFooterHtml()}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;background-color:#f8fafc;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">Questions? Reply to this email or visit <a href="https://drivlet.com.au" style="color:#059669;text-decoration:none;">drivlet.com.au</a></p>
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

    return NextResponse.json({
      success: true,
      emailSent,
      request: bookingRequest,
    });
  } catch (error) {
    console.error("Failed to decline booking request:", error);
    return NextResponse.json({ error: "Failed to decline booking request" }, { status: 500 });
  }
}
