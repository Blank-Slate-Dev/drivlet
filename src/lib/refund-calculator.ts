// src/lib/refund-calculator.ts
// Calculates refund eligibility and amount based on cancellation timing

export interface RefundCalculation {
  eligible: boolean;
  canCancel: boolean;
  percentage: number;
  amount: number;
  reason: string;
  hoursUntilPickup: number;
  freeUntil: Date | null;
}

/**
 * Parse pickup time string to Date object
 * Handles formats like "Tomorrow, 9:00 AM - 10:00 AM" or ISO strings
 */
function parsePickupTime(pickupTimeStr: string): Date {
  // If it's already an ISO string, parse directly
  if (pickupTimeStr.includes('T') || pickupTimeStr.includes('-')) {
    const parsed = new Date(pickupTimeStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Handle relative formats like "Tomorrow, 9:00 AM"
  const now = new Date();
  const lowerStr = pickupTimeStr.toLowerCase();

  // Extract time portion (e.g., "9:00 AM")
  const timeMatch = pickupTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let hours = 9; // default
  let minutes = 0;

  if (timeMatch) {
    hours = parseInt(timeMatch[1]);
    minutes = parseInt(timeMatch[2]);
    const isPM = timeMatch[3].toUpperCase() === 'PM';
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
  }

  let targetDate = new Date(now);

  if (lowerStr.includes('today')) {
    // Keep today's date
  } else if (lowerStr.includes('tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else {
    // Try to parse day name (Monday, Tuesday, etc.)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lowerStr.includes(days[i])) {
        const currentDay = now.getDay();
        let daysToAdd = i - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        break;
      }
    }
  }

  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
}

/**
 * Calculate refund amount and eligibility based on cancellation policy
 *
 * Policy:
 * - Free cancellation: More than 24 hours before pickup = 100% refund
 * - Late cancellation: Less than 24 hours before pickup = 50% refund
 * - No refund: After pickup time has passed = 0% refund (but still allow cancel)
 * - Cannot cancel: If booking is in_progress or completed
 */
export function calculateRefund(
  pickupTime: string | Date,
  paymentAmount: number,
  currentStatus: string,
  currentStage?: string
): RefundCalculation {
  // Cannot cancel if booking is in progress or completed
  if (currentStatus === 'in_progress') {
    return {
      eligible: false,
      canCancel: false,
      percentage: 0,
      amount: 0,
      reason: 'Cannot cancel a booking that is in progress. The driver has already picked up your vehicle.',
      hoursUntilPickup: 0,
      freeUntil: null,
    };
  }

  if (currentStatus === 'completed') {
    return {
      eligible: false,
      canCancel: false,
      percentage: 0,
      amount: 0,
      reason: 'Cannot cancel a booking that has been completed.',
      hoursUntilPickup: 0,
      freeUntil: null,
    };
  }

  if (currentStatus === 'cancelled') {
    return {
      eligible: false,
      canCancel: false,
      percentage: 0,
      amount: 0,
      reason: 'This booking has already been cancelled.',
      hoursUntilPickup: 0,
      freeUntil: null,
    };
  }

  // Check if driver is already en route or has picked up
  const blockedStages = ['car_picked_up', 'at_garage', 'service_in_progress', 'driver_returning', 'delivered'];
  if (currentStage && blockedStages.includes(currentStage)) {
    return {
      eligible: false,
      canCancel: false,
      percentage: 0,
      amount: 0,
      reason: 'Cannot cancel a booking once service has started.',
      hoursUntilPickup: 0,
      freeUntil: null,
    };
  }

  // Parse pickup time
  const pickupDate = pickupTime instanceof Date ? pickupTime : parsePickupTime(pickupTime);
  const now = new Date();

  // Calculate hours until pickup
  const msUntilPickup = pickupDate.getTime() - now.getTime();
  const hoursUntilPickup = msUntilPickup / (1000 * 60 * 60);

  // Calculate free cancellation deadline (24 hours before pickup)
  const freeUntil = new Date(pickupDate.getTime() - 24 * 60 * 60 * 1000);

  // More than 24 hours before pickup - full refund
  if (hoursUntilPickup >= 24) {
    return {
      eligible: true,
      canCancel: true,
      percentage: 100,
      amount: paymentAmount,
      reason: 'Free cancellation - more than 24 hours before scheduled pickup.',
      hoursUntilPickup: Math.floor(hoursUntilPickup),
      freeUntil,
    };
  }

  // Less than 24 hours but before pickup - 50% refund
  if (hoursUntilPickup > 0) {
    const refundAmount = Math.floor(paymentAmount * 0.5);
    return {
      eligible: true,
      canCancel: true,
      percentage: 50,
      amount: refundAmount,
      reason: 'Late cancellation - less than 24 hours before pickup. A 50% cancellation fee applies.',
      hoursUntilPickup: Math.max(0, Math.floor(hoursUntilPickup)),
      freeUntil,
    };
  }

  // Pickup time has passed - no refund but can still cancel if not started
  return {
    eligible: true,
    canCancel: true,
    percentage: 0,
    amount: 0,
    reason: 'No refund available - scheduled pickup time has passed.',
    hoursUntilPickup: 0,
    freeUntil: null,
  };
}

/**
 * Format refund amount for display
 */
export function formatRefundAmount(amountInCents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amountInCents / 100);
}

/**
 * Get user-friendly message about cancellation policy
 */
export function getCancellationPolicyMessage(hoursUntilPickup: number): string {
  if (hoursUntilPickup >= 48) {
    return 'You have plenty of time for a free cancellation.';
  }
  if (hoursUntilPickup >= 24) {
    return `Free cancellation available for the next ${Math.floor(hoursUntilPickup - 24)} hours.`;
  }
  if (hoursUntilPickup > 0) {
    return 'Late cancellation fee (50%) applies. Cancel within this window to receive a partial refund.';
  }
  return 'The pickup window has passed. No refund available.';
}
