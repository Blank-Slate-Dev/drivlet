// src/lib/notifications.ts
import { connectDB } from "@/lib/mongodb";
import GarageNotification, { NotificationType, NotificationUrgency } from "@/models/GarageNotification";
import AdminNotification from "@/models/AdminNotification";
import Garage from "@/models/Garage";
import { Types } from "mongoose";
import { sendEmail } from "@/lib/email";

interface CreateNotificationParams {
  garageId: Types.ObjectId | string;
  bookingId?: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: {
    vehicleRegistration?: string;
    serviceType?: string;
    pickupTime?: Date;
    customerName?: string;
    urgency?: NotificationUrgency;
  };
}

/**
 * Create a notification for a garage
 */
export async function createGarageNotification(params: CreateNotificationParams) {
  await connectDB();

  const notification = await GarageNotification.create({
    garageId: params.garageId,
    bookingId: params.bookingId,
    type: params.type,
    title: params.title,
    message: params.message,
    metadata: params.metadata || {},
    isRead: false,
  });

  return notification;
}

/**
 * Create a new booking notification for a garage
 */
export async function notifyGarageOfNewBooking(
  garageId: Types.ObjectId | string,
  booking: {
    _id: Types.ObjectId | string;
    vehicleRegistration: string;
    serviceType: string;
    pickupTime: string | Date;
    userName: string;
    isManualTransmission?: boolean;
  }
) {
  const urgency: NotificationUrgency = booking.isManualTransmission ? "urgent" : "normal";

  return createGarageNotification({
    garageId,
    bookingId: booking._id,
    type: "new_booking",
    title: "New Booking Assignment",
    message: `New booking for ${booking.vehicleRegistration} - ${booking.serviceType}. Customer: ${booking.userName}`,
    metadata: {
      vehicleRegistration: booking.vehicleRegistration,
      serviceType: booking.serviceType,
      pickupTime: new Date(booking.pickupTime),
      customerName: booking.userName,
      urgency,
    },
  });
}

/**
 * Create a booking cancellation notification for a garage
 */
export async function notifyGarageOfCancellation(
  garageId: Types.ObjectId | string,
  booking: {
    _id: Types.ObjectId | string;
    vehicleRegistration: string;
    userName: string;
  }
) {
  return createGarageNotification({
    garageId,
    bookingId: booking._id,
    type: "booking_cancelled",
    title: "Booking Cancelled",
    message: `Booking for ${booking.vehicleRegistration} has been cancelled by ${booking.userName}`,
    metadata: {
      vehicleRegistration: booking.vehicleRegistration,
      customerName: booking.userName,
      urgency: "normal",
    },
  });
}

/**
 * Find the matching garage for a booking based on place ID or name
 */
export async function findMatchingGarage(booking: {
  garagePlaceId?: string;
  garageName?: string;
}) {
  await connectDB();

  // First try to match by place ID (exact match)
  if (booking.garagePlaceId) {
    const garage = await Garage.findOne({
      linkedGaragePlaceId: booking.garagePlaceId,
      status: "approved",
    });
    if (garage) return garage;
  }

  // Fallback to name-based matching
  if (booking.garageName) {
    const garage = await Garage.findOne({
      linkedGarageName: { $regex: new RegExp(`^${booking.garageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
      status: "approved",
    });
    if (garage) return garage;
  }

  return null;
}

/**
 * Assign a booking to a garage and create notification
 */
export async function assignBookingToGarage(
  bookingId: Types.ObjectId | string,
  garageId: Types.ObjectId | string,
  booking: {
    vehicleRegistration: string;
    serviceType: string;
    pickupTime: string | Date;
    userName: string;
    isManualTransmission?: boolean;
  }
) {
  await connectDB();

  // Import here to avoid circular dependency
  const Booking = (await import("@/models/Booking")).default;

  const now = new Date();

  // Update booking with assignment
  await Booking.findByIdAndUpdate(bookingId, {
    assignedGarageId: garageId,
    assignedAt: now,
    garageNotifiedAt: now,
    $push: {
      updates: {
        stage: "garage_assigned",
        timestamp: now,
        message: "Booking assigned to garage partner",
        updatedBy: "system",
      },
    },
  });

  // Create notification for the garage
  await notifyGarageOfNewBooking(garageId, {
    _id: bookingId,
    ...booking,
  });

  return true;
}

/**
 * Get unread notification count for a garage
 */
export async function getUnreadNotificationCount(garageId: Types.ObjectId | string) {
  await connectDB();

  return GarageNotification.countDocuments({
    garageId,
    isRead: false,
  });
}

/**
 * Notify admin of a new booking request (DB notification + email).
 * Non-blocking — failures are logged, never thrown.
 */
export async function notifyAdminOfNewRequest(request: {
  _id: Types.ObjectId | string;
  userName: string;
  vehicleRegistration: string;
  pickupAddress: string;
  quotedAmount: number;
  garageName?: string | null;
}) {
  const fromEmail = process.env.EMAIL_FROM || "noreply@drivlet.com.au"; // [EMAIL_DEBUG]
  const rawEmails = process.env.ADMIN_NOTIFICATION_EMAIL || "support@drivlet.com.au"; // [EMAIL_DEBUG]
  console.log(`[EMAIL_DEBUG] notifyAdminOfNewRequest ENTERED — from=${fromEmail}, to=${rawEmails}, vehicle=${request.vehicleRegistration}`); // [EMAIL_DEBUG]

  const pickupSuburb = request.pickupAddress.split(",")[0]?.trim() || "Unknown";
  const quotedDisplay = `$${(request.quotedAmount / 100).toFixed(2)}`;
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // 1. Create AdminNotification
  try {
    await connectDB();
    await AdminNotification.create({
      type: "new_request",
      title: "New Booking Request",
      message: `${request.userName} requested a pickup for ${request.vehicleRegistration} from ${pickupSuburb}. Quoted ${quotedDisplay}.`,
      bookingRequestId: request._id,
      metadata: {
        vehicleRegistration: request.vehicleRegistration,
        customerName: request.userName,
        pickupSuburb,
        quotedAmount: request.quotedAmount,
      },
    });
    console.log("[EMAIL_DEBUG] AdminNotification DB record created successfully"); // [EMAIL_DEBUG]
  } catch (err) {
    console.error("[EMAIL_DEBUG] AdminNotification DB create FAILED:", err); // [EMAIL_DEBUG]
    console.error("Failed to create admin notification:", err);
  }

  // 2. Send admin email(s) — supports comma-separated list
  try {
    const adminEmails = rawEmails.split(",").map((e) => e.trim()).filter(Boolean);
    console.log(`[EMAIL_DEBUG] Sending to ${adminEmails.length} recipient(s): ${adminEmails.join(", ")}`); // [EMAIL_DEBUG]
    const subject = `New booking request — ${request.vehicleRegistration} (${pickupSuburb})`;
    const textContent = [
      `Hi team,`,
      ``,
      `A new booking request has come through:`,
      `  Customer: ${request.userName}`,
      `  Vehicle: ${request.vehicleRegistration}`,
      `  Pickup: ${pickupSuburb}`,
      request.garageName ? `  Garage: ${request.garageName}` : null,
      `  Quoted: ${quotedDisplay} AUD`,
      ``,
      `Review it in the admin dashboard:`,
      `${appUrl}/admin/dashboard`,
      ``,
      `Cheers,`,
      `Drivlet`,
    ].filter(Boolean).join("\n");
    const htmlContent = [
      `<p>Hi team,</p>`,
      `<p>A new booking request has come through:</p>`,
      `<table style="border-collapse:collapse;font-size:14px">`,
      `<tr><td style="padding:4px 12px 4px 0;color:#64748b">Customer</td><td style="padding:4px 0;font-weight:600">${request.userName}</td></tr>`,
      `<tr><td style="padding:4px 12px 4px 0;color:#64748b">Vehicle</td><td style="padding:4px 0;font-weight:600">${request.vehicleRegistration}</td></tr>`,
      `<tr><td style="padding:4px 12px 4px 0;color:#64748b">Pickup</td><td style="padding:4px 0">${pickupSuburb}</td></tr>`,
      request.garageName
        ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b">Garage</td><td style="padding:4px 0">${request.garageName}</td></tr>`
        : "",
      `<tr><td style="padding:4px 12px 4px 0;color:#64748b">Quoted</td><td style="padding:4px 0;font-weight:600">${quotedDisplay} AUD</td></tr>`,
      `</table>`,
      `<p style="margin-top:16px"><a href="${appUrl}/admin/dashboard" style="background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Review in Dashboard</a></p>`,
      `<p style="margin-top:24px;color:#94a3b8;font-size:12px">Drivlet</p>`,
    ].join("");

    const results = await Promise.all(
      adminEmails.map((email) =>
        sendEmail({ to: email, toName: "Drivlet Admin", subject, textContent, htmlContent })
          .then((ok) => { console.log(`[EMAIL_DEBUG] sendEmail to ${email} returned ${ok}`); return ok; }) // [EMAIL_DEBUG]
          .catch((err) => { console.error(`[EMAIL_DEBUG] sendEmail to ${email} threw:`, err); return false; }) // [EMAIL_DEBUG]
      )
    );
    console.log(`[EMAIL_DEBUG] notifyAdminOfNewRequest COMPLETE — results=${JSON.stringify(results)}`); // [EMAIL_DEBUG]
  } catch (err) {
    console.error("[EMAIL_DEBUG] notifyAdminOfNewRequest email block FAILED:", err); // [EMAIL_DEBUG]
    console.error("Failed to send admin notification email:", err);
  }
}
