// src/hooks/useUserLocation.ts
'use client';

import { useState, useEffect } from 'react';

interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
  region?: string;
}

const CACHE_KEY = 'drivlet_user_location';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Drivlet service region centers
export const NEWCASTLE_CENTER = { lat: -32.9283, lng: 151.7817 };
export const CANBERRA_CENTER = { lat: -35.2809, lng: 149.1300 };

// Max distance (km) from a service region to consider the user "local"
const SERVICE_REGION_RADIUS_KM = 80;

/** Simple haversine distance in km */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Check if a location is within range of either service region */
function isNearServiceRegion(lat: number, lng: number): boolean {
  const toNewcastle = distanceKm(lat, lng, NEWCASTLE_CENTER.lat, NEWCASTLE_CENTER.lng);
  const toCanberra = distanceKm(lat, lng, CANBERRA_CENTER.lat, CANBERRA_CENTER.lng);
  return toNewcastle <= SERVICE_REGION_RADIUS_KM || toCanberra <= SERVICE_REGION_RADIUS_KM;
}

/**
 * Silently detect the user's rough location via IP geolocation.
 * No browser permission prompts — purely server-side IP lookup.
 * Results are cached in sessionStorage for 30 minutes.
 *
 * Returns null if the user is not near a Drivlet service region
 * (Newcastle or Canberra), which triggers the dual-region fallback
 * in the autocomplete components.
 */
export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try cached location first
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
          // cached location could be null (user was outside service regions)
          setLocation(parsed.location);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // sessionStorage not available or corrupt — continue to fetch
    }

    // Fetch from IP geolocation API
    const controller = new AbortController();

    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('IP lookup failed');
        return res.json();
      })
      .then((data) => {
        if (data.latitude && data.longitude) {
          // Only use the location if the user is near a service region
          let loc: UserLocation | null = null;

          if (isNearServiceRegion(data.latitude, data.longitude)) {
            loc = {
              lat: data.latitude,
              lng: data.longitude,
              city: data.city,
              region: data.region,
            };
          }

          setLocation(loc);

          // Cache the result (including null for non-service-region users)
          try {
            sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ location: loc, timestamp: Date.now() })
            );
          } catch {
            // sessionStorage full or unavailable — silently ignore
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          // Silently fail — components will fall back to dual-region search
          console.debug('IP geolocation unavailable, using default regions');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { location, isLoading };
}