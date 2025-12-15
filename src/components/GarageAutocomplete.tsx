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

/**
 * iOS keyboard detection using VisualViewport.
 * When the keyboard opens, visualViewport.height shrinks.
 */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const THRESHOLD_PX = 120;
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
  const [isOpen, setIsOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const keyboardOpen = useKeyboardOpen();
  const isInputFocusedRef = useRef(false);

  const outsideStartRef = useRef<{ x: number; y: number } | null>(null);
  const SCROLL_THRESHOLD = 10;

  const suppressNextFocusRef = useRef(false);

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
    isInputFocusedRef.current = false;
  };

  // ✅ Outside handler matching AddressAutocomplete behavior
  useEffect(() => {
    const isFocusable = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName?.toLowerCase();
      if (!tag) return false;
      if (node.isContentEditable) return true;
      return tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button';
    };

    const onPointerDownCapture = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const target = e.target as Node;
      if (containerRef.current.contains(target)) return;

      outsideStartRef.current = { x: e.clientX, y: e.clientY };

      if (keyboardOpen || isInputFocusedRef.current) {
        suppressNextFocusRef.current = true;

        e.preventDefault();
        e.stopPropagation();

        inputRef.current?.blur();
        setIsOpen(true);

        window.setTimeout(() => {
          suppressNextFocusRef.current = false;
        }, 350);
      }
    };

    const onPointerUpCapture = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const target = e.target as Node;
      if (containerRef.current.contains(target)) return;

      const start = outsideStartRef.current;
      outsideStartRef.current = null;
      if (!start) return;

      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      const isTap = dx < SCROLL_THRESHOLD && dy < SCROLL_THRESHOLD;
      if (!isTap) return;

      if (!keyboardOpen && !isInputFocusedRef.current) {
        setIsOpen(false);
      }
    };

    const onFocusInCapture = (e: FocusEvent) => {
      if (!suppressNextFocusRef.current) return;
      if (!isFocusable(e.target)) return;

      e.preventDefault?.();
      (e.target as HTMLElement)?.blur?.();
    };

    document.addEventListener('pointerdown', onPointerDownCapture, true);
    document.addEventListener('pointerup', onPointerUpCapture, true);
    document.addEventListener('focusin', onFocusInCapture, true);

    return () => {
      document.removeEventListener('pointerdown', onPointerDownCapture, true);
      document.removeEventListener('pointerup', onPointerUpCapture, true);
      document.removeEventListener('focusin', onFocusInCapture, true);
    };
  }, [keyboardOpen]);

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

  // Execute dual search (car_repair + car_dealer)
  const executeDualSearch = useCallback(
    (searchTerm: string, suburbFilter: string | null, onComplete: (results: Prediction[]) => void) => {
      if (!autocompleteServiceRef.current) {
        onComplete([]);
        return;
      }

      const newcastleBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(-33.1, 151.4),
        new google.maps.LatLng(-32.7, 151.9)
      );

      const baseRequest = {
        input: searchTerm,
        componentRestrictions: { country: 'au' },
        sessionToken: sessionTokenRef.current || undefined,
        bounds: biasToNewcastle ? newcastleBounds : undefined,
      };

      const carRepairRequest: google.maps.places.AutocompletionRequest = {
        ...baseRequest,
        types: ['car_repair'],
      };

      const carDealerRequest: google.maps.places.AutocompletionRequest = {
        ...baseRequest,
        types: ['car_dealer'],
      };

      let completedRequests = 0;
      const allResults: Prediction[] = [];
      const seenPlaceIds = new Set<string>();

      const handleResults = (
        results: google.maps.places.AutocompletePrediction[] | null,
        status: google.maps.places.PlacesServiceStatus
      ) => {
        completedRequests++;

        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          results.forEach((result) => {
            if (!seenPlaceIds.has(result.place_id)) {
              seenPlaceIds.add(result.place_id);
              allResults.push({
                placeId: result.place_id,
                mainText: result.structured_formatting.main_text,
                secondaryText: result.structured_formatting.secondary_text,
              });
            }
          });
        }

        if (completedRequests === 2) {
          if (suburbFilter) {
            const suburbLower = suburbFilter.toLowerCase();
            allResults.sort((a, b) => {
              const aHasSuburb = a.secondaryText.toLowerCase().includes(suburbLower);
              const bHasSuburb = b.secondaryText.toLowerCase().includes(suburbLower);
              if (aHasSuburb && !bHasSuburb) return -1;
              if (!aHasSuburb && bHasSuburb) return 1;
              return 0;
            });
          }
          onComplete(allResults.slice(0, 5));
        }
      };

      autocompleteServiceRef.current.getPlacePredictions(carRepairRequest, handleResults);
      autocompleteServiceRef.current.getPlacePredictions(carDealerRequest, handleResults);
    },
    [biasToNewcastle]
  );

  // Search for predictions with fallback
  const searchPredictions = useCallback(
    (input: string) => {
      if (!autocompleteServiceRef.current || !input.trim()) {
        setPredictions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      const words = input.trim().split(/\s+/);

      const knownSuburbs = [
        'hamilton',
        'newcastle',
        'maitland',
        'charlestown',
        'kotara',
        'lambton',
        'mayfield',
        'wallsend',
        'jesmond',
        'waratah',
        'broadmeadow',
        'adamstown',
        'merewether',
        'cooks hill',
        'islington',
        'cardiff',
        'belmont',
        'warners bay',
        'toronto',
        'cessnock',
        'raymond terrace',
        'nelson bay',
        'singleton',
        'muswellbrook',
      ];

      let businessName = input;
      let suburbFilter: string | null = null;

      if (words.length >= 2) {
        const lastWord = words[words.length - 1].toLowerCase();
        const lastTwoWords =
          words.length >= 3
            ? `${words[words.length - 2]} ${words[words.length - 1]}`.toLowerCase()
            : null;

        if (lastTwoWords && knownSuburbs.includes(lastTwoWords)) {
          businessName = words.slice(0, -2).join(' ');
          suburbFilter = lastTwoWords;
        } else if (knownSuburbs.includes(lastWord)) {
          businessName = words.slice(0, -1).join(' ');
          suburbFilter = lastWord;
        }
      }

      executeDualSearch(input, null, (results) => {
        if (results.length > 0) {
          if (suburbFilter) {
            const suburbLower = suburbFilter.toLowerCase();
            results.sort((a, b) => {
              const aHasSuburb = a.secondaryText.toLowerCase().includes(suburbLower);
              const bHasSuburb = b.secondaryText.toLowerCase().includes(suburbLower);
              if (aHasSuburb && !bHasSuburb) return -1;
              if (!aHasSuburb && bHasSuburb) return 1;
              return 0;
            });
          }
          setIsSearching(false);
          setPredictions(results);
        } else if (businessName !== input && businessName.trim()) {
          executeDualSearch(businessName, suburbFilter, (fallbackResults) => {
            setIsSearching(false);
            setPredictions(fallbackResults);
          });
        } else {
          setIsSearching(false);
          setPredictions([]);
        }
      });
    },
    [executeDualSearch]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim() && isOpen && isReady) {
      debounceRef.current = setTimeout(() => {
        searchPredictions(value);
      }, 300);
    } else if (!value.trim()) {
      setPredictions([]);
      setIsSearching(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, isOpen, isReady, searchPredictions]);

  // Handle selection
  const handleSelect = useCallback(
    (prediction: Prediction) => {
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
            setIsOpen(false);
            isInputFocusedRef.current = false;

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
    setSelectedAddress('');
    setPredictions([]);
    setIsSearching(false);
    setIsOpen(false);
    isInputFocusedRef.current = false;
    if (onSelect) {
      onSelect({ name: '', formattedAddress: '' });
    }
    inputRef.current?.focus();
  };

  const showDropdown = isOpen && predictions.length > 0;
  const showLoading = !isReady || isSearching;

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          {showLoading && value.trim() ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            <Wrench className={`h-4 w-4 ${isOpen ? 'text-emerald-500' : 'text-slate-400'}`} />
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
                  <Wrench className="h-5 w-5 flex-shrink-0 text-emerald-500" />
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

      {error && <p className="text-xs text-red-500">{error}</p>}

      {selectedAddress && (
        <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <p className="text-xs text-slate-600">{selectedAddress}</p>
        </div>
      )}
    </div>
  );
}
