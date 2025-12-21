// src/lib/notifications.ts
import { connectDB } from "@/lib/mongodb";
import GarageNotification, { NotificationType, NotificationUrgency } from "@/models/GarageNotification";
import Garage from "@/models/Garage";
import { Types } from "mongoose";

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
