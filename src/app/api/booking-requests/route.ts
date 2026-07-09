import { NextRequest, NextResponse } from "next/server";
import { requireValidOrigin } from "@/lib/validation";
import { calculateDistance, getDistanceZone } from "@/lib/distanceZones";
import { DRIVLET_PRICE } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import { notifyAdminOfNewRequest } from "@/lib/notifications";
import {
  sendEmail,
  bookingDetailsHtml,
  bookingDetailsText,
  emailPolicyFooterHtml,
  emailPolicyFooterText,
} from "@/lib/email";
import { getPickupSlotLabel, getDropoffSlotLabel, getServiceTypeByValue } from "@/config/timeSlots";

export async function POST(request: NextRequest) {
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      pickupAddress,
      serviceType,
      serviceDate,
      vehicleRegistration,
      vehicleState,
      earliestPickup,
      latestDropoff,
      hasExistingBooking,
      garageName,
      garageAddress,
      garagePlaceId,
      existingBookingRef,
      transmissionType,
      isManualTransmission,
      selectedServices,
      primaryServiceCategory,
      serviceNotes,
      pickupTimeSlot,
      dropoffTimeSlot,
      estimatedServiceDuration,
      vehicleYear,
      vehicleModel,
      pickupLat,
      pickupLng,
      garageLat,
      garageLng,
    } = body;

    if (!customerEmail || !customerName || !pickupAddress || !vehicleRegistration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const isGuest = !session?.user?.id;
    const userId = session?.user?.id || null;

    // Server-side distance & zone verification (mirrors create-payment-intent)
    let verifiedZone = "green";
    let verifiedSurcharge = 0;
    let verifiedDistanceKm = 0;

    if (
      typeof pickupLat === "number" && pickupLat !== 0 &&
      typeof pickupLng === "number" && pickupLng !== 0 &&
      typeof garageLat === "number" && garageLat !== 0 &&
      typeof garageLng === "number" && garageLng !== 0
    ) {
      const serverDistance = calculateDistance(pickupLat, pickupLng, garageLat, garageLng);
      const serverZoneInfo = getDistanceZone(serverDistance);

      verifiedZone = serverZoneInfo.zone;
      verifiedSurcharge = serverZoneInfo.surchargeAmount;
      verifiedDistanceKm = serverZoneInfo.distance;

      if (verifiedZone === "red") {
        return NextResponse.json(
          { error: "Your pickup address is too far from the selected garage (over 18 km). Please contact our team for assistance." },
          { status: 400 }
        );
      }
    }

    const quotedAmount = DRIVLET_PRICE + verifiedSurcharge;

    // Build flags
    const flags: { type: "manual_transmission" | "high_value_vehicle" | "other"; reason: string; createdAt: Date }[] = [];
    if (isManualTransmission) {
      flags.push({
        type: "manual_transmission",
        reason: "Customer selected manual transmission - requires manual-capable driver",
        createdAt: new Date(),
      });
    }

    // Parse selected services
    let parsedServices = [];
    try {
      parsedServices = typeof selectedServices === "string" ? JSON.parse(selectedServices) : selectedServices || [];
    } catch {
      parsedServices = [];
    }

    await connectDB();

    const bookingRequest = await BookingRequest.create({
      userName: customerName,
      userEmail: customerEmail,
      userId,
      isGuest,
      customerPhone: customerPhone || "",
      vehicleRegistration: vehicleRegistration.trim().toUpperCase(),
      vehicleState: vehicleState || "NSW",
      vehicleYear: vehicleYear || "",
      vehicleModel: vehicleModel || "",
      transmissionType: transmissionType || "automatic",
      isManualTransmission: !!isManualTransmission,
      pickupAddress: pickupAddress.trim(),
      serviceType: serviceType || "regular_service",
      serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
      earliestPickup: earliestPickup || "",
      latestDropoff: latestDropoff || "",
      pickupTimeSlot: pickupTimeSlot || "",
      dropoffTimeSlot: dropoffTimeSlot || "",
      estimatedServiceDuration: estimatedServiceDuration ? parseInt(String(estimatedServiceDuration)) : null,
      hasExistingBooking: !!hasExistingBooking,
      garageName: garageName || null,
      garageAddress: garageAddress || null,
      garagePlaceId: garagePlaceId || null,
      existingBookingRef: existingBookingRef || null,
      selectedServices: parsedServices,
      primaryServiceCategory: primaryServiceCategory || null,
      serviceNotes: serviceNotes || "",
      distanceZone: verifiedZone,
      distanceSurcharge: verifiedSurcharge,
      distanceKm: verifiedDistanceKm,
      quotedAmount,
      pickupLat: pickupLat || 0,
      pickupLng: pickupLng || 0,
      garageLat: garageLat || 0,
      garageLng: garageLng || 0,
      flags,
      status: "pending_review",
    });

    // Await notifications so Vercel doesn't kill the function before they complete.
    // Both are non-fatal — the request is already saved.
    try {
      await notifyAdminOfNewRequest({
        _id: bookingRequest._id,
        userName: customerName,
        vehicleRegistration: bookingRequest.vehicleRegistration,
        pickupAddress: bookingRequest.pickupAddress,
        quotedAmount,
        garageName: garageName || null,
      });
    } catch (notifyErr) {
      console.error("notifyAdminOfNewRequest threw (non-fatal):", notifyErr);
    }

    // Acknowledge to the customer: request received, under review, details listed.
    try {
      const ref = bookingRequest._id.toString().slice(-6).toUpperCase();
      const firstName = customerName.split(" ")[0];
      const details = {
        vehicleRegistration: bookingRequest.vehicleRegistration,
        vehicleDescription: [vehicleYear, vehicleModel].filter(Boolean).join(" ") || undefined,
        serviceType: getServiceTypeByValue(bookingRequest.serviceType)?.label || bookingRequest.serviceType,
        serviceDate: bookingRequest.serviceDate,
        pickupTime: bookingRequest.pickupTimeSlot ? getPickupSlotLabel(bookingRequest.pickupTimeSlot) : undefined,
        dropoffTime: bookingRequest.dropoffTimeSlot ? getDropoffSlotLabel(bookingRequest.dropoffTimeSlot) : undefined,
        pickupAddress: bookingRequest.pickupAddress,
        garageName: bookingRequest.garageName || undefined,
        amount: quotedAmount,
      };

      await sendEmail({
        to: customerEmail,
        toName: customerName,
        subject: `We've received your booking request — ${bookingRequest.vehicleRegistration} (Ref: ${ref})`,
        textContent: [
          `Hi ${firstName},`,
          ``,
          `Thanks for booking with drivlet — we've received your request and our team is reviewing it now.`,
          ``,
          bookingDetailsText(details),
          `  Reference: ${ref}`,
          ``,
          `What happens next:`,
          `1. Our team reviews your request (usually within a few business hours).`,
          `2. Once approved, we'll email you a secure payment link.`,
          `3. Your booking is locked in as soon as payment is confirmed.`,
          ``,
          `No payment has been taken yet.`,
          ``,
          emailPolicyFooterText(),
          ``,
          `Cheers,`,
          `The drivlet team`,
        ].join("\n"),
        htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:36px 32px 28px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Request received</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Ref: ${ref}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.6;">Hi ${firstName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")},</p>
          <p style="margin:0 0 24px;color:#475569;font-size:16px;line-height:1.6;">Thanks for booking with drivlet — we've received your request and our team is reviewing it now.</p>
          ${bookingDetailsHtml(details)}
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">What happens next</p>
            <ol style="margin:0;padding-left:18px;color:#166534;font-size:14px;line-height:1.7;">
              <li>Our team reviews your request (usually within a few business hours).</li>
              <li>Once approved, we'll email you a secure payment link.</li>
              <li>Your booking is locked in as soon as payment is confirmed.</li>
            </ol>
          </div>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;text-align:center;">No payment has been taken yet.</p>
          ${emailPolicyFooterHtml()}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;background-color:#f8fafc;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">Questions? Reply to this email or visit <a href="https://drivlet.com.au" style="color:#059669;text-decoration:none;">drivlet.com.au</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
      });
    } catch (ackErr) {
      console.error("Customer acknowledgement email failed (non-fatal):", ackErr);
    }

    return NextResponse.json({
      success: true,
      requestId: bookingRequest._id,
      quotedAmount,
      distanceZone: verifiedZone,
    });
  } catch (error) {
    console.error("Booking request error:", error);
    return NextResponse.json({ error: "Failed to submit booking request" }, { status: 500 });
  }
}
