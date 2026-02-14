// src/lib/emit-booking-update.ts
// Helper to emit booking updates from API routes
// Handles SSE notification + email/SMS delivery for stage changes

import { emitBookingUpdate, BookingEventData } from './booking-events';
import { sendBookingStageEmail } from './email';
import { sendSMS } from './sms';

// Stage-specific short SMS messages
const STAGE_SMS_MESSAGES: Record<string, string> = {
  booking_confirmed: "Your drivlet booking is confirmed! We'll be in touch with next steps.",
  driver_en_route: "Your driver is on the way to collect your vehicle. Have your keys ready!",
  car_picked_up: "Your car has been picked up and is heading to the service centre.",
  at_garage: "Your vehicle has arrived at the garage and is ready for service.",
  service_in_progress: "Your car is now being serviced. We'll let you know when it's done.",
  driver_returning: "Service complete! Your driver is bringing your car back to you.",
  delivered: "Your car has been delivered. Thanks for choosing drivlet!",
};

interface BookingDocument {
  _id: { toString(): string } | string;
  currentStage: string;
  overallProgress: number;
  status: string;
  servicePaymentStatus?: string;
  servicePaymentAmount?: number;
  servicePaymentUrl?: string;
  updatedAt: Date;
  updates?: Array<{
    stage: string;
    timestamp: Date;
    message: string;
    updatedBy: string;
  }>;
  // Fields needed for email/SMS notifications
  userEmail?: string;
  userName?: string;
  vehicleRegistration?: string;
  trackingCode?: string;
  garageName?: string;
  guestPhone?: string;
}

export function notifyBookingUpdate(booking: BookingDocument): void {
  const bookingId = typeof booking._id === 'string' ? booking._id : booking._id.toString();
  
  // ── 1. Emit SSE event (existing behaviour) ──
  const data: BookingEventData = {
    bookingId,
    currentStage: booking.currentStage,
    overallProgress: booking.overallProgress,
    status: booking.status,
    servicePaymentStatus: booking.servicePaymentStatus,
    servicePaymentAmount: booking.servicePaymentAmount,
    servicePaymentUrl: booking.servicePaymentUrl,
    updatedAt: booking.updatedAt,
    latestUpdate: booking.updates && booking.updates.length > 0
      ? booking.updates[booking.updates.length - 1]
      : undefined,
  };

  emitBookingUpdate(data);

  // ── 2. Send stage email (async, non-blocking) ──
  if (booking.userEmail && booking.userName && booking.vehicleRegistration) {
    // Get custom message from the latest update if the admin wrote one
    const latestUpdate = booking.updates && booking.updates.length > 0
      ? booking.updates[booking.updates.length - 1]
      : undefined;

    // Only pass customMessage if it differs from the default stage messages
    // (i.e. the admin typed something custom in the message field)
    const customMessage = latestUpdate?.message && latestUpdate.stage === booking.currentStage
      ? latestUpdate.message
      : undefined;

    sendBookingStageEmail({
      customerEmail: booking.userEmail,
      customerName: booking.userName,
      vehicleRegistration: booking.vehicleRegistration,
      currentStage: booking.currentStage,
      trackingCode: booking.trackingCode,
      garageName: booking.garageName,
      customMessage,
    }).then((sent) => {
      if (sent) {
        console.log(`📧 Stage email sent to ${booking.userEmail} for stage: ${booking.currentStage}`);
      }
    }).catch((err) => {
      console.error(`❌ Failed to send stage email:`, err);
    });
  }

  // ── 3. Send SMS for guests with phone numbers (async, non-blocking) ──
  if (booking.guestPhone && booking.userName) {
    const smsMessage = STAGE_SMS_MESSAGES[booking.currentStage];
    if (smsMessage) {
      const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const trackingUrl = booking.trackingCode
        ? `${appUrl}/track?code=${booking.trackingCode}`
        : `${appUrl}/track`;

      const fullMessage = `Hi ${booking.userName}! ${smsMessage} Track: ${trackingUrl} - drivlet`;

      sendSMS(booking.guestPhone, fullMessage).then((sent) => {
        if (sent) {
          console.log(`📱 Stage SMS sent to ${booking.guestPhone} for stage: ${booking.currentStage}`);
        }
      }).catch((err) => {
        console.error(`❌ Failed to send stage SMS:`, err);
      });
    }
  }
}