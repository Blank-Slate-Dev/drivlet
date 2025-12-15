// src/components/homepage/BookingModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { X, CheckCircle2, Loader2, AlertCircle, CreditCard, ArrowLeft, ArrowRight, MapPin, Clock, Car, Building, User, Mail, Phone } from 'lucide-react';
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

type Step = 'details' | 'review' | 'payment' | 'success';

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

  // Get customer info (either from session or guest fields)
  const customerName = isAuthenticated ? (session?.user?.username || '') : guestName;
  const customerEmail = isAuthenticated ? (session?.user?.email || '') : guestEmail;
  const customerPhone = guestPhone;

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

  const validateDetailsStep = (): string | null => {
    // Guest info validation
    if (!isAuthenticated) {
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

  // Build tracking URL for success page
  const trackingUrl = `/track?email=${encodeURIComponent(customerEmail)}&rego=${encodeURIComponent(regoPlate.toUpperCase())}`;

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
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-slate-900">
                  Booking Confirmed!
                </h3>
                <p className="mt-2 text-slate-600">
                  We&apos;ve received your booking and payment.
                </p>
                
                {/* Booking Summary */}
                <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vehicle</span>
                      <span className="font-medium text-slate-900">{regoPlate.toUpperCase()} ({regoState})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Garage</span>
                      <span className="font-medium text-slate-900">{garageSearch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pickup</span>
                      <span className="font-medium text-slate-900">{getTimeLabel(earliestPickup, allPickupTimeOptions)}</span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  A confirmation email has been sent to <span className="font-medium">{customerEmail}</span>
                </p>

                <div className="mt-6 space-y-3">
                  <Link
                    href={trackingUrl}
                    className="block w-full rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
                  >
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

              {/* Step Indicator - Fixed centering */}
              <div className="border-b border-slate-100 px-6 py-4 sm:px-8">
                <div className="flex items-start justify-center">
                  {['details', 'review', 'payment'].map((step, index) => (
                    <div key={step} className="flex items-start">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                            currentStep === step
                              ? 'bg-emerald-600 text-white'
                              : ['details'].indexOf(currentStep) < index ||
                                (currentStep === 'details' && index > 0)
                              ? 'bg-slate-100 text-slate-400'
                              : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className={`mt-2 text-xs ${
                          currentStep === step 
                            ? 'font-medium text-emerald-600' 
                            : 'text-slate-500'
                        }`}>
                          {step.charAt(0).toUpperCase() + step.slice(1)}
                        </span>
                      </div>
                      {index < 2 && (
                        <div
                          className={`mx-3 mt-4 h-0.5 w-12 sm:w-16 ${
                            ['details', 'review'].indexOf(currentStep) > index
                              ? 'bg-emerald-400'
                              : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-6 sm:p-8">
                {/* Payment Step */}
                {currentStep === 'payment' && clientSecret && (
                  <>
                    <div className="mb-6">
                      <button
                        onClick={() => setCurrentStep('review')}
                        disabled={isProcessing}
                        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to review
                      </button>
                      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                        Payment Details
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Complete your booking with secure payment
                      </p>
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

                {/* Review Step */}
                {currentStep === 'review' && (
                  <>
                    <div className="mb-6">
                      <button
                        onClick={() => setCurrentStep('details')}
                        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Edit details
                      </button>
                      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                        Review Your Booking
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Please confirm the details below before payment
                      </p>
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
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                          <User className="h-4 w-4 text-emerald-600" />
                          Customer Details
                        </h3>
                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 w-20">Name:</span>
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
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                          <Car className="h-4 w-4 text-emerald-600" />
                          Vehicle
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-700">{regoPlate.toUpperCase()} ({regoState})</span>
                          <RegistrationPlate plate={regoPlate} state={regoState} />
                        </div>
                      </div>

                      {/* Times */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                          <Clock className="h-4 w-4 text-emerald-600" />
                          Schedule
                        </h3>
                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                          <div>
                            <span className="text-slate-500">Pickup from:</span>
                            <p className="font-medium text-slate-900">{getTimeLabel(earliestPickup, allPickupTimeOptions)}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Return by:</span>
                            <p className="font-medium text-slate-900">{getTimeLabel(latestDropoff, allDropoffTimeOptions)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                          Pickup Location
                        </h3>
                        <p className="text-sm text-slate-900">{pickupAddress}</p>
                      </div>

                      {/* Garage */}
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-700 mb-3">
                          <Building className="h-4 w-4" />
                          Garage Booking
                        </h3>
                        <div className="text-sm">
                          <p className="font-medium text-blue-900">{garageSearch}</p>
                          {garageAddress && (
                            <p className="text-blue-700 text-xs mt-1">{garageAddress}</p>
                          )}
                          <p className="text-blue-600 mt-2">
                            Appointment time: {getTimeLabel(garageBookingTime, garageBookingTimeOptions)}
                          </p>
                        </div>
                      </div>

                      {/* Additional Notes */}
                      {additionalNotes && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes</h3>
                          <p className="text-sm text-slate-600">{additionalNotes}</p>
                        </div>
                      )}

                      {/* Price */}
                      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-emerald-800">Total</span>
                          <span className="text-2xl font-bold text-emerald-700">{PRICE_DISPLAY} AUD</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleProceedToPayment}
                      disabled={isProcessing}
                      className="mt-6 w-full rounded-full bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50"
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

                {/* Details Step */}
                {currentStep === 'details' && (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            Book a Pick-up
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            We&apos;ll collect, service, and return your car
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
                        handleContinueToReview();
                      }}
                    >
                      {/* Guest Checkout Fields */}
                      {!isAuthenticated && (
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
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
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
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
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
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                              />
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-slate-500">
                            Have an account?{' '}
                            <Link href="/login" className="text-emerald-600 font-medium hover:underline">
                              Sign in
                            </Link>
                          </p>
                        </div>
                      )}

                      {/* Logged in user info */}
                      {isAuthenticated && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-semibold">
                              {(session?.user?.username || session?.user?.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-emerald-900">
                                {session?.user?.username || 'User'}
                              </p>
                              <p className="text-sm text-emerald-700">{session?.user?.email}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="text-xs font-medium text-emerald-700">
                              Phone (for driver contact)
                            </label>
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
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
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
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
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
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base uppercase tracking-wider text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">
                              State *
                            </label>
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
                        </div>

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

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">
                              Your Booking Time at Garage *
                            </label>
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
                            <label className="text-xs font-medium text-slate-600">
                              Additional Notes
                            </label>
                            <textarea
                              placeholder="Any special instructions for us..."
                              value={additionalNotes}
                              onChange={(e) => setAdditionalNotes(e.target.value)}
                              disabled={isProcessing}
                              rows={2}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50 resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="mt-2 w-full rounded-full bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <span className="inline-flex items-center gap-2">
                          Continue to Review
                          <ArrowRight className="h-5 w-5" />
                        </span>
                      </button>
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
