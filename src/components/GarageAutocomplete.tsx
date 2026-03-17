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
  /** User's detected latitude — if provided, used as bias center */
  userLat?: number | null;
  /** User's detected longitude — if provided, used as bias center */
  userLng?: number | null;
  /**
   * @deprecated Use userLat/userLng instead. Kept for backwards compatibility.
   * If true and no userLat/userLng provided, falls back to dual-region search.
   */
  biasToNewcastle?: boolean;
}

// Drivlet service region centers
const NEWCASTLE = { lat: -32.9283, lng: 151.7817 };
const CANBERRA = { lat: -35.2809, lng: 149.1300 };
const BIAS_RADIUS = 50000; // 50km radius (Google max)

// Known suburbs for sorting — Newcastle/Hunter + Canberra/ACT regions
const KNOWN_SUBURBS: string[] = [
  // Newcastle & Hunter Valley
  'hamilton', 'newcastle', 'maitland', 'charlestown', 'kotara', 'lambton',
  'mayfield', 'wallsend', 'jesmond', 'waratah', 'broadmeadow', 'adamstown',
  'merewether', 'cooks hill', 'islington', 'cardiff', 'belmont', 'warners bay',
  'toronto', 'cessnock', 'raymond terrace', 'nelson bay', 'singleton', 'muswellbrook',
  'beresfield', 'thornton', 'rutherford', 'kurri kurri', 'morisset', 'swansea',
  'lake macquarie', 'edgeworth', 'maryland', 'fletcher', 'minmi', 'elermore vale',
  'new lambton', 'georgetown', 'wickham', 'carrington', 'stockton', 'sandgate',
  'shortland', 'tighes hill', 'bar beach', 'the junction', 'cooranbong',
  'speers point', 'boolaroo', 'teralba', 'argenton', 'cameron park', 'east maitland',
  // Canberra & ACT
  'canberra', 'belconnen', 'woden', 'tuggeranong', 'gungahlin', 'weston creek',
  'mitchell', 'fyshwick', 'phillip', 'kingston', 'braddon', 'dickson',
  'civic', 'manuka', 'griffith', 'deakin', 'barton', 'yarralumla',
  'curtin', 'garran', 'hughes', 'lyons', 'wanniassa', 'kambah',
  'greenway', 'isabella plains', 'gordon', 'banks', 'conder',
  'hume', 'pialligo', 'majura', 'symonston', 'queanbeyan',
  'jerrabomberra', 'kaleen', 'giralang', 'evatt', 'spence',
  'scullin', 'page', 'hawker', 'weetangera', 'cook',
  'lyneham', 'turner', 'acton', 'reid', 'ainslie',
  'hackett', 'downer', 'watson', 'mitchell', 'casey',
  'ngunnawal', 'amaroo', 'harrison', 'franklin', 'forde',
  'bonner', 'jacka', 'moncrieff', 'throsby', 'taylor',
];

export default function GarageAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search for a garage...',
  disabled = false,
  userLat,
  userLng,
  biasToNewcastle = true,
}: GarageAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isReady, setIsReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isInputFocusedRef = useRef(false);

  const outsideStartRef = useRef<{ x: number; y: number } | null>(null);
  const SCROLL_THRESHOLD = 10;

  const itemPointerRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    prediction: Prediction | null;
  } | null>(null);

  // Determine if we have a user-provided location
  const hasUserLocation = userLat != null && userLng != null;

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

  // Handle outside clicks/taps to close dropdown
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

      if (isTap) {
        setIsOpen(false);
        isInputFocusedRef.current = false;
        inputRef.current?.blur();
      }
    };

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
        if (google.maps.places && google.maps.places.Place) {
          setIsReady(true);
          setError(null);
        } else {
          setError('Places API not available');
        }
      } catch (err) {
        console.error('Error initializing services:', err);
        setError('Failed to initialize garage search');
      }
    };

    if (window.google?.maps?.places?.Place) {
      initServices();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');

    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places?.Place) {
          clearInterval(checkLoaded);
          initServices();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps?.places?.Place) {
          setError('Failed to load Google Maps');
        }
      }, 10000);

      return () => clearInterval(checkLoaded);
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      const checkReady = setInterval(() => {
        if (window.google?.maps?.places?.Place) {
          clearInterval(checkReady);
          initServices();
        }
      }, 100);

      setTimeout(() => clearInterval(checkReady), 10000);
    };

    script.onerror = () => {
      setError('Failed to load Google Maps');
    };

    document.head.appendChild(script);
  }, []);

  // Helper: run dual type search (car_repair + car_dealer) for a given bias center
  const fetchForRegion = async (
    input: string,
    center: { lat: number; lng: number }
  ): Promise<Prediction[]> => {
    const bias = { center, radius: BIAS_RADIUS };

    const carRepairRequest: google.maps.places.AutocompleteRequest = {
      input,
      includedRegionCodes: ['au'],
      includedPrimaryTypes: ['car_repair'],
      locationBias: bias,
    };

    const carDealerRequest: google.maps.places.AutocompleteRequest = {
      input,
      includedRegionCodes: ['au'],
      includedPrimaryTypes: ['car_dealer'],
      locationBias: bias,
    };

    const [repairResults, dealerResults] = await Promise.allSettled([
      google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(carRepairRequest),
      google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(carDealerRequest),
    ]);

    const results: Prediction[] = [];
    const seen = new Set<string>();

    for (const result of [repairResults, dealerResults]) {
      if (result.status === 'fulfilled' && result.value.suggestions) {
        for (const suggestion of result.value.suggestions) {
          if (suggestion.placePrediction && !seen.has(suggestion.placePrediction.placeId)) {
            seen.add(suggestion.placePrediction.placeId);
            results.push({
              placeId: suggestion.placePrediction.placeId,
              mainText: suggestion.placePrediction.mainText?.text || '',
              secondaryText: suggestion.placePrediction.secondaryText?.text || '',
            });
          }
        }
      }
    }

    return results;
  };

  // Apply suburb-based sorting
  const sortBySuburb = (results: Prediction[], input: string): Prediction[] => {
    const words = input.trim().split(/\s+/);
    if (words.length < 2) return results;

    const lastWord = words[words.length - 1].toLowerCase();
    const lastTwoWords = words.length >= 3
      ? `${words[words.length - 2]} ${words[words.length - 1]}`.toLowerCase()
      : null;

    let suburbFilter: string | null = null;
    if (lastTwoWords && KNOWN_SUBURBS.includes(lastTwoWords)) {
      suburbFilter = lastTwoWords;
    } else if (KNOWN_SUBURBS.includes(lastWord)) {
      suburbFilter = lastWord;
    }

    if (!suburbFilter) return results;

    const suburbLower = suburbFilter.toLowerCase();
    return [...results].sort((a, b) => {
      const aHas = a.secondaryText.toLowerCase().includes(suburbLower);
      const bHas = b.secondaryText.toLowerCase().includes(suburbLower);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return 0;
    });
  };

  // Search for predictions
  const searchPredictions = useCallback(
    async (input: string) => {
      if (!isReady || !input.trim()) {
        setPredictions([]);
        setIsSearching(false);
        return;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsSearching(true);

      try {
        let allResults: Prediction[];

        if (hasUserLocation) {
          // We have the user's detected location — single dual-type search
          allResults = await fetchForRegion(input, { lat: userLat!, lng: userLng! });
        } else if (biasToNewcastle) {
          // No user location — search both service regions in parallel
          const [newcastleResults, canberraResults] = await Promise.allSettled([
            fetchForRegion(input, NEWCASTLE),
            fetchForRegion(input, CANBERRA),
          ]);

          const merged: Prediction[] = [];
          const seen = new Set<string>();

          // Newcastle results first
          if (newcastleResults.status === 'fulfilled') {
            for (const p of newcastleResults.value) {
              if (!seen.has(p.placeId)) {
                seen.add(p.placeId);
                merged.push(p);
              }
            }
          }

          // Then Canberra results
          if (canberraResults.status === 'fulfilled') {
            for (const p of canberraResults.value) {
              if (!seen.has(p.placeId)) {
                seen.add(p.placeId);
                merged.push(p);
              }
            }
          }

          allResults = merged;
        } else {
          // No bias — plain search
          allResults = await fetchForRegion(input, NEWCASTLE);
        }

        // Apply suburb sorting and limit
        const sorted = sortBySuburb(allResults, input);
        setPredictions(sorted.slice(0, 5));
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Autocomplete error:', err);
        }
        setPredictions([]);
      } finally {
        setIsSearching(false);
      }
    },
    [biasToNewcastle, isReady, hasUserLocation, userLat, userLng]
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

  // Handle selection using new API
  const handleSelect = useCallback(
    async (prediction: Prediction) => {
      try {
        const place = new google.maps.places.Place({ id: prediction.placeId });

        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'id', 'nationalPhoneNumber'],
        });

        const address = place.formattedAddress || '';
        const addressParts = address.split(',');
        const suburb = addressParts[1]?.trim().split(' ')[0] || '';

        const displayValue = suburb ? `${place.displayName} - ${suburb}` : place.displayName || '';
        onChange(displayValue);
        setSelectedAddress(address);
        setPredictions([]);
        setIsOpen(false);
        isInputFocusedRef.current = false;

        if (onSelect) {
          const details: GarageDetails = {
            name: place.displayName || '',
            formattedAddress: address,
            placeId: place.id,
            lat: place.location?.lat(),
            lng: place.location?.lng(),
            phoneNumber: place.nationalPhoneNumber ?? undefined,
          };
          onSelect(details);
        }
      } catch (err) {
        console.error('Error fetching place details:', err);
      }
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
