// src/lib/emit-booking-update.ts
// Helper to emit booking updates from API routes

import { emitBookingUpdate, BookingEventData } from './booking-events';

interface BookingDocument {
  _id: { toString(): string } | string;
  currentStage: string;
  overallProgress: number;
  status: string;
  servicePaymentStatus?: string;
  updatedAt: Date;
  updates?: Array<{
    stage: string;
    timestamp: Date;
    message: string;
    updatedBy: string;
  }>;
}

export function notifyBookingUpdate(booking: BookingDocument): void {
  const bookingId = typeof booking._id === 'string' ? booking._id : booking._id.toString();
  
  const data: BookingEventData = {
    bookingId,
    currentStage: booking.currentStage,
    overallProgress: booking.overallProgress,
    status: booking.status,
    servicePaymentStatus: booking.servicePaymentStatus,
    updatedAt: booking.updatedAt,
    latestUpdate: booking.updates && booking.updates.length > 0
      ? booking.updates[booking.updates.length - 1]
      : undefined,
  };

  emitBookingUpdate(data);
}