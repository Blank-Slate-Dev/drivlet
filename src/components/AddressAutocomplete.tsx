// src/components/AddressAutocomplete.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onSelect?: (placeDetails: PlaceDetails) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  biasToNewcastle?: boolean;
}

export interface PlaceDetails {
  formattedAddress: string;
  streetNumber?: string;
  streetName?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

// Declare google types
declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
  }
}

// Track if script is loading/loaded globally
let isScriptLoading = false;
let isScriptLoaded = false;
const scriptLoadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (isScriptLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    // Currently loading - add to callback queue
    if (isScriptLoading) {
      scriptLoadCallbacks.push(resolve);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      if (window.google?.maps?.places) {
        isScriptLoaded = true;
        resolve();
      } else {
        scriptLoadCallbacks.push(resolve);
      }
      return;
    }

    // Start loading
    isScriptLoading = true;

    // Create callback function
    window.initGooglePlaces = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      resolve();
      // Call all queued callbacks
      scriptLoadCallbacks.forEach(cb => cb());
      scriptLoadCallbacks.length = 0;
    };

    // Create and append script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      isScriptLoading = false;
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });
}

function parseAddressComponents(place: google.maps.places.PlaceResult): PlaceDetails {
  const components = place.address_components || [];
  const details: PlaceDetails = {
    formattedAddress: place.formatted_address || '',
    placeId: place.place_id,
    lat: place.geometry?.location?.lat(),
    lng: place.geometry?.location?.lng(),
  };

  for (const component of components) {
    const types = component.types;

    if (types.includes('street_number')) {
      details.streetNumber = component.long_name;
    }
    if (types.includes('route')) {
      details.streetName = component.long_name;
    }
    if (types.includes('locality')) {
      details.suburb = component.long_name;
    }
    if (types.includes('administrative_area_level_1')) {
      details.state = component.short_name;
    }
    if (types.includes('postal_code')) {
      details.postcode = component.long_name;
    }
    if (types.includes('country')) {
      details.country = component.long_name;
    }
  }

  return details;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing your address...',
  disabled = false,
  className = '',
  biasToNewcastle = true,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    // Prevent re-initialization
    if (autocompleteRef.current) return;

    try {
      // Newcastle, NSW coordinates for biasing
      const newcastleBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(-33.1, 151.4), // SW corner
        new google.maps.LatLng(-32.7, 151.9)  // NE corner
      );

      const options: google.maps.places.AutocompleteOptions = {
        componentRestrictions: { country: 'au' },
        fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
        types: ['address'],
      };

      // Add location bias for Newcastle area
      if (biasToNewcastle) {
        options.bounds = newcastleBounds;
      }

      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (place && place.formatted_address) {
          onChange(place.formatted_address);
          
          if (onSelect) {
            const details = parseAddressComponents(place);
            onSelect(details);
          }
        }
      });

      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error initializing autocomplete:', err);
      setError('Failed to initialize address search');
      setIsLoading(false);
    }
  }, [onChange, onSelect, biasToNewcastle]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        initAutocomplete();
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load address search');
        setIsLoading(false);
      });

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [initAutocomplete]);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            <MapPin className={`h-4 w-4 ${isFocused ? 'text-emerald-500' : 'text-slate-400'}`} />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 transition focus:border-emerald-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {/* Powered by Google attribution (required by ToS) */}
      {!error && (
        <div className="mt-1 flex justify-end">
          <span className="text-[10px] text-slate-400">
            Powered by Google
          </span>
        </div>
      )}
    </div>
  );
}
