// src/app/booking/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle2, Loader2, AlertCircle, CreditCard, ArrowLeft, ArrowRight,
  MapPin, Clock, Car, Building, User, Mail, Phone, Copy, Calendar, Check,
  Zap, Wrench, Settings, Info, ShieldCheck, Lock, Sparkles,
} from 'lucide-react';
import RegistrationPlate, { StateCode } from '@/components/homepage/RegistrationPlate';
import AddressAutocomplete, { PlaceDetails } from '@/components/AddressAutocomplete';
import GarageAutocomplete, { GarageDetails } from '@/components/GarageAutocomplete';
import ServiceSelector from '@/components/booking/ServiceSelector';
import DistanceZoneMap from '@/components/booking/DistanceZoneMap';
import {
  SERVICE_CATEGORIES, SelectedServiceCategory, getTotalSelectedCount, getCategoryById,
} from '@/constants/serviceCategories';
import { FEATURES, TRANSPORT_PRICE_DISPLAY, TRANSPORT_PRICE } from '@/lib/featureFlags';
import { calculateDistance, getDistanceZone, ZoneInfo } from '@/lib/distanceZones';
import {
  PICKUP_SLOTS, DROPOFF_SLOTS, SERVICE_TYPES,
  getPickupSlotLabel, getDropoffSlotLabel, getServiceTypeByValue,
} from '@/config/timeSlots';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '@/components/StripePaymentForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ── Types ──────────────────────────────────────────────────────────────
type Step = 'details' | 'vehicle' | 'schedule' | 'review' | 'payment' | 'success';

interface TimeOption { value: string; label: string; minutes: number; }

// ── Helpers ────────────────────────────────────────────────────────────
function generateTimeOptions(startHour: number, endHour: number): TimeOption[] {
  const options: TimeOption[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === endHour && minute > 0) continue;
      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'am' : 'pm';
      const label = `${displayHour}:${minute.toString().padStart(2, '0')}${ampm}`;
      options.push({ value, label, minutes: hour * 60 + minute });
    }
  }
  return options;
}

const garageBookingTimeOptions = generateTimeOptions(7, 17);

const ZONE_BADGE_STYLES: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
  red: 'bg-red-100 text-red-800 border-red-300',
};

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'details', label: 'Details', icon: User },
  { key: 'vehicle', label: 'Vehicle', icon: Car },
  { key: 'schedule', label: 'Schedule', icon: Calendar },
  { key: 'review', label: 'Review', icon: CheckCircle2 },
  { key: 'payment', label: 'Pay', icon: CreditCard },
];

const getServiceIcon = (value: string) => {
  switch (value) {
    case 'quick_service': return Zap;
    case 'regular_service': return Wrench;
    case 'major_service': return Settings;
    default: return Wrench;
  }
};

// SVG pattern used on all dark backgrounds
const BG_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

// ════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════
export default function BookingPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // ── State ───────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<Step>('details');

  // Customer
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Vehicle
  const [regoPlate, setRegoPlate] = useState('');
  const [regoState, setRegoState] = useState<StateCode>('NSW');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [isHighValueVehicle, setIsHighValueVehicle] = useState(false);
  const [transmissionType, setTransmissionType] = useState<'automatic' | 'manual'>('automatic');

  // Pickup
  const [pickupAddress, setPickupAddress] = useState('');
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<PlaceDetails | null>(null);

  // Garage
  const [garageSearch, setGarageSearch] = useState('');
  const [garageAddress, setGarageAddress] = useState('');
  const [garagePlaceId, setGaragePlaceId] = useState('');
  const [garageLat, setGarageLat] = useState<number | null>(null);
  const [garageLng, setGarageLng] = useState<number | null>(null);
  const [garageBookingTime, setGarageBookingTime] = useState('09:00');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Schedule
  const [serviceDate, setServiceDate] = useState('');
  const [selectedPickupSlot, setSelectedPickupSlot] = useState('');
  const [selectedDropoffSlot, setSelectedDropoffSlot] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('regular_service');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [slotAvailability, setSlotAvailability] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Services (Phase 2)
  const [selectedServices, setSelectedServices] = useState<SelectedServiceCategory[]>([]);
  const [primaryServiceCategory, setPrimaryServiceCategory] = useState<string | null>(null);
  const [serviceNotes, setServiceNotes] = useState('');

  // Payment
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  const isAuthenticated = authStatus === 'authenticated' && session?.user;

  // ── Derived ─────────────────────────────────────────────────────────
  const distanceZoneInfo: ZoneInfo | null = useMemo(() => {
    if (
      selectedPlaceDetails?.lat != null && selectedPlaceDetails?.lng != null &&
      garageLat != null && garageLng != null
    ) {
      const km = calculateDistance(selectedPlaceDetails.lat, selectedPlaceDetails.lng, garageLat, garageLng);
      return getDistanceZone(km);
    }
    return null;
  }, [selectedPlaceDetails, garageLat, garageLng]);

  const totalPriceCents = TRANSPORT_PRICE + (distanceZoneInfo?.surchargeAmount ?? 0);
  const totalPriceDisplay = `$${(totalPriceCents / 100).toFixed(2)}`;
  const isRedZone = distanceZoneInfo?.zone === 'red';

  const customerName = isAuthenticated ? (session?.user?.username || '') : guestName;
  const customerEmail = isAuthenticated ? (session?.user?.email || '') : guestEmail;
  const customerPhone = guestPhone;

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);
  const trackingUrl = trackingCode ? `/track?code=${encodeURIComponent(trackingCode)}` : '/track';

  // ── Effects ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/account/profile')
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.mobile && !guestPhone) setGuestPhone(data.mobile); })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (serviceDate) {
      setLoadingSlots(true);
      fetch(`/api/bookings/slot-availability?date=${serviceDate}`)
        .then(res => res.json())
        .then(data => {
          setSlotAvailability(data);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (selectedPickupSlot && data.pickupSlots) { const p = data.pickupSlots.find((s: any) => s.slot === selectedPickupSlot); if (p?.isFull) setSelectedPickupSlot(''); }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (selectedDropoffSlot && data.dropoffSlots) { const d = data.dropoffSlots.find((s: any) => s.slot === selectedDropoffSlot); if (d?.isFull) setSelectedDropoffSlot(''); }
        })
        .catch(() => {})
        .finally(() => setLoadingSlots(false));
    } else { setSlotAvailability(null); }
  }, [serviceDate]);

  // ── Helpers ─────────────────────────────────────────────────────────
  const getMinDate = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };
  const getMaxDate = () => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString().split('T')[0]; };
  const formatDateDisplay = (s: string) => {
    if (!s) return '';
    return new Date(s).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };
  const getTimeLabel = (value: string, options: TimeOption[]): string => options.find(t => t.value === value)?.label || value;

  const goToStep = useCallback((step: Step) => {
    setSubmitError(null);
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Field handlers ──────────────────────────────────────────────────
  const handleAddressSelect = (details: PlaceDetails) => setSelectedPlaceDetails(details);
  const handlePickupAddressChange = (value: string) => { setPickupAddress(value); setSelectedPlaceDetails(null); };
  const handleGarageSelect = (details: GarageDetails) => {
    setGarageAddress(details.formattedAddress);
    setGaragePlaceId(details.placeId || '');
    setGarageLat(details.lat ?? null);
    setGarageLng(details.lng ?? null);
  };
  const handleGarageSearchChange = (value: string) => { setGarageSearch(value); setGarageLat(null); setGarageLng(null); };

  // ── Validation ──────────────────────────────────────────────────────
  const validateDetails = (): string | null => {
    if (!isAuthenticated) {
      if (!guestName.trim()) return 'Please enter your full name.';
      if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) return 'Please enter a valid email address.';
      if (!guestPhone.trim()) return 'Please enter your phone number.';
    }
    if (!pickupAddress.trim()) return 'Please enter your pick-up address.';
    if (!garageSearch.trim()) return 'Please search and select your garage.';
    if (!garageBookingTime) return 'Please select your garage booking time.';
    return null;
  };

  const validateVehicle = (): string | null => {
    if (isHighValueVehicle) return 'Vehicles valued at $100,000+ cannot be booked online at this time.';
    if (!regoPlate.trim()) return 'Please enter your registration number.';
    if (!vehicleYear.trim() || !/^\d{4}$/.test(vehicleYear)) return 'Please enter a valid 4-digit year.';
    const year = parseInt(vehicleYear);
    if (year < 1900 || year > new Date().getFullYear() + 1) return `Year must be between 1900 and ${new Date().getFullYear() + 1}.`;
    if (!vehicleModel.trim() || vehicleModel.trim().length < 3) return 'Please enter your vehicle make and model (min 3 chars).';
    if (isRedZone) return 'Your pickup is too far from the garage (over 18 km). Please choose a closer garage.';
    return null;
  };

  const validateSchedule = (): string | null => {
    if (!serviceDate) return 'Please select a service date.';
    const d = new Date(serviceDate); const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d < today) return 'Date cannot be in the past.';
    if (!selectedPickupSlot) return 'Please select a pickup slot.';
    if (!selectedDropoffSlot) return 'Please select a drop-off slot.';
    if (!selectedServiceType) return 'Please select a service type.';
    if (FEATURES.SERVICE_SELECTION && getTotalSelectedCount(selectedServices) === 0) return 'Please select at least one service.';
    return null;
  };

  const handleContinue = () => {
    let err: string | null = null;
    if (currentStep === 'details') { err = validateDetails(); if (!err) goToStep('vehicle'); }
    else if (currentStep === 'vehicle') { err = validateVehicle(); if (!err) goToStep('schedule'); }
    else if (currentStep === 'schedule') { err = validateSchedule(); if (!err) goToStep('review'); }
    if (err) setSubmitError(err);
  };

  // ── Payment ─────────────────────────────────────────────────────────
  const handleProceedToPayment = async () => {
    setIsProcessing(true);
    setSubmitError(null);
    try {
      const serviceTypeInfo = getServiceTypeByValue(selectedServiceType);
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName, customerEmail, customerPhone,
          pickupAddress: pickupAddress.trim(),
          serviceType: selectedServiceType,
          serviceDate: new Date(serviceDate).toISOString(),
          vehicleRegistration: regoPlate.trim().toUpperCase(),
          vehicleState: regoState, vehicleYear, vehicleModel: vehicleModel.trim(),
          pickupTimeSlot: selectedPickupSlot, dropoffTimeSlot: selectedDropoffSlot,
          earliestPickup: getPickupSlotLabel(selectedPickupSlot),
          latestDropoff: getDropoffSlotLabel(selectedDropoffSlot),
          estimatedServiceDuration: serviceTypeInfo?.estimatedHours || 4,
          hasExistingBooking: true,
          garageName: garageSearch.trim(), garageAddress: garageAddress.trim(),
          garagePlaceId,
          garageBookingTime: getTimeLabel(garageBookingTime, garageBookingTimeOptions),
          additionalNotes: additionalNotes.trim(),
          transmissionType, isManualTransmission: transmissionType === 'manual',
          selectedServices: JSON.stringify(selectedServices),
          primaryServiceCategory, serviceNotes: serviceNotes.trim(),
          distanceZone: distanceZoneInfo?.zone || 'green',
          distanceSurcharge: distanceZoneInfo?.surchargeAmount ?? 0,
          distanceKm: distanceZoneInfo?.distance ?? 0,
          pickupLat: selectedPlaceDetails?.lat ?? 0, pickupLng: selectedPlaceDetails?.lng ?? 0,
          garageLat: garageLat ?? 0, garageLng: garageLng ?? 0,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to initialize payment');
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      goToStep('payment');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally { setIsProcessing(false); }
  };

  const handlePaymentSuccess = async () => {
    if (paymentIntentId) {
      try {
        const response = await fetch('/api/bookings/create-after-payment', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId }),
        });
        const data = await response.json();
        if (response.ok && data.trackingCode) setTrackingCode(data.trackingCode);
      } catch { /* silent */ }
    }
    goToStep('success');
  };

  const handlePaymentError = (error: string) => setSubmitError(error);

  // ── Loading state ───────────────────────────────────────────────────
  if (authStatus === 'loading') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </main>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 relative">
      {/* Pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="h-full w-full" style={{ backgroundImage: BG_PATTERN }} />
      </div>

      {/* ─── HEADER (exact match to login page) ─── */}
      <header className="sticky top-0 z-50">
        <div className="relative mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo — identical to login */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-12 w-40 sm:h-14 sm:w-48">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain brightness-0 invert"
                priority
              />
            </div>
          </Link>

          {/* Booking steps — centered */}
          {currentStep !== 'success' && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center">
              {STEPS.map((step, index) => {
                const isActive = currentStep === step.key;
                const isComplete = stepIndex > index;
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className="flex items-center">
                    {index > 0 && (
                      <div className="w-8 sm:w-14 h-0.5 rounded-full bg-white/15 overflow-hidden mx-1">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-500 ease-out"
                          style={{ width: isComplete || isActive ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                    <div className="flex flex-col items-center">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                        isActive
                          ? 'bg-white text-emerald-700 shadow-lg shadow-emerald-500/20'
                          : isComplete
                            ? 'bg-emerald-400 text-white'
                            : 'bg-white/10 text-white/30'
                      }`}>
                        {isComplete ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                      </div>
                      <span className={`mt-1 text-[10px] font-medium leading-none transition-colors duration-300 ${
                        isActive ? 'text-white' : isComplete ? 'text-emerald-300' : 'text-white/25'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </header>

      <div className="relative z-10">
        {/* ─── PAGE CONTENT ─── */}
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10 pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </main>
  );

  // ════════════════════════════════════════════════════════════════════
  // STEP RENDERER
  // ════════════════════════════════════════════════════════════════════
  function renderStep() {
    switch (currentStep) {
      case 'details': return renderDetails();
      case 'vehicle': return renderVehicle();
      case 'schedule': return renderSchedule();
      case 'review': return renderReview();
      case 'payment': return renderPayment();
      case 'success': return renderSuccess();
      default: return null;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 1: DETAILS
  // ════════════════════════════════════════════════════════════════════
  function renderDetails() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Book a Pick-up</h1>
          <p className="mt-2 text-emerald-100 text-sm sm:text-base">
            We&apos;ll collect your car, take it to the garage, and bring it back
          </p>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm shadow-2xl p-6 sm:p-8 space-y-6">
          {renderErrorBanner()}

          {/* Guest / Auth */}
          {!isAuthenticated ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Your Details</h3>
              <div className="space-y-3">
                <FieldInput label="Full Name *" value={guestName} onChange={setGuestName} placeholder="John Smith" />
                <FieldInput label="Email *" type="email" value={guestEmail} onChange={setGuestEmail} placeholder="john@example.com" icon={<Mail className="h-5 w-5 text-slate-400" />} />
                <FieldInput label="Phone *" type="tel" value={guestPhone} onChange={setGuestPhone} placeholder="0412 345 678" icon={<Phone className="h-5 w-5 text-slate-400" />} />
              </div>
              <p className="text-xs text-slate-500">
                Have an account?{' '}
                <Link href="/login" className="font-medium text-emerald-600 hover:underline">Sign in</Link>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
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
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="0412 345 678"
                  className="mt-1 w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Pickup address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Pick-up Address *
            </label>
            <AddressAutocomplete
              value={pickupAddress}
              onChange={handlePickupAddressChange}
              onSelect={handleAddressSelect}
              placeholder="Where should we collect your car?"
              disabled={isProcessing}
              biasToNewcastle={true}
            />
          </div>

          {/* Garage */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Your Garage / Mechanic *
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Search for the garage where you&apos;ve already booked your service
              </p>
              <GarageAutocomplete
                value={garageSearch}
                onChange={handleGarageSearchChange}
                onSelect={handleGarageSelect}
                placeholder="e.g. Ultra Tune Jesmond"
                disabled={isProcessing}
                biasToNewcastle={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Your Booking Time at Garage *
              </label>
              <select
                value={garageBookingTime}
                onChange={(e) => setGarageBookingTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              >
                {garageBookingTimeOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Additional Notes
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={2}
                placeholder="Any special instructions for our driver..."
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
            >
              Continue <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
  // ════════════════════════════════════════════════════════════════════
  function renderVehicle() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Vehicle Details</h1>
          <p className="mt-2 text-emerald-100 text-sm sm:text-base">Help our drivers identify your car</p>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm shadow-2xl p-6 sm:p-8 space-y-6">
          {renderErrorBanner()}

          {/* High-value vehicle */}
          <div className={`rounded-xl border p-4 transition-colors ${isHighValueVehicle ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isHighValueVehicle}
                onChange={(e) => setIsHighValueVehicle(e.target.checked)}
                className={`mt-1 h-5 w-5 rounded border-2 cursor-pointer ${isHighValueVehicle ? 'border-red-500 accent-red-500' : 'border-slate-300 accent-emerald-600'}`}
              />
              <div>
                <span className={`text-sm font-medium ${isHighValueVehicle ? 'text-red-700' : 'text-slate-700'}`}>
                  My vehicle is valued at $100,000 or more
                </span>
                {isHighValueVehicle && (
                  <p className="mt-2 text-sm text-red-600">
                    For insurance reasons, we currently cannot service vehicles valued at $100,000+. We&apos;re working to expand coverage.
                  </p>
                )}
              </div>
            </label>
          </div>

          <div className={`space-y-6 transition-opacity ${isHighValueVehicle ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Registration *</label>
                <input type="text" placeholder="ABC123" maxLength={6} value={regoPlate} onChange={(e) => setRegoPlate(e.target.value.toUpperCase().slice(0, 6))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base uppercase tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">State *</label>
                <select value={regoState} onChange={(e) => setRegoState(e.target.value as StateCode)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition">
                  {(['NSW','QLD','VIC','SA','WA','TAS','NT','ACT'] as StateCode[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Year *</label>
                <input type="text" placeholder="2020" maxLength={4} value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Make & Model *</label>
                <input type="text" placeholder="Toyota Camry" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
              </div>
            </div>

            {/* Live rego plate preview */}
            {regoPlate && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center"
              >
                <RegistrationPlate plate={regoPlate} state={regoState} />
              </motion.div>
            )}

            {/* Transmission */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Transmission *</label>
              <div className="grid grid-cols-2 gap-3">
                {(['automatic', 'manual'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTransmissionType(t)}
                    className={`rounded-xl border-2 px-4 py-3 text-sm font-medium text-center transition-all ${
                      transmissionType === t
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {t === 'automatic' ? 'Automatic' : 'Manual'}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance zone */}
            {distanceZoneInfo && selectedPlaceDetails?.lat != null && garageLat != null && garageLng != null && (
              <div className={`rounded-xl border-2 p-4 space-y-3 ${
                distanceZoneInfo.zone === 'green' ? 'border-emerald-300 bg-emerald-50/50'
                : distanceZoneInfo.zone === 'yellow' ? 'border-yellow-300 bg-yellow-50/50'
                : distanceZoneInfo.zone === 'orange' ? 'border-orange-300 bg-orange-50/50'
                : 'border-red-300 bg-red-50/50'
              }`}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MapPin className="h-4 w-4" /> Distance Zone
                </h3>
                <DistanceZoneMap
                  pickupLat={selectedPlaceDetails.lat!}
                  pickupLng={selectedPlaceDetails.lng!}
                  garageLat={garageLat}
                  garageLng={garageLng}
                  zone={distanceZoneInfo.zone}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${ZONE_BADGE_STYLES[distanceZoneInfo.zone]}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      distanceZoneInfo.zone === 'green' ? 'bg-emerald-500'
                      : distanceZoneInfo.zone === 'yellow' ? 'bg-yellow-500'
                      : distanceZoneInfo.zone === 'orange' ? 'bg-orange-500'
                      : 'bg-red-500'
                    }`} />
                    {distanceZoneInfo.label}
                  </span>
                  <span className="text-sm text-slate-600">{distanceZoneInfo.distance} km</span>
                  {distanceZoneInfo.surchargeAmount > 0 && distanceZoneInfo.zone !== 'red' && (
                    <span className="text-sm font-semibold text-slate-800">{distanceZoneInfo.surchargeDisplay} surcharge</span>
                  )}
                  {distanceZoneInfo.zone === 'green' && <span className="text-sm font-medium text-emerald-700">No extra fee</span>}
                </div>
                {isRedZone && (
                  <div className="rounded-xl border border-red-300 bg-red-100 p-3">
                    <p className="text-sm text-red-700">
                      <span className="font-semibold">Out of range.</span> Please choose a closer garage or{' '}
                      <Link href="/contact" className="font-semibold underline">contact us</Link>.
                    </p>
                  </div>
                )}
                {/* Zone legend */}
                <div className="rounded-lg bg-white/70 border border-slate-200 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Zone Guide</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-slate-600">0–12 km: No extra fee</span></div>
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-yellow-500" /><span className="text-slate-600">12–15 km: +$29</span></div>
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500" /><span className="text-slate-600">15–18 km: +$49</span></div>
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-slate-600">18 km+: Contact us</span></div>
                  </div>
                </div>
              </div>
            )}

            {!distanceZoneInfo && pickupAddress.trim() && garageSearch.trim() && (
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 p-3">
                <Info className="h-4 w-4 flex-shrink-0 text-blue-500 mt-0.5" />
                <p className="text-xs text-blue-700">Select your addresses from the dropdown suggestions to see the distance zone.</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => goToStep('details')}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={isHighValueVehicle || isRedZone}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 3: SCHEDULE
  // ════════════════════════════════════════════════════════════════════
  function renderSchedule() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Schedule & Service</h1>
          <p className="mt-2 text-emerald-100 text-sm sm:text-base">Choose your date, time slots, and service type</p>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm shadow-2xl p-6 sm:p-8 space-y-6">
          {renderErrorBanner()}

          {/* Service type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Service Type *</label>
            <div className="grid gap-3">
              {SERVICE_TYPES.map((svc) => {
                const SvcIcon = getServiceIcon(svc.value);
                return (
                  <button
                    key={svc.value}
                    type="button"
                    onClick={() => setSelectedServiceType(svc.value)}
                    className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                      selectedServiceType === svc.value
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <SvcIcon className={`h-5 w-5 mt-0.5 ${selectedServiceType === svc.value ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-900">{svc.label}</h4>
                          <span className="text-sm text-slate-500">~{svc.estimatedHours}hrs</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{svc.description}</p>
                      </div>
                      {selectedServiceType === svc.value && <Check className="h-5 w-5 text-emerald-600 mt-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" /> Service Date *
              </span>
            </label>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              min={getMinDate()}
              max={getMaxDate()}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
            <p className="mt-1 text-xs text-slate-400">Tomorrow through 90 days from now</p>
          </div>

          {/* Slots */}
          <SlotPicker label="Pickup Slot *" slots={slotAvailability?.pickupSlots || PICKUP_SLOTS.map((s: typeof PICKUP_SLOTS[number]) => ({ slot: s.value, label: s.label, booked: 0, available: 2, isFull: false }))} selected={selectedPickupSlot} onSelect={setSelectedPickupSlot} />
          <SlotPicker label="Drop-off Slot *" slots={slotAvailability?.dropoffSlots || DROPOFF_SLOTS.map((s: typeof DROPOFF_SLOTS[number]) => ({ slot: s.value, label: s.label, booked: 0, available: 2, isFull: false }))} selected={selectedDropoffSlot} onSelect={setSelectedDropoffSlot} />

          {/* Service selection (Phase 2) */}
          {FEATURES.SERVICE_SELECTION && (
            <ServiceSelector
              selectedServices={selectedServices}
              onServicesChange={setSelectedServices}
              primaryCategory={primaryServiceCategory}
              onPrimaryCategoryChange={setPrimaryServiceCategory}
              serviceNotes={serviceNotes}
              onServiceNotesChange={setServiceNotes}
              disabled={isProcessing}
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => goToStep('vehicle')}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
            >
              Continue <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );

    function SlotPicker({ label, slots, selected, onSelect }: { label: string; slots: { slot: string; label: string; available: number; isFull: boolean }[]; selected: string; onSelect: (v: string) => void }) {
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">{label}</label>
          {!serviceDate ? (
            <p className="text-sm text-slate-400 py-3">Select a date first</p>
          ) : loadingSlots ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
          ) : (
            <div className="grid gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.slot}
                  type="button"
                  onClick={() => !slot.isFull && onSelect(slot.slot)}
                  disabled={slot.isFull}
                  className={`rounded-xl border-2 px-4 py-3 text-left transition-all ${
                    slot.isFull ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                    : selected === slot.slot ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{slot.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {slot.isFull
                        ? <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">Full</span>
                        : <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">{slot.available} left</span>
                      }
                      {selected === slot.slot && <Check className="h-5 w-5 text-emerald-600" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 4: REVIEW
  // ════════════════════════════════════════════════════════════════════
  function renderReview() {
    const svcInfo = getServiceTypeByValue(selectedServiceType);
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Review Your Booking</h1>
          <p className="mt-2 text-emerald-100 text-sm sm:text-base">Confirm everything looks right</p>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm shadow-2xl p-6 sm:p-8 space-y-4">
          {renderErrorBanner()}

          {/* Customer */}
          <ReviewCard icon={<User className="h-4 w-4 text-emerald-600" />} title="Customer" editStep="details">
            <p className="font-medium text-slate-900">{customerName}</p>
            <p className="text-slate-600">{customerEmail}</p>
            {customerPhone && <p className="text-slate-600">{customerPhone}</p>}
          </ReviewCard>

          {/* Vehicle */}
          <ReviewCard icon={<Car className="h-4 w-4 text-emerald-600" />} title="Vehicle" editStep="vehicle">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">{vehicleYear} {vehicleModel}</span>
              <div className="transform scale-75 origin-right">
                <RegistrationPlate plate={regoPlate} state={regoState} />
              </div>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2">
              <span className="text-slate-500">Transmission</span>
              <span className={`font-medium ${transmissionType === 'manual' ? 'text-amber-600' : 'text-slate-900'}`}>
                {transmissionType === 'manual' ? 'Manual' : 'Automatic'}
              </span>
            </div>
          </ReviewCard>

          {/* Schedule */}
          <ReviewCard icon={<Calendar className="h-4 w-4 text-emerald-600" />} title="Schedule" editStep="schedule">
            <p className="font-medium text-slate-900">{formatDateDisplay(serviceDate)}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div><span className="text-slate-500 text-xs">Pickup</span><p className="font-medium text-slate-900">{getPickupSlotLabel(selectedPickupSlot)}</p></div>
              <div><span className="text-slate-500 text-xs">Drop-off</span><p className="font-medium text-slate-900">{getDropoffSlotLabel(selectedDropoffSlot)}</p></div>
            </div>
            <div className="mt-2 border-t border-slate-200 pt-2">
              <span className="text-slate-500 text-xs">Service type</span>
              <p className="font-medium text-slate-900">{svcInfo?.label} (~{svcInfo?.estimatedHours}hrs)</p>
            </div>
          </ReviewCard>

          {/* Locations */}
          <ReviewCard icon={<MapPin className="h-4 w-4 text-emerald-600" />} title="Locations" editStep="details">
            <div className="space-y-3">
              <div>
                <span className="text-slate-500 text-xs">Pickup</span>
                <p className="text-slate-900">{pickupAddress}</p>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <span className="text-slate-500 text-xs">Garage</span>
                <p className="font-medium text-slate-900">{garageSearch}</p>
                {garageAddress && <p className="text-xs text-slate-600 mt-0.5">{garageAddress}</p>}
                <p className="text-xs text-slate-600 mt-1">
                  Appointment: {getTimeLabel(garageBookingTime, garageBookingTimeOptions)}
                </p>
              </div>
            </div>
          </ReviewCard>

          {/* Distance zone */}
          {distanceZoneInfo && (
            <div className={`rounded-xl border p-4 ${
              distanceZoneInfo.zone === 'green' ? 'border-emerald-200 bg-emerald-50'
              : distanceZoneInfo.zone === 'yellow' ? 'border-yellow-200 bg-yellow-50'
              : 'border-orange-200 bg-orange-50'
            }`}>
              <div className="flex items-center gap-3 text-sm">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${ZONE_BADGE_STYLES[distanceZoneInfo.zone]}`}>
                  <span className={`h-2 w-2 rounded-full ${
                    distanceZoneInfo.zone === 'green' ? 'bg-emerald-500'
                    : distanceZoneInfo.zone === 'yellow' ? 'bg-yellow-500'
                    : 'bg-orange-500'
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

          {additionalNotes && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes</h3>
              <p className="text-sm text-slate-600">{additionalNotes}</p>
            </div>
          )}

          {/* Price breakdown */}
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
            <div className="space-y-2">
              {distanceZoneInfo && distanceZoneInfo.surchargeAmount > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-700">Transport fee</span>
                    <span className="font-medium text-emerald-700">{TRANSPORT_PRICE_DISPLAY}</span>
                  </div>
                  <div className="flex justify-between text-sm">
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

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => goToStep('schedule')}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {isProcessing ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Please wait...</>
              ) : (
                <><CreditCard className="h-5 w-5" /> Proceed to Payment — {totalPriceDisplay}</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 5: PAYMENT
  // ════════════════════════════════════════════════════════════════════
  function renderPayment() {
    if (!clientSecret) return null;
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Secure Payment</h1>
          <p className="mt-2 text-emerald-100 text-sm sm:text-base">Complete your booking</p>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm shadow-2xl p-6 sm:p-8">
          <button
            type="button"
            onClick={() => goToStep('review')}
            disabled={isProcessing}
            className="mb-5 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to review
          </button>

          {renderErrorBanner()}

          {/* Price reminder */}
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between">
            <span className="text-sm text-emerald-700">Amount due</span>
            <span className="text-lg font-bold text-emerald-700">{totalPriceDisplay} AUD</span>
          </div>

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
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 6: SUCCESS
  // ════════════════════════════════════════════════════════════════════
  function renderSuccess() {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm p-8 shadow-2xl text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </motion.div>

            <h2 className="mt-6 text-2xl font-bold text-slate-900">Booking Confirmed!</h2>
            <p className="mt-2 text-slate-600">We&apos;ve received your booking and payment.</p>

            <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-medium text-slate-900">{regoPlate.toUpperCase()} ({regoState})</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-medium text-slate-900">{formatDateDisplay(serviceDate)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Garage</span><span className="font-medium text-slate-900">{garageSearch}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Pickup</span><span className="font-medium text-slate-900">{getPickupSlotLabel(selectedPickupSlot)}</span></div>
              </div>
            </div>

            {trackingCode && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-sm text-emerald-700 mb-2 font-medium">Your Tracking Code</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-mono font-bold tracking-[0.3em] text-emerald-700">{trackingCode}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(trackingCode)}
                    className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-emerald-600 mt-2">Save this code to track your booking</p>
              </div>
            )}

            <p className="mt-4 text-sm text-slate-500">
              Confirmation sent to <span className="font-medium">{customerEmail}</span>
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href={trackingUrl}
                className="flex items-center justify-center gap-2 w-full rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
              >
                <MapPin className="h-4 w-4" /> Track Your Booking
              </Link>
              <Link
                href="/"
                className="block w-full rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 text-center"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // SHARED UI COMPONENTS
  // ════════════════════════════════════════════════════════════════════
  function renderErrorBanner() {
    if (!submitError) return null;
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
        <p className="text-sm text-red-800">{submitError}</p>
      </div>
    );
  }

  function ReviewCard({ icon, title, editStep, children }: { icon: React.ReactNode; title: string; editStep: Step; children: React.ReactNode }) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">{icon} {title}</h3>
          <button type="button" onClick={() => goToStep(editStep)} className="text-xs text-emerald-600 hover:underline font-medium">Edit</button>
        </div>
        <div className="text-sm space-y-1">{children}</div>
      </div>
    );
  }

}

// ════════════════════════════════════════════════════════════════════════
// STANDALONE COMPONENTS (outside main component to prevent remounts)
// ════════════════════════════════════════════════════════════════════════
function FieldInput({ label, value, onChange, placeholder, type = 'text', icon }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-slate-300 bg-white py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition ${icon ? 'pl-12 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  );
}