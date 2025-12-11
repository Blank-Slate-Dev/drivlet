// src/components/homepage/BookingModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, AlertCircle, User } from 'lucide-react';
import RegistrationPlate, { StateCode } from './RegistrationPlate';

type VehicleDetails = {
  make: string;
  model: string;
  year: number;
  series?: string;
  fuel_type?: string;
  transmission?: string;
};

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

const SERVICE_TYPES: Record<string, string> = {
  standard: 'Standard Service',
  major: 'Major Service',
  logbook: 'Logbook Service',
  diagnostic: 'Diagnostic Check',
};

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  // Form state
  const [isLookingUpRego, setIsLookingUpRego] = useState(false);
  const [regoError, setRegoError] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(null);
  const [regoPlate, setRegoPlate] = useState('');
  const [regoState, setRegoState] = useState<StateCode>('NSW');
  const [earliestPickup, setEarliestPickup] = useState('09:00');
  const [latestDropoff, setLatestDropoff] = useState('17:00');
  const [pickupAddress, setPickupAddress] = useState('');
  const [serviceType, setServiceType] = useState('standard');

  // Guest details
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Existing booking details (for stage 1 - attending existing bookings)
  const [hasExistingBooking, setHasExistingBooking] = useState(false);
  const [garageName, setGarageName] = useState('');
  const [existingBookingRef, setExistingBookingRef] = useState('');
  const [existingBookingNotes, setExistingBookingNotes] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const isGuest = authStatus !== 'authenticated';

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

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setRegoPlate('');
        setRegoState('NSW');
        setPickupAddress('');
        setServiceType('standard');
        setVehicleDetails(null);
        setRegoError(null);
        setSubmitError(null);
        setShowSuccess(false);
        setEarliestPickup('09:00');
        setLatestDropoff('17:00');
        setGuestName('');
        setGuestEmail('');
        setGuestPhone('');
        setHasExistingBooking(false);
        setGarageName('');
        setExistingBookingRef('');
        setExistingBookingNotes('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleRegoLookup = async () => {
    setRegoError(null);
    setVehicleDetails(null);

    if (!regoPlate.trim()) {
      setRegoError('Please enter a registration plate.');
      return;
    }

    setIsLookingUpRego(true);
    try {
      const res = await fetch(
        `/api/rego?plate=${encodeURIComponent(regoPlate)}&state=${regoState}`
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        setRegoError(data.error || 'Unable to find vehicle details.');
        return;
      }

      const vehicle = data.vehicles?.[0] || data;

      setVehicleDetails({
        make: vehicle.make ?? 'Unknown',
        model: vehicle.model ?? 'Unknown',
        year: vehicle.year ?? 0,
        series: vehicle.series,
        fuel_type: vehicle.fuel_type,
        transmission: vehicle.transmission,
      });
    } catch (error) {
      console.error(error);
      setRegoError('Something went wrong. Please try again.');
    } finally {
      setIsLookingUpRego(false);
    }
  };

  const validateForm = (): string | null => {
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

    // Guest validation
    if (isGuest) {
      if (!guestName.trim()) {
        return 'Please enter your name.';
      }
      if (!guestEmail.trim()) {
        return 'Please enter your email address.';
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail)) {
        return 'Please enter a valid email address.';
      }
      if (!guestPhone.trim()) {
        return 'Please enter your phone number.';
      }
    }

    // Existing booking validation
    if (hasExistingBooking) {
      if (!garageName.trim()) {
        return 'Please enter the garage name for your existing booking.';
      }
    }

    return null;
  };

  const getTimeLabel = (value: string, options: TimeOption[]): string => {
    const option = options.find(t => t.value === value);
    return option?.label || value;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const bookingData = {
        pickupTime: getTimeLabel(earliestPickup, allPickupTimeOptions),
        dropoffTime: getTimeLabel(latestDropoff, allDropoffTimeOptions),
        pickupAddress: pickupAddress.trim(),
        vehicleRegistration: regoPlate.trim().toUpperCase(),
        vehicleState: regoState,
        serviceType: SERVICE_TYPES[serviceType] || serviceType,
        // Guest details (only if not logged in)
        ...(isGuest && {
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim().toLowerCase(),
          guestPhone: guestPhone.trim(),
        }),
        // Existing booking details
        hasExistingBooking,
        ...(hasExistingBooking && {
          garageName: garageName.trim(),
          existingBookingRef: existingBookingRef.trim(),
          existingBookingNotes: existingBookingNotes.trim(),
        }),
      };

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      setShowSuccess(true);

      setTimeout(() => {
        onClose();
        if (!isGuest) {
          router.push('/dashboard');
        }
      }, 2000);

    } catch (error) {
      console.error('Booking submission error:', error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
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
                  Booking Request Received!
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {isGuest
                    ? "We'll contact you shortly to confirm your booking and arrange payment."
                    : 'Check your dashboard for updates.'}
                </p>
                {isGuest && (
                  <p className="mt-3 text-xs text-slate-500">
                    A confirmation email has been sent to {guestEmail}
                  </p>
                )}
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
                disabled={isSubmitting}
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    Book a Pick-up & Drop-off
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    We&apos;ll collect your car, take it to the garage, and return it to you.
                  </p>
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
                    handleSubmit();
                  }}
                >
                  {/* Guest Details Section */}
                  {isGuest && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-slate-600" />
                        <h3 className="text-sm font-semibold text-slate-900">
                          Your Details
                        </h3>
                      </div>

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
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">
                              Email *
                            </label>
                            <input
                              type="email"
                              placeholder="john@example.com"
                              value={guestEmail}
                              onChange={(e) => setGuestEmail(e.target.value)}
                              disabled={isSubmitting}
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
                              disabled={isSubmitting}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Time inputs */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Earliest pick-up time
                      </label>
                      <select
                        value={earliestPickup}
                        onChange={(e) => setEarliestPickup(e.target.value)}
                        disabled={isSubmitting}
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
                        Latest drop-off time
                      </label>
                      <select
                        value={latestDropoff}
                        onChange={(e) => setLatestDropoff(e.target.value)}
                        disabled={isSubmitting}
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

                  {/* Address */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Pick-up address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123 King St, Newcastle NSW"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                    />
                  </div>

                  {/* Registration Section */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="mb-4 text-sm font-semibold text-slate-900">
                      Vehicle Registration
                    </h3>

                    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                      <div className="flex-shrink-0">
                        <RegistrationPlate plate={regoPlate} state={regoState} />
                      </div>

                      <div className="w-full flex-1 space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-600">
                            State
                          </label>
                          <select
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                            value={regoState}
                            onChange={(e) => setRegoState(e.target.value as StateCode)}
                            disabled={isSubmitting}
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
                          <label className="text-xs font-medium text-slate-600">
                            Registration number
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="ABC123"
                              maxLength={6}
                              value={regoPlate}
                              onChange={(e) =>
                                setRegoPlate(e.target.value.toUpperCase().slice(0, 6))
                              }
                              disabled={isSubmitting}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm uppercase tracking-wider text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={handleRegoLookup}
                              disabled={isLookingUpRego || isSubmitting}
                              className="whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isLookingUpRego ? 'Looking up…' : 'Lookup'}
                            </button>
                          </div>
                        </div>

                        {regoError && (
                          <p className="text-xs text-red-600">{regoError}</p>
                        )}
                      </div>
                    </div>

                    {vehicleDetails && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                          <div>
                            <p className="font-semibold text-emerald-900">
                              Vehicle found:{' '}
                              {vehicleDetails.year ? `${vehicleDetails.year} ` : ''}
                              {vehicleDetails.make} {vehicleDetails.model}
                            </p>
                            <p className="mt-0.5 text-sm text-emerald-700">
                              {vehicleDetails.series && <>Series: {vehicleDetails.series}</>}
                              {vehicleDetails.series && vehicleDetails.fuel_type && <> • </>}
                              {vehicleDetails.fuel_type && <>Fuel: {vehicleDetails.fuel_type}</>}
                              {(vehicleDetails.series || vehicleDetails.fuel_type) &&
                                vehicleDetails.transmission && <> • </>}
                              {vehicleDetails.transmission && (
                                <>Trans: {vehicleDetails.transmission}</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Existing Booking Section */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={hasExistingBooking}
                        onChange={(e) => setHasExistingBooking(e.target.checked)}
                        disabled={isSubmitting}
                        className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="text-sm font-semibold text-amber-900">
                          I already have a service booking at a garage
                        </span>
                        <p className="mt-0.5 text-xs text-amber-700">
                          We&apos;ll pick up your car, take it to your booked garage, and return it
                        </p>
                      </div>
                    </label>

                    {hasExistingBooking && (
                      <div className="mt-4 space-y-3 border-t border-amber-200 pt-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-amber-800">
                            Garage Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Smith's Auto Service"
                            value={garageName}
                            onChange={(e) => setGarageName(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-amber-500/60 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 disabled:opacity-50"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-amber-800">
                            Booking Reference (optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. BK12345"
                            value={existingBookingRef}
                            onChange={(e) => setExistingBookingRef(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-amber-500/60 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 disabled:opacity-50"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-amber-800">
                            Additional Notes (optional)
                          </label>
                          <textarea
                            placeholder="Any special instructions or details about your booking..."
                            value={existingBookingNotes}
                            onChange={(e) => setExistingBookingNotes(e.target.value)}
                            disabled={isSubmitting}
                            rows={2}
                            className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-amber-500/60 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Service type - only show if no existing booking */}
                  {!hasExistingBooking && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Service type
                      </label>
                      <select
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2 disabled:opacity-50"
                      >
                        <option value="standard">Standard service ($89 pick-up)</option>
                        <option value="major">Major service ($139 pick-up)</option>
                        <option value="logbook">Logbook service</option>
                        <option value="diagnostic">Diagnostic / other</option>
                      </select>
                    </div>
                  )}

                  {/* Pricing info for existing bookings */}
                  {hasExistingBooking && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-medium text-emerald-900">
                        Pick-up & Drop-off Fee: $49
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Flat rate for collecting your car, taking it to your booked garage, and returning it.
                      </p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Request Booking'
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-500">
                    {hasExistingBooking
                      ? "We'll confirm availability and contact you to arrange payment."
                      : "No payment taken yet. We'll confirm availability and get back to you."}
                  </p>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
