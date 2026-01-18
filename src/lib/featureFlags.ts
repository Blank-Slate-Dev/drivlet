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

// Helper to check if marketplace features are enabled
export const isMarketplaceEnabled = () => {
  return FEATURES.SERVICE_SELECTION || FEATURES.QUOTE_SYSTEM || FEATURES.GARAGE_ASSIGNMENT;
};

// Transport-only price
export const TRANSPORT_PRICE = 6500; // $65.00 AUD in cents
export const TRANSPORT_PRICE_DISPLAY = '$65.00';
