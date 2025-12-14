// src/components/GarageAutocomplete.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Wrench, Loader2, X, MapPin } from 'lucide-react';

export interface GarageDetails {
  name: string;
  formattedAddress: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  phoneNumber?: string;
}

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface GarageAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (details: GarageDetails) => void;
  placeholder?: string;
  disabled?: boolean;
  biasToNewcastle?: boolean;
}

export default function GarageAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search for a garage...',
  disabled = false,
  biasToNewcastle = true,
}: GarageAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    const initServices = () => {
      try {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        setIsReady(true);
        setError(null);
      } catch (err) {
        console.error('Error initializing services:', err);
        setError('Failed to initialize garage search');
      }
    };

    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      initServices();
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    
    if (existingScript) {
      // Script exists, wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkLoaded);
          initServices();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps?.places) {
          setError('Failed to load Google Maps');
        }
      }, 10000);
      
      return () => clearInterval(checkLoaded);
    }

    // Load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Small delay to ensure Places library is ready
      setTimeout(initServices, 100);
    };
    
    script.onerror = () => {
      setError('Failed to load Google Maps');
    };

    document.head.appendChild(script);
  }, []);

  // Search for predictions - uses car_repair type for mechanics
  const searchPredictions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || !input.trim()) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const newcastleBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(-33.1, 151.4),
      new google.maps.LatLng(-32.7, 151.9)
    );

    // Use car_repair type - this filters to mechanics/auto repair shops
    // Note: Google API only supports ONE specific type at a time
    const request: google.maps.places.AutocompletionRequest = {
      input,
      componentRestrictions: { country: 'au' },
      types: ['car_repair'],
      sessionToken: sessionTokenRef.current || undefined,
    };

    if (biasToNewcastle) {
      request.bounds = newcastleBounds;
    }

    autocompleteServiceRef.current.getPlacePredictions(
      request,
      (results, status) => {
        setIsSearching(false);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const mapped: Prediction[] = results.map((result) => ({
            placeId: result.place_id,
            mainText: result.structured_formatting.main_text,
            secondaryText: result.structured_formatting.secondary_text,
          }));
          setPredictions(mapped);
        } else {
          setPredictions([]);
        }
      }
    );
  }, [biasToNewcastle]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim() && isFocused && isReady) {
      debounceRef.current = setTimeout(() => {
        searchPredictions(value);
      }, 300);
    } else {
      setPredictions([]);
      setIsSearching(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, isFocused, isReady, searchPredictions]);

  // Handle selection
  const handleSelect = useCallback((prediction: Prediction) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.placeId,
        fields: ['name', 'formatted_address', 'geometry', 'place_id', 'formatted_phone_number'],
        sessionToken: sessionTokenRef.current || undefined,
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const address = place.formatted_address || '';
          const addressParts = address.split(',');
          const suburb = addressParts[1]?.trim().split(' ')[0] || '';
          
          const displayValue = suburb ? `${place.name} - ${suburb}` : place.name || '';
          onChange(displayValue);
          setSelectedAddress(address);
          setPredictions([]);
          setIsFocused(false);
          
          // Create new session token for next search
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          
          if (onSelect) {
            const details: GarageDetails = {
              name: place.name || '',
              formattedAddress: address,
              placeId: place.place_id,
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng(),
              phoneNumber: place.formatted_phone_number,
            };
            onSelect(details);
          }
        }
      }
    );
  }, [onChange, onSelect]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => 
        prev < predictions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => 
        prev > 0 ? prev - 1 : predictions.length - 1
      );
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setPredictions([]);
      setIsFocused(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setSelectedAddress('');
    setPredictions([]);
    setIsSearching(false);
    if (onSelect) {
      onSelect({
        name: '',
        formattedAddress: '',
      });
    }
    inputRef.current?.focus();
  };

  const showDropdown = isFocused && predictions.length > 0;
  const showLoading = !isReady || isSearching;

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          {showLoading && value.trim() ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            <Wrench className={`h-4 w-4 ${isFocused ? 'text-emerald-500' : 'text-slate-400'}`} />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 transition focus:border-emerald-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Custom Dropdown */}
        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <ul className="py-1">
              {predictions.map((prediction, index) => (
                <li
                  key={prediction.placeId}
                  onClick={() => handleSelect(prediction)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                    highlightedIndex === index ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <Wrench className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {prediction.mainText}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {prediction.secondaryText}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100 px-4 py-2">
              <p className="text-[10px] text-slate-400">Powered by Google</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {selectedAddress && (
        <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <p className="text-xs text-slate-600">{selectedAddress}</p>
        </div>
      )}
    </div>
  );
}