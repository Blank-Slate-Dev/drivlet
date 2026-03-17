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

// Drivlet service region centers (fallback when IP lookup fails)
export const NEWCASTLE_CENTER = { lat: -32.9283, lng: 151.7817 };
export const CANBERRA_CENTER = { lat: -35.2809, lng: 149.1300 };

/**
 * Silently detect the user's rough location via IP geolocation.
 * No browser permission prompts — purely server-side IP lookup.
 * Results are cached in sessionStorage for 30 minutes.
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
          const loc: UserLocation = {
            lat: data.latitude,
            lng: data.longitude,
            city: data.city,
            region: data.region,
          };
          setLocation(loc);

          // Cache the result
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