// src/components/homepage/BookingModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
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

// Generate time options in 15-minute intervals
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      options.push(`${h}:${m}`);
    }
  }
  return options;
}

const timeOptions = generateTimeOptions();

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [isLookingUpRego, setIsLookingUpRego] = useState(false);
  const [regoError, setRegoError] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(null);
  const [regoPlate, setRegoPlate] = useState('');
  const [regoState, setRegoState] = useState<StateCode>('NSW');
  const [earliestPickup, setEarliestPickup] = useState('09:00');
  const [latestDropoff, setLatestDropoff] = useState('17:00');

  // Prevent body scroll when modal is open
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

      // AutoGrab returns data in a specific structure
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-1/2 top-1/2 z-[101] w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative rounded-3xl border border-slate-200 bg-white shadow-2xl">
              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal content */}
              <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    Start a quick booking
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tell us when and where – we&apos;ll match you with a
                    vetted local garage.
                  </p>
                </div>

                <form
                  className="space-y-5"
                  onSubmit={(e) => e.preventDefault()}
                >
                  {/* Time inputs */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Earliest pick-up time
                      </label>
                      <select
                        value={earliestPickup}
                        onChange={(e) => setEarliestPickup(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2"
                      >
                        {timeOptions.map((time) => (
                          <option key={`earliest-${time}`} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Latest drop-off time
                      </label>
                      <select
                        value={latestDropoff}
                        onChange={(e) => setLatestDropoff(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2"
                      >
                        {timeOptions.map((time) => (
                          <option key={`latest-${time}`} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
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
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2"
                    />
                  </div>

                  {/* Registration Section with Plate Visual */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="mb-4 text-sm font-semibold text-slate-900">
                      Vehicle Registration
                    </h3>

                    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                      {/* Plate visual */}
                      <div className="flex-shrink-0">
                        <RegistrationPlate
                          plate={regoPlate}
                          state={regoState}
                        />
                      </div>

                      {/* Inputs */}
                      <div className="w-full flex-1 space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-600">
                            State
                          </label>
                          <select
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2"
                            value={regoState}
                            onChange={(e) =>
                              setRegoState(e.target.value as StateCode)
                            }
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
                                setRegoPlate(
                                  e.target.value.toUpperCase().slice(0, 6)
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm uppercase tracking-wider text-slate-900 outline-none ring-emerald-500/60 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2"
                            />
                            <button
                              type="button"
                              onClick={handleRegoLookup}
                              disabled={isLookingUpRego}
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

                    {/* Vehicle details result */}
                    {vehicleDetails && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                          <div>
                            <p className="font-semibold text-emerald-900">
                              Vehicle found:{' '}
                              {vehicleDetails.year
                                ? `${vehicleDetails.year} `
                                : ''}
                              {vehicleDetails.make} {vehicleDetails.model}
                            </p>
                            <p className="mt-0.5 text-sm text-emerald-700">
                              {vehicleDetails.series && (
                                <>Series: {vehicleDetails.series}</>
                              )}
                              {vehicleDetails.series &&
                                vehicleDetails.fuel_type && <> • </>}
                              {vehicleDetails.fuel_type && (
                                <>Fuel: {vehicleDetails.fuel_type}</>
                              )}
                              {(vehicleDetails.series ||
                                vehicleDetails.fuel_type) &&
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

                  {/* Service type */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Service type
                    </label>
                    <select className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-500/60 focus:border-emerald-500 focus:ring-2">
                      <option value="standard">
                        Standard service ($89 pick-up)
                      </option>
                      <option value="major">
                        Major service ($139 pick-up)
                      </option>
                      <option value="logbook">Logbook service</option>
                      <option value="diagnostic">Diagnostic / other</option>
                    </select>
                  </div>

                  {/* Submit */}
                  <button
                    type="button"
                    className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
                  >
                    Continue to detailed booking
                  </button>

                  <p className="text-center text-xs text-slate-500">
                    No payment taken yet. We&apos;ll confirm availability and
                    get back to you.
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
