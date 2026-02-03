// src/lib/distanceZones.ts
// Distance zone calculations for pickup-to-garage surcharges
// Uses Haversine formula for straight-line distance between two coordinates

export type DistanceZone = 'green' | 'yellow' | 'orange' | 'red';

export interface ZoneInfo {
  zone: DistanceZone;
  distance: number; // in km (rounded to 1 decimal)
  surchargeAmount: number; // in cents (AUD)
  surchargeDisplay: string; // e.g. "+$29.00"
  label: string; // e.g. "Extended Zone"
  description: string; // longer explanation
}

// Zone surcharge amounts in cents – keep in sync with ZONE_SURCHARGES in stripe.ts
export const ZONE_SURCHARGE_CENTS: Record<DistanceZone, number> = {
  green: 0,
  yellow: 2900, // $29.00
  orange: 4900, // $49.00
  red: 0, // not bookable online
};

/**
 * Convert degrees to radians
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate the straight-line distance between two lat/lng points using the
 * Haversine formula. Returns distance in kilometres.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determine the distance zone and surcharge for a given distance in km.
 *
 * Zone thresholds (radius from pickup address):
 *   Green  – 0 to 12 km   – no extra fee
 *   Yellow – >12 to 15 km  – +$29
 *   Orange – >15 to 18 km  – +$49
 *   Red    – >18 km        – must contact admin
 */
export function getDistanceZone(distanceKm: number): ZoneInfo {
  const rounded = Math.round(distanceKm * 10) / 10; // 1 decimal place

  if (distanceKm <= 12) {
    return {
      zone: 'green',
      distance: rounded,
      surchargeAmount: ZONE_SURCHARGE_CENTS.green,
      surchargeDisplay: 'No extra fee',
      label: 'Standard Zone',
      description: 'Within 12 km — no additional fees',
    };
  }

  if (distanceKm <= 15) {
    return {
      zone: 'yellow',
      distance: rounded,
      surchargeAmount: ZONE_SURCHARGE_CENTS.yellow,
      surchargeDisplay: '+$29.00',
      label: 'Extended Zone',
      description: '12–15 km — additional $29 surcharge',
    };
  }

  if (distanceKm <= 18) {
    return {
      zone: 'orange',
      distance: rounded,
      surchargeAmount: ZONE_SURCHARGE_CENTS.orange,
      surchargeDisplay: '+$49.00',
      label: 'Far Zone',
      description: '15–18 km — additional $49 surcharge',
    };
  }

  return {
    zone: 'red',
    distance: rounded,
    surchargeAmount: ZONE_SURCHARGE_CENTS.red,
    surchargeDisplay: 'Contact us',
    label: 'Out of Range',
    description: 'Beyond 18 km — please contact our team',
  };
}
