// src/components/AddressAutocomplete.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

export interface PlaceDetails {
  formattedAddress: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  streetNumber?: string;
  streetName?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
}

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (details: PlaceDetails) => void;
  placeholder?: string;
  disabled?: boolean;
  biasToNewcastle?: boolean;
}

/**
 * iOS keyboard detection using VisualViewport.
 * When the keyboard opens, visualViewport.height shrinks.
 */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const THRESHOLD_PX = 120; // generous to avoid false positives
    const compute = () => {
      const delta = window.innerHeight - vv.height;
      setOpen(delta > THRESHOLD_PX);
    };

    compute();
    vv.addEventListener('resize', compute);
    vv.addEventListener('scroll', compute);
    window.addEventListener('orientationchange', compute);

    return () => {
      vv.removeEventListener('resize', compute);
      vv.removeEventListener('scroll', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, []);

  return open;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing your address...',
  disabled = false,
  biasToNewcastle = true,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Track focus ourselves (don't trust event order)
  const isInputFocusedRef = useRef(false);

  // Outside tap handling (tap vs scroll)
  const outsideStartRef = useRef<{ x: number; y: number } | null>(null);
  const SCROLL_THRESHOLD = 10;

  // Dropdown item tap-vs-scroll discrimination (so scrolling list never selects)
  const itemPointerRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    prediction: Prediction | null;
  } | null>(null);

  const handleInputFocus = () => {
    isInputFocusedRef.current = true;
    setIsOpen(true);

    if (value.trim() && isReady) {
      searchPredictions(value);
    }
  };

  const handleInputBlur = () => {
    // IMPORTANT: do NOT close dropdown here.
    // iOS will blur when user taps outside to dismiss the keyboard.
    isInputFocusedRef.current = false;
  };

  // Handle outside clicks/taps to close dropdown
  // Less aggressive approach that doesn't block all pointer events
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const target = e.target as Node;
      if (containerRef.current.contains(target)) return;

      outsideStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const target = e.target as Node;
      if (containerRef.current.contains(target)) return;

      const start = outsideStartRef.current;
      outsideStartRef.current = null;
      if (!start) return;

      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      const isTap = dx < SCROLL_THRESHOLD && dy < SCROLL_THRESHOLD;

      // Only close on a clean tap (not a scroll/swipe)
      if (isTap) {
        // Close dropdown and blur input
        setIsOpen(false);
        isInputFocusedRef.current = false;
        inputRef.current?.blur();
      }
    };

    // Use regular event listeners (not capture) to allow events to proceed normally
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

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
        setError('Failed to initialize address search');
      }
    };

    if (window.google?.maps?.places) {
      initServices();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');

    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkLoaded);
          initServices();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps?.places) {
          setError('Failed to load Google Maps');
        }
      }, 10000);

      return () => clearInterval(checkLoaded);
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setTimeout(initServices, 100);
    };

    script.onerror = () => {
      setError('Failed to load Google Maps');
    };

    document.head.appendChild(script);
  }, []);

  // Search for predictions
  const searchPredictions = useCallback(
    (input: string) => {
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

      const request: google.maps.places.AutocompletionRequest = {
        input,
        componentRestrictions: { country: 'au' },
        types: ['address'],
        sessionToken: sessionTokenRef.current || undefined,
      };

      if (biasToNewcastle) {
        request.bounds = newcastleBounds;
      }

      autocompleteServiceRef.current.getPlacePredictions(request, (results, status) => {
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
      });
    },
    [biasToNewcastle]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim() && isOpen && isReady) {
      debounceRef.current = setTimeout(() => {
        searchPredictions(value);
      }, 300);
    } else if (!value.trim()) {
      setPredictions([]);
      setIsSearching(false);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, isOpen, isReady, searchPredictions]);

  // Handle selection
  const handleSelect = useCallback(
    (prediction: Prediction) => {
      if (!placesServiceRef.current) return;

      placesServiceRef.current.getDetails(
        {
          placeId: prediction.placeId,
          fields: ['formatted_address', 'geometry', 'place_id', 'address_components'],
          sessionToken: sessionTokenRef.current || undefined,
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            const address = place.formatted_address || '';
            onChange(address);
            setPredictions([]);
            setIsOpen(false);
            isInputFocusedRef.current = false;

            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

            if (onSelect) {
              const components = place.address_components || [];
              const getComponent = (type: string) =>
                components.find((c) => c.types.includes(type))?.long_name || '';

              const details: PlaceDetails = {
                formattedAddress: address,
                placeId: place.place_id,
                lat: place.geometry?.location?.lat(),
                lng: place.geometry?.location?.lng(),
                streetNumber: getComponent('street_number'),
                streetName: getComponent('route'),
                suburb: getComponent('locality'),
                state: getComponent('administrative_area_level_1'),
                postcode: getComponent('postal_code'),
              };
              onSelect(details);
            }
          }
        }
      );
    },
    [onChange, onSelect]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setPredictions([]);
      setIsOpen(false);
      isInputFocusedRef.current = false;
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    onChange('');
    setPredictions([]);
    setIsSearching(false);
    setIsOpen(false);
    isInputFocusedRef.current = false;
    if (onSelect) onSelect({ formattedAddress: '' });
    inputRef.current?.focus();
  };

  const showDropdown = isOpen && predictions.length > 0;
  const showLoading = !isReady || isSearching;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          {showLoading && value.trim() ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            <MapPin className={`h-4 w-4 ${isOpen ? 'text-emerald-500' : 'text-slate-400'}`} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 transition focus:border-emerald-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
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

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <ul className="py-1">
              {predictions.map((prediction, index) => (
                <li
                  key={prediction.placeId}
                  onPointerDown={(e) => {
                    // allow scrolling; just track for tap-vs-scroll
                    itemPointerRef.current = {
                      pointerId: e.pointerId,
                      startX: e.clientX,
                      startY: e.clientY,
                      moved: false,
                      prediction,
                    };
                    setHighlightedIndex(index);
                  }}
                  onPointerMove={(e) => {
                    const st = itemPointerRef.current;
                    if (!st || st.pointerId !== e.pointerId) return;
                    const dx = Math.abs(e.clientX - st.startX);
                    const dy = Math.abs(e.clientY - st.startY);
                    if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) {
                      st.moved = true;
                      itemPointerRef.current = st;
                    }
                  }}
                  onPointerUp={(e) => {
                    const st = itemPointerRef.current;
                    if (!st || st.pointerId !== e.pointerId) return;
                    itemPointerRef.current = null;

                    // Only select on a true tap (not a scroll)
                    if (!st.moved && st.prediction) {
                      handleSelect(st.prediction);
                    }
                  }}
                  onPointerCancel={() => {
                    itemPointerRef.current = null;
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                    highlightedIndex === index ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <MapPin className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{prediction.mainText}</p>
                    <p className="truncate text-xs text-slate-500">{prediction.secondaryText}</p>
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

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
