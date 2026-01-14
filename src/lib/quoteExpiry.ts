// src/lib/quoteExpiry.ts
// Utility functions for quote expiry management

export interface QuoteWithExpiry {
  status: string;
  firstViewedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  validUntil?: string | Date;
}

/**
 * Check if a quote is expired based on either:
 * 1. The 48-hour window after first view (expiresAt)
 * 2. The original validUntil date
 */
export function isQuoteExpired(quote: QuoteWithExpiry): boolean {
  const now = new Date();

  // If explicitly marked as expired
  if (quote.status === "expired" || quote.status === "cancelled") {
    return true;
  }

  // Check 48-hour expiry after first view
  if (quote.expiresAt) {
    const expiresAt = new Date(quote.expiresAt);
    if (expiresAt < now) {
      return true;
    }
  }

  // Check original validUntil
  if (quote.validUntil) {
    const validUntil = new Date(quote.validUntil);
    if (validUntil < now) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a quote is expiring soon (within 6 hours)
 */
export function isExpiringSoon(quote: QuoteWithExpiry): boolean {
  if (!quote.expiresAt || isQuoteExpired(quote)) {
    return false;
  }

  const now = new Date();
  const expiresAt = new Date(quote.expiresAt);
  const hoursRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursRemaining > 0 && hoursRemaining <= 6;
}

/**
 * Get the time remaining until quote expires
 * Returns an object with hours, minutes, and a formatted string
 */
export function getTimeRemaining(expiresAt: string | Date): {
  hours: number;
  minutes: number;
  totalMinutes: number;
  formatted: string;
  isExpired: boolean;
} {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      hours: 0,
      minutes: 0,
      totalMinutes: 0,
      formatted: "Expired",
      isExpired: true,
    };
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let formatted: string;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    formatted = `${days} day${days !== 1 ? "s" : ""} remaining`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m remaining`;
  } else {
    formatted = `${minutes} minute${minutes !== 1 ? "s" : ""} remaining`;
  }

  return {
    hours,
    minutes,
    totalMinutes,
    formatted,
    isExpired: false,
  };
}

/**
 * Format the expiry status for display
 */
export function formatExpiryStatus(quote: QuoteWithExpiry): {
  text: string;
  type: "active" | "expiring-soon" | "expired" | "not-viewed";
  color: string;
  bgColor: string;
} {
  // Quote hasn't been viewed yet - no expiry
  if (!quote.firstViewedAt) {
    return {
      text: "Valid until viewed",
      type: "not-viewed",
      color: "text-slate-600",
      bgColor: "bg-slate-100",
    };
  }

  // Quote is expired
  if (isQuoteExpired(quote)) {
    return {
      text: "Quote Expired",
      type: "expired",
      color: "text-red-600",
      bgColor: "bg-red-100",
    };
  }

  // Quote is expiring soon
  if (isExpiringSoon(quote)) {
    const remaining = quote.expiresAt ? getTimeRemaining(quote.expiresAt) : null;
    return {
      text: remaining ? `Expires in ${remaining.formatted.replace(" remaining", "")}` : "Expiring soon",
      type: "expiring-soon",
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    };
  }

  // Quote is active
  if (quote.expiresAt) {
    const remaining = getTimeRemaining(quote.expiresAt);
    return {
      text: `Expires in ${remaining.formatted.replace(" remaining", "")}`,
      type: "active",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    };
  }

  return {
    text: "Active",
    type: "active",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  };
}

/**
 * Calculate the expiry date (48 hours from first view)
 */
export function calculateExpiryDate(firstViewedAt: Date): Date {
  return new Date(firstViewedAt.getTime() + 48 * 60 * 60 * 1000);
}
