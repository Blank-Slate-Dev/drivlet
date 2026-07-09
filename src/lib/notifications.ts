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
 * Generic admin alert: in-app AdminNotification + email to ADMIN_NOTIFICATION_EMAIL.
 * Used for cancel requests, incidents, and other operational events.
 * Non-blocking — failures are logged, never thrown.
 */
export async function notifyAdmin(params: {
  type: "cancel_request" | "incident" | "system";
  title: string;
  message: string;
  bookingId?: Types.ObjectId | string;
  metadata?: {
    vehicleRegistration?: string;
    customerName?: string;
    pickupSuburb?: string;
    quotedAmount?: number;
  };
}) {
  const rawEmails = process.env.ADMIN_NOTIFICATION_EMAIL || "support@drivlet.com.au";
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    await connectDB();
    await AdminNotification.create({
      type: params.type,
      title: params.title,
      message: params.message,
      bookingId: params.bookingId,
      metadata: params.metadata,
    });
  } catch (err) {
    console.error("Failed to create admin notification:", err);
  }

  try {
    const adminEmails = rawEmails.split(",").map((e) => e.trim()).filter(Boolean);
    const textContent = [
      `Hi team,`,
      ``,
      params.message,
      ``,
      `Review it in the admin dashboard:`,
      `${appUrl}/admin/bookings`,
      ``,
      `Cheers,`,
      `drivlet`,
    ].join("\n");
    const escapedMessage = params.message
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const htmlContent = [
      `<p>Hi team,</p>`,
      `<p>${escapedMessage}</p>`,
      `<p style="margin-top:16px"><a href="${appUrl}/admin/bookings" style="background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Review in Dashboard</a></p>`,
      `<p style="margin-top:24px;color:#94a3b8;font-size:12px">drivlet</p>`,
    ].join("");

    await Promise.all(
      adminEmails.map((email) =>
        sendEmail({ to: email, toName: "Drivlet Admin", subject: params.title, textContent, htmlContent })
          .catch((err) => { console.error(`Admin notification email to ${email} failed:`, err); return false; })
      )
    );
  } catch (err) {
    console.error("Failed to send admin notification email:", err);
  }
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
  const rawEmails = process.env.ADMIN_NOTIFICATION_EMAIL || "support@drivlet.com.au";

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
  } catch (err) {
    console.error("Failed to create admin notification:", err);
  }

  // 2. Send admin email(s) — supports comma-separated list
  try {
    const adminEmails = rawEmails.split(",").map((e) => e.trim()).filter(Boolean);
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

    await Promise.all(
      adminEmails.map((email) =>
        sendEmail({ to: email, toName: "Drivlet Admin", subject, textContent, htmlContent })
          .catch((err) => { console.error(`Admin notification email to ${email} failed:`, err); return false; })
      )
    );
  } catch (err) {
    console.error("Failed to send admin notification email:", err);
  }
}
