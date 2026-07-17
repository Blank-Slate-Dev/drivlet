// src/lib/featureFlags.ts
// Feature flags for controlling which features are available
// Set these to enable/disable entire feature sets

export const FEATURES = {
  // Core transport-only features (always on in Phase 1)
  TRANSPORT_BOOKING: true,
  PAYMENT_PROCESSING: true,
  TRACKING: true,

  // Future marketplace features (disabled in Phase 1)
  SERVICE_SELECTION: process.env.NEXT_PUBLIC_ENABLE_SERVICE_SELECTION === 'true',
  QUOTE_SYSTEM: process.env.NEXT_PUBLIC_ENABLE_QUOTE_SYSTEM === 'true',
  GARAGE_ASSIGNMENT: process.env.NEXT_PUBLIC_ENABLE_GARAGE_ASSIGNMENT === 'true',
  GARAGE_DASHBOARD_QUOTES: process.env.NEXT_PUBLIC_ENABLE_GARAGE_QUOTES === 'true',
} as const;

/**
 * Driver earnings displays (total-earned hero, per-job payout, price-per-job,
 * Payments tab). Hidden for now: drivers are paid hourly on TFN per their
 * contract, so per-job earnings would be misleading. Flip to true to bring
 * the earnings UI back — the logic underneath is untouched.
 */
export const SHOW_DRIVER_EARNINGS = false;

// Helper to check if marketplace features are enabled
export const isMarketplaceEnabled = () => {
  return FEATURES.SERVICE_SELECTION || FEATURES.QUOTE_SYSTEM || FEATURES.GARAGE_ASSIGNMENT;
};

// Transport-only price
export const TRANSPORT_PRICE = 11900; // $119.00 AUD in cents
export const TRANSPORT_PRICE_DISPLAY = '$119.00';