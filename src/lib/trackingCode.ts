// src/lib/trackingCode.ts
import { connectDB } from '@/lib/mongodb';
import Booking from '@/models/Booking';

// Characters that are unambiguous (no 0/O, 1/I/L confusion)
const ALLOWED_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a random 6-character tracking code
 */
function generateRandomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * ALLOWED_CHARS.length);
    code += ALLOWED_CHARS[randomIndex];
  }
  return code;
}

/**
 * Generate a unique tracking code that doesn't exist in the database
 * Retries up to maxAttempts times to ensure uniqueness
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
 * Validate tracking code format
 */
export function isValidTrackingCodeFormat(code: string): boolean {
  if (!code || code.length !== 6) return false;
  const upperCode = code.toUpperCase();
  return [...upperCode].every(char => ALLOWED_CHARS.includes(char));
}
