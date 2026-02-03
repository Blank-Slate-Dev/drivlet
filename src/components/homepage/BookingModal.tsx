// src/components/homepage/BookingModal.tsx
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Clock,
  Car,
  Building,
  User,
  Mail,
  Phone,
  Copy,
  Calendar,
  Check,
  Zap,
  Wrench,
  Settings,
  Info,
} from 'lucide-react';
import RegistrationPlate, { StateCode } from './RegistrationPlate';
import AddressAutocomplete, { PlaceDetails } from '@/components/AddressAutocomplete';
import GarageAutocomplete, { GarageDetails } from '@/components/GarageAutocomplete';
import ServiceSelector from '@/components/booking/ServiceSelector';
import DistanceZoneMap from '@/components/booking/DistanceZoneMap';
import {
  SERVICE_CATEGORIES,
  SelectedServiceCategory,
  getTotalSelectedCount,
  formatSelectedServices,
  getCategoryById,
} from '@/constants/serviceCategories';
import { FEATURES, TRANSPORT_PRICE_DISPLAY, TRANSPORT_PRICE } from '@/lib/featureFlags';
import { calculateDistance, getDistanceZone, ZoneInfo } from '@/lib/distanceZones';
import {
  PICKUP_SLOTS,
  DROPOFF_SLOTS,
  SERVICE_TYPES,
  getPickupSlotLabel,
  getDropoffSlotLabel,
  getServiceTypeByValue,
} from '@/config/timeSlots';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '@/components/StripePaymentForm';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const VEHICLE_COLORS = [
  { value: 'white', label: 'White', hex: '#FFFFFF' },
  { value: 'black', label: 'Black', hex: '#000000' },
  { value: 'silver', label: 'Silver', hex: '#C0C0C0' },
  { value: 'grey', label: 'Grey', hex: '#808080' },
  { value: 'red', label: 'Red', hex: '#DC2626' },
  { value: 'blue', label: 'Blue', hex: '#2563EB' },
  { value: 'green', label: 'Green', hex: '#059669' },
  { value: 'yellow', label: 'Yellow', hex: '#EAB308' },
  { value: 'orange', label: 'Orange', hex: '#EA580C' },
  { value: 'brown', label: 'Brown', hex: '#92400E' },
  { value: 'beige', label: 'Beige', hex: '#D4AF37' },
  { value: 'other', label: 'Other', hex: '#6B7280' },
] as const;

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TimeOption {
  value: string;
  label: string;
  minutes: number;
}

function generateTimeOptions(startHour: number, endHour: number): TimeOption[] {
  const options: TimeOption[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === endHour && minute > 0) continue;

      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'am' : 'pm';
      const label = `${displayHour}:${minute.toString().padStart(2, '0')}${ampm}`;
      const minutes = hour * 60 + minute;

      options.push({ value, label, minutes });
    }
  }
  return options;
}

const allPickupTimeOptions = generateTimeOptions(6, 14);
const allDropoffTimeOptions = generateTimeOptions(9, 19);
const MIN_GAP_MINUTES = 120;

// Garage booking time options (typical garage hours)
const garageBookingTimeOptions = generateTimeOptions(7, 17);

// ── Zone badge colour helper ───────────────────────────────────────────
const ZONE_BADGE_STYLES: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
  red: 'bg-red-100 text-red-800 border-red-300',
};

type Step = 'details' | 'review' | 'payment' | 'success';

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const { data: session, status: authStatus } = useSession();

  // Refs (used to stop background scroll chaining)
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>('details');

  // Form state
  const [regoPlate, setRegoPlate] = useState('');
  const [regoState, setRegoState] = useState<StateCode>('NSW');
  const [selectedPickupSlot, setSelectedPickupSlot] = useState('');
  const [selectedDropoffSlot, setSelectedDropoffSlot] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('regular_service');
  const [pickupAddress, setPickupAddress] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<PlaceDetails | null>(null);

  // Slot availability
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [slotAvailability, setSlotAvailability] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Guest checkout fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Garage booking details (mandatory)
  const [garageSearch, setGarageSearch] = useState('');
  const [garageAddress, setGarageAddress] = useState('');
  const [garagePlaceId, setGaragePlaceId] = useState('');
  const [garageLat, setGarageLat] = useState<number | null>(null);
  const [garageLng, setGarageLng] = useState<number | null>(null);
  const [garageBookingTime, setGarageBookingTime] = useState('09:00');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Vehicle details
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [customColor, setCustomColor] = useState('');

  // Vehicle valuation and transmission
  const [isHighValueVehicle, setIsHighValueVehicle] = useState(false);
  const [transmissionType, setTransmissionType] = useState<'automatic' | 'manual'>('automatic');

  // Service selection
  const [selectedServices, setSelectedServices] = useState<SelectedServiceCategory[]>([]);
  const [primaryServiceCategory, setPrimaryServiceCategory] = useState<string | null>(null);
  const [serviceNotes, setServiceNotes] = useState('');

  // Payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Tracking code state
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  // Determine if user is authenticated
  const isAuthenticated = authStatus === 'authenticated' && session?.user;

  // ── Distance zone calculation ─────────────────────────────────────────
  const distanceZoneInfo: ZoneInfo | null = useMemo(() => {
    if (
      selectedPlaceDetails?.lat != null &&
      selectedPlaceDetails?.lng != null &&
      garageLat != null &&
      garageLng != null
    ) {
      const km = calculateDistance(
        selectedPlaceDetails.lat,
        selectedPlaceDetails.lng,
        garageLat,
        garageLng
      );
      return getDistanceZone(km);
    }
    return null;
  }, [selectedPlaceDetails, garageLat, garageLng]);

  // Dynamic total price (base + zone surcharge)
  const totalPriceCents = TRANSPORT_PRICE + (distanceZoneInfo?.surchargeAmount ?? 0);
  const totalPriceDisplay = `$${(totalPriceCents / 100).toFixed(2)}`;

  // Is the booking blocked by a red zone?
  const isRedZone = distanceZoneInfo?.zone === 'red';

  // Fetch user's saved mobile when authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      fetch('/api/account/profile')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.mobile && !guestPhone) {
            setGuestPhone(data.mobile);
          }
        })
        .catch(() => {
          // Silently fail - phone field will just be empty
        });
    }
  }, [isAuthenticated, isOpen]);

  // Get customer info (either from session or guest fields)
  const customerName = isAuthenticated ? (session?.user?.username || '') : guestName;
  const customerEmail = isAuthenticated ? (session?.user?.email || '') : guestEmail;
  const customerPhone = guestPhone;

  // Fetch slot availability when date changes
  useEffect(() => {
    if (serviceDate) {
      setLoadingSlots(true);
      fetch(`/api/bookings/slot-availability?date=${serviceDate}`)
        .then(res => res.json())
        .then(data => {
          setSlotAvailability(data);
          if (selectedPickupSlot && data.pickupSlots) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pickup = data.pickupSlots.find((s: any) => s.slot === selectedPickupSlot);
            if (pickup?.isFull) setSelectedPickupSlot('');
          }
          if (selectedDropoffSlot && data.dropoffSlots) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dropoff = data.dropoffSlots.find((s: any) => s.slot === selectedDropoffSlot);
            if (dropoff?.isFull) setSelectedDropoffSlot('');
          }
        })
        .catch(() => {
          // Silently fail
        })
        .finally(() => setLoadingSlots(false));
    } else {
      setSlotAvailability(null);
    }
  }, [serviceDate]);

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Get maximum date (90 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    return maxDate.toISOString().split('T')[0];
  };

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Service type icon helper
  const getServiceIcon = (value: string) => {
    switch (value) {
      case 'quick_service': return Zap;
      case 'regular_service': return Wrench;
      case 'major_service': return Settings;
      default: return Wrench;
    }
  };

  /**
   * Background scroll lock using CSS-only approach.
   */
  const lockBackgroundScroll = useCallback(() => {
    const html = document.documentElement;
    const body = document.body;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    body.dataset.scrollY = String(scrollY);
    body.dataset.prevBodyPaddingRight = body.style.paddingRight || '';
    body.dataset.prevHtmlOverflow = html.style.overflow || '';
    body.dataset.prevBodyOverflow = body.style.overflow || '';
    body.dataset.prevTouchAction = body.style.touchAction || '';

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
  }, []);

  const unlockBackgroundScroll = useCallback(() => {
    const html = document.documentElement;
    const body = document.body;

    const scrollY = Number(body.dataset.scrollY || '0');

    html.style.overflow = body.dataset.prevHtmlOverflow ?? '';
    body.style.overflow = body.dataset.prevBodyOverflow ?? '';
    body.style.paddingRight = body.dataset.prevBodyPaddingRight ?? '';
    body.style.touchAction = body.dataset.prevTouchAction ?? '';

    delete body.dataset.scrollY;
    delete body.dataset.prevBodyPaddingRight;
    delete body.dataset.prevHtmlOverflow;
    delete body.dataset.prevBodyOverflow;
    delete body.dataset.prevTouchAction;

    window.scrollTo(0, scrollY);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    lockBackgroundScroll();

    const onKeyDown = (e: KeyboardEvent) => {
      const keys = [' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'];
      if (keys.includes(e.key)) {
        const active = document.activeElement as HTMLElement | null;
        const container = modalContentRef.current;
        if (!container || !active || !container.contains(active)) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      unlockBackgroundScroll();
    };
  }, [isOpen, lockBackgroundScroll, unlockBackgroundScroll]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setCurrentStep('details');
        setRegoPlate('');
        setRegoState('NSW');
        setPickupAddress('');
        setServiceDate('');
        setSelectedPlaceDetails(null);
        setSubmitError(null);
        setSelectedPickupSlot('');
        setSelectedDropoffSlot('');
        setSelectedServiceType('regular_service');
        setSlotAvailability(null);
        setGarageSearch('');
        setGarageAddress('');
        setGaragePlaceId('');
        setGarageLat(null);
        setGarageLng(null);
        setGarageBookingTime('09:00');
        setAdditionalNotes('');
        setGuestName('');
        setGuestEmail('');
        setGuestPhone('');
        setClientSecret(null);
        setPaymentIntentId(null);
        setIsProcessing(false);
        setVehicleYear('');
        setVehicleModel('');
        setVehicleColor('');
        setCustomColor('');
        setIsHighValueVehicle(false);
        setTransmissionType('automatic');
        setSelectedServices([]);
        setPrimaryServiceCategory(null);
        setServiceNotes('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleAddressSelect = (details: PlaceDetails) => {
    setSelectedPlaceDetails(details);
  };

  /** Clear stale place details when user types a new pickup address */
  const handlePickupAddressChange = (value: string) => {
    setPickupAddress(value);
    setSelectedPlaceDetails(null);
  };

  const handleGarageSelect = (details: GarageDetails) => {
    setGarageAddress(details.formattedAddress);
    setGaragePlaceId(details.placeId || '');
    setGarageLat(details.lat ?? null);
    setGarageLng(details.lng ?? null);
  };

  /** Clear stale garage coords when user types a new garage name */
  const handleGarageSearchChange = (value: string) => {
    setGarageSearch(value);
    setGarageLat(null);
    setGarageLng(null);
  };

  const getTimeLabel = (value: string, options: TimeOption[]): string => {
    const option = options.find((t) => t.value === value);
    return option?.label || value;
  };

  const validateDetailsStep = (): string | null => {
    // Block high-value vehicles
    if (isHighValueVehicle) {
      return 'Vehicles valued at $100,000 or more cannot be booked at this time.';
    }

    // Block red-zone bookings
    if (isRedZone) {
      return 'Your pickup address is too far from the selected garage (over 18 km). Please choose a closer garage or contact our team for assistance.';
    }

    // Guest info validation
    if (!isAuthenticated) {
      if (!guestName.trim()) return 'Please enter your full name.';
      if (!guestEmail.trim()) return 'Please enter your email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) return 'Please enter a valid email address.';
      if (!guestPhone.trim()) return 'Please enter your phone number.';
    }

    if (!regoPlate.trim()) return 'Please enter your vehicle registration number.';
    if (!vehicleYear.trim()) return 'Please enter your vehicle year.';
    if (!/^\d{4}$/.test(vehicleYear)) return 'Please enter a valid 4-digit year.';
    const year = parseInt(vehicleYear);
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) return `Please enter a year between 1900 and ${currentYear + 1}.`;
    if (!vehicleModel.trim()) return 'Please enter your vehicle make and model.';
    if (vehicleModel.trim().length < 3) return 'Vehicle make and model must be at least 3 characters.';
    if (!vehicleColor) return 'Please select your vehicle color.';
    if (vehicleColor === 'other' && !customColor.trim()) return 'Please enter your custom vehicle color.';
    if (!pickupAddress.trim()) return 'Please enter your pick-up address.';
    if (!serviceDate) return 'Please select a service date.';

    const selectedDate = new Date(serviceDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) return 'Service date cannot be in the past.';

    if (!selectedPickupSlot) return 'Please select a pickup time slot.';
    if (!selectedDropoffSlot) return 'Please select a drop-off time slot.';
    if (!selectedServiceType) return 'Please select a service type.';

    // Garage is mandatory
    if (!garageSearch.trim()) return 'Please enter your garage/mechanic name.';
    if (!garageBookingTime) return 'Please select your garage booking time.';

    // Service selection validation (only required when marketplace features enabled)
    if (FEATURES.SERVICE_SELECTION && getTotalSelectedCount(selectedServices) === 0) {
      return 'Please select at least one service type for your booking.';
    }

    return null;
  };

  const handleContinueToReview = () => {
    const validationError = validateDetailsStep();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setSubmitError(null);
    setCurrentStep('review');
  };

  const handleProceedToPayment = async () => {
    setIsProcessing(true);
    setSubmitError(null);

    try {
      const serviceTypeInfo = getServiceTypeByValue(selectedServiceType);

      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          pickupAddress: pickupAddress.trim(),
          serviceType: selectedServiceType,
          serviceDate: new Date(serviceDate).toISOString(),
          vehicleRegistration: regoPlate.trim().toUpperCase(),
          vehicleState: regoState,
          vehicleYear,
          vehicleModel: vehicleModel.trim(),
          vehicleColor: vehicleColor === 'other' ? customColor.trim() : vehicleColor,
          pickupTimeSlot: selectedPickupSlot,
          dropoffTimeSlot: selectedDropoffSlot,
          earliestPickup: getPickupSlotLabel(selectedPickupSlot),
          latestDropoff: getDropoffSlotLabel(selectedDropoffSlot),
          estimatedServiceDuration: serviceTypeInfo?.estimatedHours || 4,
          hasExistingBooking: true,
          garageName: garageSearch.trim(),
          garageAddress: garageAddress.trim(),
          garagePlaceId: garagePlaceId,
          garageBookingTime: getTimeLabel(garageBookingTime, garageBookingTimeOptions),
          additionalNotes: additionalNotes.trim(),
          transmissionType,
          isManualTransmission: transmissionType === 'manual',
          selectedServices: JSON.stringify(selectedServices),
          primaryServiceCategory,
          serviceNotes: serviceNotes.trim(),
          // Distance zone data
          distanceZone: distanceZoneInfo?.zone || 'green',
          distanceSurcharge: distanceZoneInfo?.surchargeAmount ?? 0,
          distanceKm: distanceZoneInfo?.distance ?? 0,
          pickupLat: selectedPlaceDetails?.lat ?? 0,
          pickupLng: selectedPlaceDetails?.lng ?? 0,
          garageLat: garageLat ?? 0,
          garageLng: garageLng ?? 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setCurrentStep('payment');
    } catch (error) {
      console.error('Payment initialization error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (paymentIntentId) {
      try {
        console.log('💾 Saving booking to database...');
        const response = await fetch('/api/bookings/create-after-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId }),
        });

        const data = await response.json();

        if (response.ok) {
          console.log('✅ Booking saved:', data.bookingId);
          if (data.trackingCode) {
            setTrackingCode(data.trackingCode);
            console.log('🔑 Tracking code:', data.trackingCode);
          }
        } else {
          console.error('❌ Failed to save booking:', data.error);
        }
      } catch (error) {
        console.error('❌ Error saving booking:', error);
      }
    }

    setCurrentStep('success');
  };

  const handlePaymentError = (error: string) => {
    setSubmitError(error);
  };

  // Don't render if loading auth
  if (authStatus === 'loading') {
    return null;
  }

  // Build tracking URL for success page
  const trackingUrl = trackingCode
    ? `/track?code=${encodeURIComponent(trackingCode)}`
    : `/track`;

  // ════════════════════════════════════════════════════════════════════════
  // SUCCESS STEP
  // ════════════════════════════════════════════════════════════════════════
  if (currentStep === 'success') {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md">
                <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-2xl">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h3 className="mt-6 text-2xl font-bold text-slate-900">Booking Confirmed!</h3>
                  <p className="mt-2 text-slate-600">We&apos;ve received your booking and payment.</p>

                  {/* Booking Summary */}
                  <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vehicle</span>
                        <span className="font-medium text-slate-900">
                          {regoPlate.toUpperCase()} ({regoState})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Garage</span>
                        <span className="font-medium text-slate-900">{garageSearch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pickup</span>
                        <span className="font-medium text-slate-900">
                          {getPickupSlotLabel(selectedPickupSlot)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tracking Code Display */}
                  {trackingCode && (
                    <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <p className="text-sm text-emerald-700 mb-2 font-medium">Your Tracking Code:</p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-3xl font-mono font-bold tracking-[0.3em] text-emerald-700">
                          {trackingCode}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(trackingCode);
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition"
                          title="Copy to clipboard"
                          type="button"
                        >
                          <Copy className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="text-xs text-emerald-600 mt-2">
                        Save this code to track your booking
                      </p>
                    </div>
                  )}

                  <p className="mt-4 text-sm text-slate-500">
                    A confirmation email has been sent to <span className="font-medium">{customerEmail}</span>
                  </p>

                  <div className="mt-6 space-y-3">
                    <Link
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
                    >
                      <MapPin className="h-4 w-4" />
                      Track Your Booking
                    </Link>
                    <button
                      onClick={onClose}
                      className="block w-full rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // MAIN MODAL (details / review / payment)
  // ════════════════════════════════════════════════════════════════════════
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl">
              <div className="relative rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Step Indicator */}
                <div className="border-b border-slate-100 px-6 py-4 sm:px-8">
                  <div className="flex items-start justify-center">
                    {['details', 'review', 'payment'].map((step, index) => (
                      <div key={step} className="flex items-start">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                              currentStep === step
                                ? 'bg-emerald-600 text-white'
                                : ['details'].indexOf(currentStep) < index || (currentStep === 'details' && index > 0)
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-emerald-100 text-emerald-600'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <span
                            className={`mt-2 text-xs ${
                              currentStep === step ? 'font-medium text-emerald-600' : 'text-slate-500'
                            }`}
                          >
                            {step.charAt(0).toUpperCase() + step.slice(1)}
                          </span>
                        </div>
                        {index < 2 && (
                          <div
                            className={`mx-3 mt-4 h-0.5 w-12 sm:w-16 ${
                              ['details', 'review'].indexOf(currentStep) > index ? 'bg-emerald-400' : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scrollable content */}
                <div
                  ref={modalContentRef}
                  className="max-h-[70vh] overflow-y-auto overscroll-contain p-6 sm:p-8"
                  style={{ touchAction: 'auto' }}
                >
                  {/* ───────────────────── PAYMENT STEP ───────────────────── */}
                  {currentStep === 'payment' && clientSecret && (
                    <>
                      <div className="mb-5">
                        <button
                          onClick={() => setCurrentStep('review')}
                          disabled={isProcessing}
                          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back to review
                        </button>
                        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Payment Details</h2>
                        <p className="mt-1 text-sm text-slate-500">Complete your booking with secure payment</p>
                      </div>

                      {submitError && (
                        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                          <p className="text-sm font-medium text-red-800">{submitError}</p>
                        </div>
                      )}

                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          appearance: {
                            theme: 'stripe',
                            variables: {
                              colorPrimary: '#059669',
                              colorBackground: '#ffffff',
                              colorText: '#1e293b',
                              colorDanger: '#ef4444',
                              fontFamily: 'system-ui, sans-serif',
                              borderRadius: '12px',
                            },
                          },
                        }}
                      >
                        <StripePaymentForm
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                          isProcessing={isProcessing}
                          setIsProcessing={setIsProcessing}
                        />
                      </Elements>
                    </>
                  )}

                  {/* ───────────────────── REVIEW STEP ────────────────────── */}
                  {currentStep === 'review' && (
                    <>
                      <div className="mb-5">
                        <button
                          onClick={() => setCurrentStep('details')}
                          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Edit details
                        </button>
                        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Review Your Booking</h2>
                        <p className="mt-1 text-sm text-slate-500">Please confirm the details below before payment</p>
                      </div>

                      {submitError && (
                        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                          <p className="text-sm font-medium text-red-800">{submitError}</p>
                        </div>
                      )}

                      <div className="space-y-4">
                        {/* Customer Info */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <User className="h-4 w-4 text-emerald-600" />
                            Customer Details
                          </h3>
                          <div className="grid gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-20 text-slate-500">Name:</span>
                              <span className="font-medium text-slate-900">{customerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-slate-700">{customerEmail}</span>
                            </div>
                            {customerPhone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-700">{customerPhone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Vehicle */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Car className="h-4 w-4 text-emerald-600" />
                            Vehicle
                          </h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-slate-900">
                                {vehicleYear} {vehicleModel}
                              </span>
                              <div className="mt-1 flex items-center gap-2">
                                <div
                                  className="h-4 w-4 rounded-full border border-slate-300"
                                  style={{
                                    backgroundColor: VEHICLE_COLORS.find(
                                      c => c.value === vehicleColor
                                    )?.hex || '#6B7280',
                                  }}
                                />
                                <span className="text-sm capitalize text-slate-600">
                                  {vehicleColor === 'other' ? customColor : vehicleColor}
                                </span>
                              </div>
                            </div>
                            <RegistrationPlate plate={regoPlate} state={regoState} />
                          </div>
                          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2">
                            <span className="text-sm text-slate-500">Transmission</span>
                            <span
                              className={`text-sm font-medium ${
                                transmissionType === 'manual' ? 'text-amber-600' : 'text-slate-900'
                              }`}
                            >
                              {transmissionType === 'manual' ? 'Manual' : 'Automatic'}
                            </span>
                          </div>
                        </div>

                        {/* Service Date */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Calendar className="h-4 w-4 text-emerald-600" />
                            Service Date
                          </h3>
                          <p className="text-sm font-medium text-slate-900">
                            {formatDateDisplay(serviceDate)}
                          </p>
                        </div>

                        {/* Service Type */}
                        {(() => {
                          const svcInfo = getServiceTypeByValue(selectedServiceType);
                          const SvcIcon = getServiceIcon(selectedServiceType);
                          return (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <SvcIcon className="h-4 w-4 text-emerald-600" />
                                Service Type
                              </h3>
                              <p className="font-medium text-slate-900">{svcInfo?.label || selectedServiceType}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Estimated ~{svcInfo?.estimatedHours || 4} hours at service center
                              </p>
                            </div>
                          );
                        })()}

                        {/* Time Slots */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Clock className="h-4 w-4 text-emerald-600" />
                            Schedule
                          </h3>
                          <div className="grid gap-2 text-sm sm:grid-cols-2">
                            <div>
                              <span className="text-slate-500">Pickup slot:</span>
                              <p className="font-medium text-slate-900">
                                {getPickupSlotLabel(selectedPickupSlot)}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Drop-off slot:</span>
                              <p className="font-medium text-slate-900">
                                {getDropoffSlotLabel(selectedDropoffSlot)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <MapPin className="h-4 w-4 text-emerald-600" />
                            Pickup Location
                          </h3>
                          <p className="text-sm text-slate-900">{pickupAddress}</p>
                        </div>

                        {/* Selected Services - HIDDEN IN PHASE 1 */}
                        {FEATURES.SERVICE_SELECTION && getTotalSelectedCount(selectedServices) > 0 && (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Services Requested ({getTotalSelectedCount(selectedServices)})
                            </h3>
                            <div className="space-y-2 text-sm">
                              {selectedServices.map((sel) => {
                                const cat = getCategoryById(sel.category);
                                return (
                                  <div key={sel.category} className="text-emerald-800">
                                    <span className="font-medium">{cat?.name || sel.category}:</span>{' '}
                                    <span className="text-emerald-600">{sel.services.join(', ')}</span>
                                  </div>
                                );
                              })}
                              {serviceNotes && (
                                <div className="mt-2 border-t border-emerald-200 pt-2">
                                  <p className="text-xs text-emerald-600">Notes: {serviceNotes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Garage */}
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700">
                            <Building className="h-4 w-4" />
                            Garage Booking
                          </h3>
                          <div className="text-sm">
                            <p className="font-medium text-blue-900">{garageSearch}</p>
                            {garageAddress && <p className="mt-1 text-xs text-blue-700">{garageAddress}</p>}
                            <p className="mt-2 text-blue-600">
                              Appointment time: {getTimeLabel(garageBookingTime, garageBookingTimeOptions)}
                            </p>
                          </div>
                        </div>

                        {/* Distance Zone (review summary) */}
                        {distanceZoneInfo && (
                          <div className={`rounded-2xl border p-4 ${
                            distanceZoneInfo.zone === 'green'
                              ? 'border-emerald-200 bg-emerald-50'
                              : distanceZoneInfo.zone === 'yellow'
                              ? 'border-yellow-200 bg-yellow-50'
                              : 'border-orange-200 bg-orange-50'
                          }`}>
                            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <MapPin className="h-4 w-4" />
                              Distance Zone
                            </h3>
                            <div className="flex items-center gap-3 text-sm">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${ZONE_BADGE_STYLES[distanceZoneInfo.zone]}`}>
                                <span className={`h-2 w-2 rounded-full ${
                                  distanceZoneInfo.zone === 'green' ? 'bg-emerald-500' :
                                  distanceZoneInfo.zone === 'yellow' ? 'bg-yellow-500' :
                                  'bg-orange-500'
                                }`} />
                                {distanceZoneInfo.label}
                              </span>
                              <span className="text-slate-600">{distanceZoneInfo.distance} km</span>
                              {distanceZoneInfo.surchargeAmount > 0 && (
                                <span className="font-medium text-slate-800">{distanceZoneInfo.surchargeDisplay}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Additional Notes */}
                        {additionalNotes && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="mb-2 text-sm font-semibold text-slate-700">Notes</h3>
                            <p className="text-sm text-slate-600">{additionalNotes}</p>
                          </div>
                        )}

                        {/* Price – with breakdown when surcharge applies */}
                        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
                          <div className="space-y-2">
                            {distanceZoneInfo && distanceZoneInfo.surchargeAmount > 0 && (
                              <>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-emerald-700">Transport fee</span>
                                  <span className="font-medium text-emerald-700">{TRANSPORT_PRICE_DISPLAY}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-emerald-700">Distance surcharge ({distanceZoneInfo.label})</span>
                                  <span className="font-medium text-emerald-700">{distanceZoneInfo.surchargeDisplay}</span>
                                </div>
                                <div className="border-t border-emerald-200" />
                              </>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-semibold text-emerald-800">Total</span>
                              <span className="text-2xl font-bold text-emerald-700">{totalPriceDisplay} AUD</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleProceedToPayment}
                        disabled={isProcessing}
                        className="mt-5 w-full rounded-full bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Please wait...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Proceed to Payment
                            <ArrowRight className="h-5 w-5" />
                          </span>
                        )}
                      </button>
                    </>
                  )}

                  {/* ───────────────────── DETAILS STEP ───────────────────── */}
                  {currentStep === 'details' && (
                    <>
                      <div className="mb-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Book a Pick-up</h2>
                            <p className="mt-1 text-sm text-slate-500">We&apos;ll collect, service, and return your car</p>
                          </div>
                        </div>
                      </div>

                      {submitError && !isHighValueVehicle && !isRedZone && (
                        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                          <p className="text-sm font-medium text-red-800">{submitError}</p>
                        </div>
                      )}

                      <form
                        className="space-y-5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleContinueToReview();
                        }}
                      >
                        {/* High Value Vehicle Checkbox */}
                        <div
                          className={`rounded-xl border p-4 ${
                            isHighValueVehicle ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isHighValueVehicle}
                              onChange={(e) => setIsHighValueVehicle(e.target.checked)}
                              disabled={isProcessing}
                              className={`mt-1 h-5 w-5 rounded border-2 cursor-pointer ${
                                isHighValueVehicle ? 'border-red-500 accent-red-500' : 'border-slate-300 accent-emerald-600'
                              }`}
                            />
                            <div>
                              <span
                                className={`text-sm font-medium ${
                                  isHighValueVehicle ? 'text-red-700' : 'text-slate-700'
                                }`}
                              >
                                My vehicle has a market valuation of $100,000 or more
                              </span>
                              {isHighValueVehicle && (
                                <p className="mt-2 text-sm text-red-600">
                                  Unfortunately, for insurance reasons, Drivlet is currently unable to service vehicles
                                  with a market valuation of $100,000 or more. We&apos;re working to expand our coverage
                                  in the future. Please contact us if you have any questions.
                                </p>
                              )}
                            </div>
                          </label>
                        </div>

                        {/* Form content wrapped for conditional styling */}
                        <div className={`space-y-5 ${isHighValueVehicle ? 'opacity-50 pointer-events-none' : ''}`}>
                          {/* Guest Checkout Fields */}
                          {!isAuthenticated && (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                              <h3 className="mb-4 text-sm font-semibold text-slate-900">Your Details</h3>
                              <div className="space-y-3">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-600">Full Name *</label>
                                  <input
                                    type="text"
                                    placeholder="John Smith"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    disabled={isProcessing}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-600">Email *</label>
                                  <input
                                    type="email"
                                    placeholder="john@example.com"
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    disabled={isProcessing}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-600">Phone *</label>
                                  <input
                                    type="tel"
                                    placeholder="0412 345 678"
                                    value={guestPhone}
                                    onChange={(e) => setGuestPhone(e.target.value)}
                                    disabled={isProcessing}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                                  />
                                </div>
                              </div>
                              <p className="mt-3 text-xs text-slate-500">
                                Have an account?{' '}
                                <Link href="/login" className="font-medium text-emerald-600 hover:underline">
                                  Sign in
                                </Link>
                              </p>
                            </div>
                          )}

                          {/* Logged in user info */}
                          {isAuthenticated && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 font-semibold text-white">
                                  {(session?.user?.username || session?.user?.email || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-emerald-900">{session?.user?.username || 'User'}</p>
                                  <p className="text-sm text-emerald-700">{session?.user?.email}</p>
                                </div>
                              </div>
                              <div className="mt-3">
                                <label className="text-xs font-medium text-emerald-700">Phone (for driver contact)</label>
                                <input
                                  type="tel"
                                  placeholder="0412 345 678"
                                  value={guestPhone}
                                  onChange={(e) => setGuestPhone(e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                              </div>
                            </div>
                          )}

                          {/* Service Type Selection */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Service Type *</label>
                            <div className="grid gap-3">
                              {SERVICE_TYPES.map((service) => {
                                const SvcIcon = getServiceIcon(service.value);
                                return (
                                  <button
                                    key={service.value}
                                    type="button"
                                    onClick={() => setSelectedServiceType(service.value)}
                                    disabled={isProcessing}
                                    className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                                      selectedServiceType === service.value
                                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                                        : 'border-slate-200 bg-white hover:border-emerald-300'
                                    } disabled:opacity-50`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <SvcIcon className={`h-5 w-5 mt-0.5 ${
                                        selectedServiceType === service.value ? 'text-emerald-600' : 'text-slate-400'
                                      }`} />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <h4 className="font-semibold text-slate-900">{service.label}</h4>
                                          <span className="text-sm text-slate-500">~{service.estimatedHours}hrs</span>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-600">{service.description}</p>
                                      </div>
                                      {selectedServiceType === service.value && (
                                        <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-xs text-slate-400">
                              Estimated time your vehicle will be at the service center
                            </p>
                          </div>

                          {/* Service Date */}
                          <div className="space-y-1.5">
                            <label htmlFor="serviceDate" className="text-sm font-medium text-slate-700">
                              <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-emerald-600" />
                                Service Date *
                              </span>
                            </label>
                            <input
                              type="date"
                              id="serviceDate"
                              value={serviceDate}
                              onChange={(e) => setServiceDate(e.target.value)}
                              min={getMinDate()}
                              max={getMaxDate()}
                              disabled={isProcessing}
                              required
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                            />
                            <p className="text-xs text-slate-400">
                              Select a date between tomorrow and {formatDateDisplay(getMaxDate())}
                            </p>
                          </div>

                          {/* Pickup Time Slot */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Pickup Time Slot *</label>
                            {!serviceDate ? (
                              <p className="text-sm text-slate-400 py-3">Select a service date first to see available slots</p>
                            ) : loadingSlots ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                              </div>
                            ) : (
                              <div className="grid gap-2">
                                {(slotAvailability?.pickupSlots || PICKUP_SLOTS.map((s: typeof PICKUP_SLOTS[number]) => ({
                                  slot: s.value, label: s.label, booked: 0, available: 2, isFull: false,
                                }))).map((slot: { slot: string; label: string; available: number; isFull: boolean }) => (
                                  <button
                                    key={slot.slot}
                                    type="button"
                                    onClick={() => !slot.isFull && setSelectedPickupSlot(slot.slot)}
                                    disabled={slot.isFull || isProcessing}
                                    className={`relative rounded-xl border-2 px-4 py-3 text-left transition-all ${
                                      slot.isFull
                                        ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-50'
                                        : selectedPickupSlot === slot.slot
                                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                                          : 'border-slate-200 bg-white hover:border-emerald-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <span className="font-medium text-slate-900">{slot.label}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {slot.isFull ? (
                                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">Full</span>
                                        ) : (
                                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                            {slot.available} left
                                          </span>
                                        )}
                                        {selectedPickupSlot === slot.slot && (
                                          <Check className="h-5 w-5 text-emerald-600" />
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-slate-400">Morning pickup slots only</p>
                          </div>

                          {/* Dropoff Time Slot */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Drop-off Time Slot *</label>
                            {!serviceDate ? (
                              <p className="text-sm text-slate-400 py-3">Select a service date first to see available slots</p>
                            ) : loadingSlots ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                              </div>
                            ) : (
                              <div className="grid gap-2">
                                {(slotAvailability?.dropoffSlots || DROPOFF_SLOTS.map((s: typeof DROPOFF_SLOTS[number]) => ({
                                  slot: s.value, label: s.label, booked: 0, available: 2, isFull: false,
                                }))).map((slot: { slot: string; label: string; available: number; isFull: boolean }) => (
                                  <button
                                    key={slot.slot}
                                    type="button"
                                    onClick={() => !slot.isFull && setSelectedDropoffSlot(slot.slot)}
                                    disabled={slot.isFull || isProcessing}
                                    className={`relative rounded-xl border-2 px-4 py-3 text-left transition-all ${
                                      slot.isFull
                                        ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-50'
                                        : selectedDropoffSlot === slot.slot
                                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                                          : 'border-slate-200 bg-white hover:border-emerald-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <span className="font-medium text-slate-900">{slot.label}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {slot.isFull ? (
                                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">Full</span>
                                        ) : (
                                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                            {slot.available} left
                                          </span>
                                        )}
                                        {selectedDropoffSlot === slot.slot && (
                                          <Check className="h-5 w-5 text-emerald-600" />
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-slate-400">Afternoon drop-off slots</p>
                          </div>

                          {/* Address with Autocomplete */}
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Pick-up address *</label>
                            <AddressAutocomplete
                              value={pickupAddress}
                              onChange={handlePickupAddressChange}
                              onSelect={handleAddressSelect}
                              placeholder="Start typing your address..."
                              disabled={isProcessing}
                              biasToNewcastle={true}
                            />
                          </div>

                          {/* Vehicle Details Section */}
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-center gap-2 mb-1">
                              <Car className="h-5 w-5 text-emerald-600" />
                              <h3 className="text-sm font-semibold text-slate-900">Vehicle Details</h3>
                            </div>
                            <p className="mb-4 text-xs text-slate-500">Help our drivers identify your vehicle easily</p>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Registration Number *</label>
                                <input
                                  type="text"
                                  placeholder="ABC123"
                                  maxLength={6}
                                  value={regoPlate}
                                  onChange={(e) => setRegoPlate(e.target.value.toUpperCase().slice(0, 6))}
                                  disabled={isProcessing}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base uppercase tracking-wider text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">State *</label>
                                <select
                                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                                  value={regoState}
                                  onChange={(e) => setRegoState(e.target.value as StateCode)}
                                  disabled={isProcessing}
                                >
                                  <option value="NSW">NSW</option>
                                  <option value="QLD">QLD</option>
                                  <option value="VIC">VIC</option>
                                  <option value="SA">SA</option>
                                  <option value="WA">WA</option>
                                  <option value="TAS">TAS</option>
                                  <option value="NT">NT</option>
                                  <option value="ACT">ACT</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Year *</label>
                                <input
                                  type="text"
                                  placeholder="2020"
                                  maxLength={4}
                                  value={vehicleYear}
                                  onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                  disabled={isProcessing}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Make & Model *</label>
                                <input
                                  type="text"
                                  placeholder="Toyota Camry"
                                  value={vehicleModel}
                                  onChange={(e) => setVehicleModel(e.target.value)}
                                  disabled={isProcessing}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                                />
                              </div>
                            </div>

                            <div className="mt-5 flex justify-center">
                              <RegistrationPlate plate={regoPlate} state={regoState} />
                            </div>

                            {/* Vehicle Color */}
                            <div className="mt-5 space-y-1.5">
                              <label className="text-xs font-medium text-slate-600">Color *</label>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {VEHICLE_COLORS.map((color) => (
                                  <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setVehicleColor(color.value)}
                                    disabled={isProcessing}
                                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                                      vehicleColor === color.value
                                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                                        : 'border-slate-200 bg-white hover:border-emerald-300'
                                    } disabled:opacity-50`}
                                  >
                                    <div
                                      className="h-5 w-5 rounded-full border-2 border-slate-300 flex-shrink-0"
                                      style={{ backgroundColor: color.hex }}
                                    />
                                    <span className="text-sm font-medium text-slate-900">{color.label}</span>
                                    {vehicleColor === color.value && (
                                      <Check className="ml-auto h-4 w-4 text-emerald-600 flex-shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </div>
                              {vehicleColor === 'other' && (
                                <input
                                  type="text"
                                  value={customColor}
                                  onChange={(e) => setCustomColor(e.target.value)}
                                  placeholder="Enter custom color"
                                  disabled={isProcessing}
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                                />
                              )}
                            </div>

                            {/* Transmission Type */}
                            <div className="mt-5 space-y-1.5">
                              <label className="text-xs font-medium text-slate-600">Transmission Type *</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="transmission"
                                    value="automatic"
                                    checked={transmissionType === 'automatic'}
                                    onChange={() => setTransmissionType('automatic')}
                                    disabled={isProcessing}
                                    className="h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span className="text-sm text-slate-700">Automatic</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="transmission"
                                    value="manual"
                                    checked={transmissionType === 'manual'}
                                    onChange={() => setTransmissionType('manual')}
                                    disabled={isProcessing}
                                    className="h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span className="text-sm text-slate-700">Manual</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Service Selection Section - HIDDEN IN PHASE 1 */}
                          {FEATURES.SERVICE_SELECTION && (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                              <ServiceSelector
                                selectedServices={selectedServices}
                                onServicesChange={setSelectedServices}
                                primaryCategory={primaryServiceCategory}
                                onPrimaryCategoryChange={setPrimaryServiceCategory}
                                serviceNotes={serviceNotes}
                                onServiceNotesChange={setServiceNotes}
                                disabled={isProcessing}
                              />
                            </div>
                          )}

                          {/* Garage Booking Section */}
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h3 className="mb-4 text-sm font-semibold text-slate-900">Your Existing Garage Booking</h3>
                            <p className="mb-4 text-xs text-slate-600">
                              Provide details of the booking you&apos;ve already made with your garage. We&apos;ll coordinate the pickup and drop-off.
                            </p>

                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Garage / Mechanic *</label>
                                <GarageAutocomplete
                                  value={garageSearch}
                                  onChange={handleGarageSearchChange}
                                  onSelect={handleGarageSelect}
                                  placeholder="Search for your garage (e.g. Ultra Tune Jesmond)"
                                  disabled={isProcessing}
                                  biasToNewcastle={true}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Your Booking Time at Garage *</label>
                                <select
                                  value={garageBookingTime}
                                  onChange={(e) => setGarageBookingTime(e.target.value)}
                                  disabled={isProcessing}
                                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                                >
                                  {garageBookingTimeOptions.map((time) => (
                                    <option key={`garage-${time.value}`} value={time.value}>
                                      {time.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Additional Notes</label>
                                <textarea
                                  placeholder="Any special instructions for us..."
                                  value={additionalNotes}
                                  onChange={(e) => setAdditionalNotes(e.target.value)}
                                  disabled={isProcessing}
                                  rows={2}
                                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                                />
                              </div>
                            </div>
                          </div>

                          {/* ═══════ DISTANCE ZONE MAP & INFO ═══════ */}
                          {distanceZoneInfo && selectedPlaceDetails?.lat != null && garageLat != null && garageLng != null && (
                            <div
                              className={`rounded-2xl border-2 p-5 space-y-4 ${
                                distanceZoneInfo.zone === 'green'
                                  ? 'border-emerald-300 bg-emerald-50/50'
                                  : distanceZoneInfo.zone === 'yellow'
                                  ? 'border-yellow-300 bg-yellow-50/50'
                                  : distanceZoneInfo.zone === 'orange'
                                  ? 'border-orange-300 bg-orange-50/50'
                                  : 'border-red-300 bg-red-50/50'
                              }`}
                            >
                              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <MapPin className="h-4 w-4" />
                                Distance &amp; Pricing Zone
                              </h3>

                              {/* Map */}
                              <DistanceZoneMap
                                pickupLat={selectedPlaceDetails.lat!}
                                pickupLng={selectedPlaceDetails.lng!}
                                garageLat={garageLat}
                                garageLng={garageLng}
                                zone={distanceZoneInfo.zone}
                              />

                              {/* Zone result */}
                              <div className="flex flex-wrap items-center gap-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                                    ZONE_BADGE_STYLES[distanceZoneInfo.zone]
                                  }`}
                                >
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full ${
                                      distanceZoneInfo.zone === 'green'
                                        ? 'bg-emerald-500'
                                        : distanceZoneInfo.zone === 'yellow'
                                        ? 'bg-yellow-500'
                                        : distanceZoneInfo.zone === 'orange'
                                        ? 'bg-orange-500'
                                        : 'bg-red-500'
                                    }`}
                                  />
                                  {distanceZoneInfo.label}
                                </span>
                                <span className="text-sm font-medium text-slate-700">
                                  {distanceZoneInfo.distance} km
                                </span>
                                {distanceZoneInfo.zone !== 'red' && distanceZoneInfo.surchargeAmount > 0 && (
                                  <span className="text-sm font-semibold text-slate-800">
                                    {distanceZoneInfo.surchargeDisplay} surcharge
                                  </span>
                                )}
                                {distanceZoneInfo.zone === 'green' && (
                                  <span className="text-sm font-medium text-emerald-700">No extra fee</span>
                                )}
                              </div>

                              {/* Red zone warning */}
                              {isRedZone && (
                                <div className="rounded-xl border border-red-300 bg-red-100 p-4">
                                  <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-semibold text-red-800">
                                        Out of service range
                                      </p>
                                      <p className="mt-1 text-sm text-red-700">
                                        Your pickup address is over 18 km from the selected garage. Online booking isn&apos;t
                                        available for this distance. Please choose a closer garage, or{' '}
                                        <Link href="/contact" className="font-semibold underline hover:text-red-900">
                                          contact our team
                                        </Link>{' '}
                                        to arrange a custom quote.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Zone legend */}
                              <div className="rounded-xl bg-white/70 border border-slate-200 p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Zone Guide</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                    <span className="text-slate-600">0–12 km: No extra fee</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                                    <span className="text-slate-600">12–15 km: +$29</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                                    <span className="text-slate-600">15–18 km: +$49</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                                    <span className="text-slate-600">18 km+: Contact us</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Hint when coords are missing (user typed instead of selecting) */}
                          {!distanceZoneInfo && pickupAddress.trim() && garageSearch.trim() && (
                            <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 p-3">
                              <Info className="h-4 w-4 flex-shrink-0 text-blue-500 mt-0.5" />
                              <p className="text-xs text-blue-700">
                                Select your pickup address and garage from the dropdown suggestions to see the distance zone map and any applicable surcharges.
                              </p>
                            </div>
                          )}
                        </div>
                        {/* End of greyed-out wrapper */}

                        {/* Submit */}
                        <button
                          type="submit"
                          disabled={isProcessing || isHighValueVehicle || isRedZone}
                          className="w-full rounded-full bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="inline-flex items-center gap-2">
                            Continue to Review — {totalPriceDisplay}
                            <ArrowRight className="h-5 w-5" />
                          </span>
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
