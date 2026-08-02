// src/lib/driverDocuments.ts
// Shared helpers for the driver-document streaming proxy
// (/api/admin/drivers/[id]/documents). Raw Vercel Blob URLs are public and
// permanent, so API responses must expose these proxy paths instead.
// Added 2026-08-02 (pre-launch audit LB-3).

export const DRIVER_DOC_TYPES = [
  "licence-front",
  "licence-back",
  "licence-legacy",
  "police-check",
] as const;

export type DriverDocType = (typeof DRIVER_DOC_TYPES)[number];

/** Build the client-facing proxy URL for a driver document */
export function driverDocumentUrl(driverId: string, doc: DriverDocType): string {
  return `/api/admin/drivers/${driverId}/documents?doc=${doc}`;
}

/**
 * Replace raw blob URLs on a lean driver object's license/policeCheck
 * subdocs with authenticated proxy paths. Mutates a shallow copy.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lean driver docs have no single typed shape across callers
export function maskDriverDocumentUrls<T extends Record<string, any>>(
  driver: T,
  driverId: string
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mutating a shallow copy of an untyped lean doc
  const masked: any = { ...driver };
  if (masked.license) {
    masked.license = { ...masked.license };
    if (masked.license.frontPhotoUrl) {
      masked.license.frontPhotoUrl = driverDocumentUrl(driverId, "licence-front");
    }
    if (masked.license.backPhotoUrl) {
      masked.license.backPhotoUrl = driverDocumentUrl(driverId, "licence-back");
    }
    if (masked.license.photoUrl) {
      masked.license.photoUrl = driverDocumentUrl(driverId, "licence-legacy");
    }
  }
  if (masked.policeCheck) {
    masked.policeCheck = { ...masked.policeCheck };
    if (masked.policeCheck.documentUrl) {
      masked.policeCheck.documentUrl = driverDocumentUrl(driverId, "police-check");
    }
  }
  return masked;
}
