// src/lib/booking-events.ts
// Simple in-memory event emitter for real-time booking updates
// For production at scale, replace with Redis pub/sub

type BookingEventCallback = (data: BookingEventData) => void;

export interface BookingEventData {
  bookingId: string;
  currentStage: string;
  overallProgress: number;
  status: string;
  servicePaymentStatus?: string;
  servicePaymentAmount?: number;
  servicePaymentUrl?: string;
  servicePaymentMethod?: string;
  updatedAt: Date;
  // updatedBy deliberately excluded (re-audit 2026-09-11): SSE payloads
  // reach guest-credentialed trackers and must not carry internal identities
  latestUpdate?: {
    stage: string;
    timestamp: Date;
    message: string;
  };
  /** Signed handover forms — lets the tracker hide "signature required"
   *  prompts once the driver has completed the form in person. */
  signedForms?: Array<{
    formType: string;
    submittedAt?: Date | string;
  }>;
}

class BookingEventEmitter {
  private listeners: Map<string, Set<BookingEventCallback>> = new Map();

  subscribe(bookingId: string, callback: BookingEventCallback): () => void {
    if (!this.listeners.has(bookingId)) {
      this.listeners.set(bookingId, new Set());
    }
    this.listeners.get(bookingId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(bookingId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(bookingId);
        }
      }
    };
  }

  emit(bookingId: string, data: BookingEventData): void {
    const callbacks = this.listeners.get(bookingId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in booking event callback:', error);
        }
      });
    }
  }

  // Get count of listeners for a booking (useful for debugging)
  getListenerCount(bookingId: string): number {
    return this.listeners.get(bookingId)?.size || 0;
  }
}

// Singleton instance
export const bookingEvents = new BookingEventEmitter();

// Helper function to emit booking update from anywhere
export function emitBookingUpdate(data: BookingEventData): void {
  console.log(`📡 Emitting update for booking ${data.bookingId}: ${data.currentStage}`);
  bookingEvents.emit(data.bookingId, data);
}