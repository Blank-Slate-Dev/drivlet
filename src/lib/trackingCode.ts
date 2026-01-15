// src/lib/trackingCode.ts
import { connectDB } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import QuoteRequest from '@/models/QuoteRequest';

// Characters that are unambiguous (no 0/O, 1/I/L confusion)
const ALLOWED_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a random 6-character tracking code
 */
function generateRandomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * ALLOWED_CHARS.length);
    code += ALLOWED_CHARS[randomIndex];
  }
  return code;
}

/**
 * Generate a unique tracking code that doesn't exist in the database
 *
 * IMPORTANT: This function only generates a candidate code. The actual uniqueness
 * is guaranteed by the unique index on the trackingCode field in the Booking model.
 * Callers should handle duplicate key errors by retrying with generateUniqueTrackingCode.
 *
 * To prevent race conditions, use generateTrackingCodeWithRetry() which handles
 * the full save-and-retry flow atomically.
 */
export async function generateUniqueTrackingCode(maxAttempts = 10): Promise<string> {
  await connectDB();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRandomCode();

    // Check if code already exists in active bookings
    const existing = await Booking.findOne({
      trackingCode: code,
      status: { $nin: ['completed', 'cancelled'] }
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error('Unable to generate unique tracking code after maximum attempts');
}

/**
 * Create a booking with a unique tracking code, handling race conditions.
 * This is the recommended way to create bookings as it handles the case where
 * two concurrent requests generate the same code.
 *
 * @param bookingData - The booking data (without trackingCode)
 * @param maxAttempts - Maximum retry attempts if duplicate key error occurs
 * @returns The saved booking document
 */
export async function createBookingWithTrackingCode(
  bookingData: Record<string, unknown>,
  maxAttempts = 5
): Promise<typeof Booking.prototype> {
  await connectDB();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRandomCode();

    try {
      const booking = new Booking({
        ...bookingData,
        trackingCode: code,
      });
      await booking.save();
      return booking;
    } catch (error: unknown) {
      // Check if this is a duplicate key error on trackingCode
      const mongoError = error as { code?: number; keyPattern?: { trackingCode?: number } };
      if (mongoError.code === 11000 && mongoError.keyPattern?.trackingCode) {
        // Duplicate tracking code - retry with a new code
        console.warn(`Tracking code collision on attempt ${attempt + 1}, retrying...`);
        continue;
      }
      // Some other error - rethrow
      throw error;
    }
  }

  throw new Error('Unable to create booking with unique tracking code after maximum attempts');
}

/**
 * Generate a unique tracking code for quote requests
 * Uses 8 characters to differentiate from booking codes and reduce collision chance
 */
export async function generateUniqueQuoteTrackingCode(maxAttempts = 10): Promise<string> {
  await connectDB();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate 8-character code for quote requests (vs 6 for bookings)
    const code = generateRandomCode(8);

    // Check if code already exists in active quote requests
    const existing = await QuoteRequest.findOne({
      trackingCode: code,
      status: { $nin: ['expired', 'cancelled'] }
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error('Unable to generate unique quote tracking code after maximum attempts');
}

/**
 * Create a quote request with a unique tracking code, handling race conditions.
 *
 * @param quoteRequestData - The quote request data (without trackingCode)
 * @param maxAttempts - Maximum retry attempts if duplicate key error occurs
 * @returns The saved quote request document
 */
export async function createQuoteRequestWithTrackingCode(
  quoteRequestData: Record<string, unknown>,
  maxAttempts = 5
): Promise<typeof QuoteRequest.prototype> {
  await connectDB();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRandomCode(8);

    try {
      const quoteRequest = new QuoteRequest({
        ...quoteRequestData,
        trackingCode: code,
      });
      await quoteRequest.save();
      return quoteRequest;
    } catch (error: unknown) {
      // Check if this is a duplicate key error on trackingCode
      const mongoError = error as { code?: number; keyPattern?: { trackingCode?: number } };
      if (mongoError.code === 11000 && mongoError.keyPattern?.trackingCode) {
        // Duplicate tracking code - retry with a new code
        console.warn(`Quote tracking code collision on attempt ${attempt + 1}, retrying...`);
        continue;
      }
      // Some other error - rethrow
      throw error;
    }
  }

  throw new Error('Unable to create quote request with unique tracking code after maximum attempts');
}

/**
 * Validate tracking code format (6 characters for bookings)
 */
export function isValidTrackingCodeFormat(code: string): boolean {
  if (!code || code.length !== 6) return false;
  const upperCode = code.toUpperCase();
  return [...upperCode].every(char => ALLOWED_CHARS.includes(char));
}

/**
 * Validate quote tracking code format (8 characters for quote requests)
 */
export function isValidQuoteTrackingCodeFormat(code: string): boolean {
  if (!code || code.length !== 8) return false;
  const upperCode = code.toUpperCase();
  return [...upperCode].every(char => ALLOWED_CHARS.includes(char));
}
