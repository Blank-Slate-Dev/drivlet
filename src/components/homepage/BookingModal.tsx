// src/components/homepage/BookingModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, AlertCircle, CreditCard, ArrowLeft } from 'lucide-react';
import RegistrationPlate, { StateCode } from './RegistrationPlate';
import AddressAutocomplete, { PlaceDetails } from '@/components/AddressAutocomplete';
import GarageAutocomplete, { GarageDetails } from '@/components/GarageAutocomplete';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '@/components/StripePaymentForm';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Price display
const PRICE_DISPLAY = '$119.00';

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

type Step = 'details' | 'payment' | 'success';

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const { data: session, status: authStatus } = useSession();

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>('details');

  // Form state
  const [regoPlate, setRegoPlate] = useState('');
  const [regoState, setRegoState] = useState<StateCode>('NSW');
  const [earliestPickup, setEarliestPickup] = useState('09:00');
  const [latestDropoff, setLatestDropoff] = useState('17:00');
  const [pickupAddress, setPickupAddress] = useState('');
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<PlaceDetails | null>(null);

  // Guest checkout fields
  const [isGuestCheckout, setIsGuestCheckout] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Garage booking details (mandatory)
  const [garageSearch, setGarageSearch] = useState('');
  const [garageAddress, setGarageAddress] = useState('');
  const [garageBookingTime, setGarageBookingTime] = useState('09:00');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Determine if user is authenticated
  const isAuthenticated = authStatus === 'authenticated' && session?.user;

  // Set guest checkout mode if not authenticated
  useEffect(() => {
    if (isOpen && authStatus === 'unauthenticated') {
      setIsGuestCheckout(true);
    }
  }, [isOpen, authStatus]);

  const selectedPickupMinutes = useMemo(() => {
    const selected = allPickupTimeOptions.find((t) => t.value === earliestPickup);
    return selected?.minutes ?? 0;
  }, [earliestPickup]);

  const selectedDropoffMinutes = useMemo(() => {
    const selected = allDropoffTimeOptions.find((t) => t.value === latestDropoff);
    return selected?.minutes ?? 0;
  }, [latestDropoff]);

  const availablePickupOptions = useMemo(() => {
    return allPickupTimeOptions.filter(
      (time) => time.minutes <= selectedDropoffMinutes - MIN_GAP_MINUTES
    );
  }, [selectedDropoffMinutes]);

  const availableDropoffOptions = useMemo(() => {
    return allDropoffTimeOptions.filter(
      (time) => time.minutes >= selectedPickupMinutes + MIN_GAP_MINUTES
    );
  }, [selectedPickupMinutes]);

  useEffect(() => {
    const isCurrentPickupValid = availablePickupOptions.some(
      (t) => t.value === earliestPickup
    );
    if (!isCurrentPickupValid && availablePickupOptions.length > 0) {
      setEarliestPickup(availablePickupOptions[0].value);
    }
  }, [availablePickupOptions, earliestPickup]);

  useEffect(() => {
    const isCurrentDropoffValid = availableDropoffOptions.some(
      (t) => t.value === latestDropoff
    );
    if (!isCurrentDropoffValid && availableDropoffOptions.length > 0) {
      setLatestDropoff(availableDropoffOptions[0].value);
    }
  }, [availableDropoffOptions, latestDropoff]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setCurrentStep('details');
        setRegoPlate('');
        setRegoState('NSW');
        setPickupAddress('');
        setSelectedPlaceDetails(null);
        setSubmitError(null);
        setEarliestPickup('09:00');
        setLatestDropoff('17:00');
        setGarageSearch('');
        setGarageAddress('');
        setGarageBookingTime('09:00');
        setAdditionalNotes('');
        setGuestName('');
        setGuestEmail('');
        setGuestPhone('');
        setIsGuestCheckout(false);
        setClientSecret(null);
        setPaymentIntentId(null);
        setIsProcessing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleAddressSelect = (details: PlaceDetails) => {
    setSelectedPlaceDetails(details);
  };

  const handleGarageSelect = (details: GarageDetails) => {
    setGarageAddress(details.formattedAddress);
  };

  const getTimeLabel = (value: string, options: TimeOption[]): string => {
    const option = options.find((t) => t.value === value);
    return option?.label || value;
  };

  const validateForm = (): string | null => {
    if (isGuestCheckout || !isAuthenticated) {
      if (!guestName.trim()) {
        return 'Please enter your full name.';
      }
      if (!guestEmail.trim()) {
        return 'Please enter your email address.';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        return 'Please enter a valid email address.';
      }
      if (!guestPhone.trim()) {
        return 'Please enter your phone number.';
      }
    }

    if (!regoPlate.trim()) {
      return 'Please enter your vehicle registration number.';
    }
    if (!pickupAddress.trim()) {
      return 'Please enter your pick-up address.';
    }
    if (!earliestPickup) {
      return 'Please select a pick-up time.';
    }
    if (!latestDropoff) {
      return 'Please select a drop-off time.';
    }

    // Garage is mandatory
    if (!garageSearch.trim()) {
      return 'Please enter your garage/mechanic name.';
    }
    if (!garageBookingTime) {
      return 'Please select your garage booking time.';
    }

    return null;
  };

  const handleProceedToPayment = async () => {
    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsProcessing(true);
    setSubmitError(null);

    try {
      const customerName = isGuestCheckout || !isAuthenticated 
        ? guestName 
        : session?.user?.username || '';
      const customerEmail = isGuestCheckout || !isAuthenticated 
        ? guestEmail 
        : session?.user?.email || '';
      const customerPhone = isGuestCheckout || !isAuthenticated 
        ? guestPhone 
        : '';

      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          pickupAddress: pickupAddress.trim(),
          serviceType: 'Existing Garage Booking',
          vehicleRegistration: regoPlate.trim().toUpperCase(),
          vehicleState: regoState,
          earliestPickup: getTimeLabel(earliestPickup, allPickupTimeOptions),
          latestDropoff: getTimeLabel(latestDropoff, allDropoffTimeOptions),
          hasExistingBooking: true,
          garageName: garageSearch.trim(),
          garageAddress: garageAddress.trim(),
          garageBookingTime: getTimeLabel(garageBookingTime, garageBookingTimeOptions),
          additionalNotes: additionalNotes.trim(),
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
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // Save the booking to database after successful payment
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

  // Success state
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-1/2 top-1/2 z-[101] w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2"
            >
              <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-2xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Payment Successful!
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Your booking has been confirmed. We&apos;ll be in touch shortly.
                </p>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={onClose}
                    className="w-full rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

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
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-1/2 top-1/2 z-[101] w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
                {/* Payment Step */}
                {currentStep === 'payment' && clientSecret && (
                  <>
                    <div className="mb-6">
                      <button
                        onClick={() => setCurrentStep('details')}
                        disabled={isProcessing}
                        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to details
                      </button>
                      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                        Payment Details
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Complete your booking with secure payment
                      </p>
                    </div>

                    {/* Order Summary */}
                    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <h3 className="text-sm font-semibold text-slate-900 mb-3">Order Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Vehicle</span>
                          <span className="font-medium text-slate-900">{regoPlate} ({regoState})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Pickup</span>
                          <span className="font-medium text-slate-900">{getTimeLabel(earliestPickup, allPickupTimeOptions)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Return by</span>
                          <span className="font-medium text-slate-900">{getTimeLabel(latestDropoff, allDropoffTimeOptions)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Garage</span>
                          <span className="font-medium text-slate-900">{garageSearch}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Garage booking</span>
                          <span className="font-medium text-slate-900">{getTimeLabel(garageBookingTime, garageBookingTimeOptions)}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-900">Total</span>
                            <span className="font-bold text-emerald-600">{PRICE_DISPLAY} AUD</span>
                          </div>
                        </div>
                      </div>
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

                {/* Details Step */}
                {currentStep === 'details' && (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            Book a Pick-up & Drop-off
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            We&apos;ll collect your car, take it to the garage, and return it to you.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-emerald-700">
                        <CreditCard className="h-4 w-4" />
                        <span className="font-semibold">{PRICE_DISPLAY} AUD</span>
                      </div>
                    </div>

                    {submitError && (
                      <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                        <p className="text-sm font-medium text-red-800">{submitError}</p>
                      </div>
                    )}

                    <form
                      className="space-y-5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleProceedToPayment();
                      }}
                    >
                      {/* Guest Checkout Fields */}
                      {(isGuestCheckout || !isAuthenticated) && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                          <h3 className="mb-4 text-sm font-semibold text-slate-900">
                            Your Details
                          </h3>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-600">
                                Full Name *
                              </label>
                              <input
                                type="text"
                                placeholder="John Smith"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                disabled={isProcessing}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-600">
                                Email *
                              </label>
                              <input
                                type="email"
                                placeholder="john@example.com"
                                value={guestEmail}
                                onChange={(e) => setGuestEmail(e.target.value)}
                                disabled={isProcessing}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-600">
                                Phone *
                              </label>
                              <input
                                type="tel"
                                placeholder="0412 345 678"
                                value={guestPhone}
                                onChange={(e) => setGuestPhone(e.target.value)}
                                disabled={isProcessing}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Time inputs */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">
                            Earliest pick-up time *
                          </label>
                          <select
                            value={earliestPickup}
                            onChange={(e) => setEarliestPickup(e.target.value)}
                            disabled={isProcessing}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                          >
                            {availablePickupOptions.map((time) => (
                              <option key={`earliest-${time.value}`} value={time.value}>
                                {time.label}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-400">
                            Available 6:00am – 2:00pm
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">
                            Latest drop-off time *
                          </label>
                          <select
                            value={latestDropoff}
                            onChange={(e) => setLatestDropoff(e.target.value)}
                            disabled={isProcessing}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                          >
                            {availableDropoffOptions.map((time) => (
                              <option key={`latest-${time.value}`} value={time.value}>
                                {time.label}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-400">
                            Available 9:00am – 7:00pm (min. 2hr gap)
                          </p>
                        </div>
                      </div>

                      {/* Address with Autocomplete */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                          Pick-up address *
                        </label>
                        <AddressAutocomplete
                          value={pickupAddress}
                          onChange={setPickupAddress}
                          onSelect={handleAddressSelect}
                          placeholder="Start typing your address..."
                          disabled={isProcessing}
                          biasToNewcastle={true}
                        />
                      </div>

                      {/* Vehicle Registration Section */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="mb-4 text-sm font-semibold text-slate-900">
                          Vehicle Registration
                        </h3>

                        {/* Registration number (left) and State (right) side by side */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">
                              Registration Number *
                            </label>
                            <input
                              type="text"
                              placeholder="ABC123"
                              maxLength={6}
                              value={regoPlate}
                              onChange={(e) =>
                                setRegoPlate(e.target.value.toUpperCase().slice(0, 6))
                              }
                              disabled={isProcessing}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase tracking-wider text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">
                              State *
                            </label>
                            <select
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
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
                        </div>

                        {/* Registration plate image centered below */}
                        <div className="mt-5 flex justify-center">
                          <RegistrationPlate plate={regoPlate} state={regoState} />
                        </div>
                      </div>

                      {/* Garage Booking Section */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="mb-4 text-sm font-semibold text-slate-900">
                          Your Garage Booking
                        </h3>
                        
                        <div className="space-y-4">
                          {/* Garage Search */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">
                              Garage / Mechanic *
                            </label>
                            <GarageAutocomplete
                              value={garageSearch}
                              onChange={setGarageSearch}
                              onSelect={handleGarageSelect}
                              placeholder="Search for your garage (e.g. Ultra Tune Jesmond)"
                              disabled={isProcessing}
                              biasToNewcastle={true}
                            />
                          </div>

                          {/* Booking Time */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">
                              Your Booking Time at Garage *
                            </label>
                            <select
                              value={garageBookingTime}
                              onChange={(e) => setGarageBookingTime(e.target.value)}
                              disabled={isProcessing}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                            >
                              {garageBookingTimeOptions.map((time) => (
                                <option key={`garage-${time.value}`} value={time.value}>
                                  {time.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Additional Notes */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">
                              Additional Notes
                            </label>
                            <textarea
                              placeholder="Any special instructions for us..."
                              value={additionalNotes}
                              onChange={(e) => setAdditionalNotes(e.target.value)}
                              disabled={isProcessing}
                              rows={2}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50 resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Please wait...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5" />
                            Continue to Payment
                          </>
                        )}
                      </button>

                      <p className="text-center text-xs text-slate-500">
                        You&apos;ll enter your card details on the next step
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
