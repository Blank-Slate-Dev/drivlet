// src/components/booking/DistanceZoneMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DistanceZone } from '@/lib/distanceZones';

interface DistanceZoneMapProps {
  pickupLat: number;
  pickupLng: number;
  garageLat: number;
  garageLng: number;
  zone: DistanceZone;
}

// Zone border/fill colours
const ZONE_COLORS: Record<
  string,
  { fill: string; stroke: string }
> = {
  green: { fill: '#22c55e', stroke: '#16a34a' },
  yellow: { fill: '#eab308', stroke: '#ca8a04' },
  orange: { fill: '#f97316', stroke: '#ea580c' },
  red: { fill: '#ef4444', stroke: '#dc2626' },
};

export default function DistanceZoneMap({
  pickupLat,
  pickupLng,
  garageLat,
  garageLng,
  zone,
}: DistanceZoneMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const objectsRef = useRef<(google.maps.Circle | google.maps.Marker | google.maps.Polyline)[]>([]);

  const [googleReady, setGoogleReady] = useState(false);

  // Wait for Google Maps core to be available
  useEffect(() => {
    if (window.google?.maps?.Map) {
      setGoogleReady(true);
      return;
    }
    const id = setInterval(() => {
      if (window.google?.maps?.Map) {
        setGoogleReady(true);
        clearInterval(id);
      }
    }, 200);
    const timeout = setTimeout(() => clearInterval(id), 15000);
    return () => {
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, []);

  // Build / rebuild map whenever coords or zone change
  useEffect(() => {
    if (!googleReady || !mapContainerRef.current) return;

    // Clean up previous objects
    objectsRef.current.forEach((obj) => obj.setMap(null));
    objectsRef.current = [];

    const pickupPos = { lat: pickupLat, lng: pickupLng };
    const garagePos = { lat: garageLat, lng: garageLng };

    // Create or reuse map instance
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
        center: pickupPos,
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'cooperative',
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });
    }

    const map = mapInstanceRef.current;

    // --- Zone circles (centred on pickup, drawn largest-first) ---
    const circleConfigs = [
      { radius: 18000, color: ZONE_COLORS.red },
      { radius: 15000, color: ZONE_COLORS.orange },
      { radius: 12000, color: ZONE_COLORS.green },
    ];

    circleConfigs.forEach(({ radius, color }) => {
      const circle = new google.maps.Circle({
        map,
        center: pickupPos,
        radius,
        fillColor: color.fill,
        fillOpacity: 0.18,
        strokeColor: color.stroke,
        strokeWeight: 2,
        strokeOpacity: 0.55,
        clickable: false,
      });
      objectsRef.current.push(circle);
    });

    // --- Dashed line between pickup and garage ---
    const dashColor = ZONE_COLORS[zone]?.stroke || '#6b7280';
    const line = new google.maps.Polyline({
      path: [pickupPos, garagePos],
      map,
      strokeColor: dashColor,
      strokeOpacity: 0,
      strokeWeight: 0,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 0.75,
            scale: 3,
          },
          offset: '0',
          repeat: '14px',
        },
      ],
    });
    objectsRef.current.push(line);

    // --- Pickup marker (blue "P") ---
    const pickupMarker = new google.maps.Marker({
      position: pickupPos,
      map,
      title: 'Pickup Address',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 11,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#1d4ed8',
        strokeWeight: 2,
      },
      label: { text: 'P', color: '#ffffff', fontWeight: 'bold', fontSize: '11px' },
      zIndex: 10,
    });
    objectsRef.current.push(pickupMarker);

    // --- Garage marker (emerald "G") ---
    const garageMarker = new google.maps.Marker({
      position: garagePos,
      map,
      title: 'Garage / Service Centre',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 11,
        fillColor: '#059669',
        fillOpacity: 1,
        strokeColor: '#047857',
        strokeWeight: 2,
      },
      label: { text: 'G', color: '#ffffff', fontWeight: 'bold', fontSize: '11px' },
      zIndex: 11,
    });
    objectsRef.current.push(garageMarker);

    // --- Fit bounds to show both markers + some breathing room ---
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(pickupPos);
    bounds.extend(garagePos);
    map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });

    // Prevent the map from zooming in too far on short distances
    const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom > 14) {
        map.setZoom(14);
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [googleReady, pickupLat, pickupLng, garageLat, garageLng, zone]);

  // Loading placeholder while Google Maps initialises
  if (!googleReady) {
    return (
      <div className="flex h-[280px] w-full items-center justify-center rounded-xl bg-slate-100">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs">Loading map…</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="w-full rounded-xl overflow-hidden border border-slate-200"
      style={{ height: '280px' }}
    />
  );
}
