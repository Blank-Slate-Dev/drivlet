// src/components/forms/PickupConsentForm.tsx
"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Car,
  MapPin,
  ClipboardCheck,
  Shield,
} from "lucide-react";
import SignaturePad from "./SignaturePad";

interface BookingData {
  _id: string;
  userName: string;
  userEmail: string;
  vehicleRegistration: string;
  vehicleState: string;
  vehicleModel?: string;
  vehicleYear?: string;
  pickupAddress: string;
  garageName?: string;
  garageAddress?: string;
  transmissionType: string;
}

interface PickupConsentFormProps {
  booking: BookingData;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  driverName?: string;
}

export default function PickupConsentForm({
  booking,
  isOpen,
  onClose,
  onSuccess,
  driverName = "",
}: PickupConsentFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupDatetime, setPickupDatetime] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [fuelLevel, setFuelLevel] = useState("");
  const [existingDamageNotes, setExistingDamageNotes] = useState("");
  const [serviceCentreName, setServiceCentreName] = useState("");
  const [serviceCentreContact, setServiceCentreContact] = useState("");
  const [serviceCentreAddress, setServiceCentreAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [declCustomerName, setDeclCustomerName] = useState("");
  const [declCustomerDate, setDeclCustomerDate] = useState("");
  const [driverNameField, setDriverNameField] = useState("");
  const [declDriverDate, setDeclDriverDate] = useState("");

  // Signatures
  const [customerSignature, setCustomerSignature] = useState("");
  const [driverSignature, setDriverSignature] = useState("");

  // Pre-fill from booking data
  useEffect(() => {
    if (isOpen && booking) {
      setCustomerName(booking.userName || "");
      setCustomerEmail(booking.userEmail || "");
      setPickupLocation(booking.pickupAddress || "");
      setServiceCentreName(booking.garageName || "");
      setServiceCentreAddress(booking.garageAddress || "");
      setDeclCustomerName(booking.userName || "");
      setDriverNameField(driverName);

      // Set today's date
      const today = new Date().toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      setDeclCustomerDate(today);
      setDeclDriverDate(today);

      // Set current datetime for pickup
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setPickupDatetime(localISO);
    }
  }, [isOpen, booking, driverName]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSuccess(false);
      setError("");
      setSubmitting(false);
      setPrivacyAcknowledged(false);
      setCustomerSignature("");
      setDriverSignature("");
    }
  }, [isOpen]);

  const validate = (): string | null => {
    if (!customerName.trim()) return "Customer name is required";
    if (!customerPhone.trim()) return "Customer phone is required";
    if (!pickupLocation.trim()) return "Pickup location is required";
    if (!odometerKm.trim()) return "Odometer reading is required";
    if (!serviceCentreName.trim()) return "Service centre name is required";
    if (!serviceCentreAddress.trim()) return "Service centre address is required";
    if (!privacyAcknowledged) return "Please acknowledge the privacy notice";
    if (!declCustomerName.trim()) return "Declaration name is required";
    if (!customerSignature) return "Customer signature is required";
    if (!driverNameField.trim()) return "Driver name is required";
    if (!driverSignature) return "Driver signature is required";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/bookings/${booking._id}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType: "pickup_consent",
          submittedByName: customerName.trim(),
          submittedByEmail: customerEmail.trim(),
          privacyAcknowledged,
          signatures: {
            customer: customerSignature,
            driver: driverSignature,
          },
          formData: {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerEmail: customerEmail.trim(),
            bookingReference: booking._id,
            pickupLocation: pickupLocation.trim(),
            pickupDatetime,
            vehicleMakeModel: `${booking.vehicleYear || ""} ${booking.vehicleModel || ""}`.trim(),
            vehicleRego: `${booking.vehicleRegistration} (${booking.vehicleState})`,
            odometerPickupKm: odometerKm.trim(),
            fuelLevelPickup: fuelLevel.trim(),
            existingDamageNotes: existingDamageNotes.trim(),
            serviceCentreName: serviceCentreName.trim(),
            serviceCentreContact: serviceCentreContact.trim(),
            serviceCentreAddress: serviceCentreAddress.trim(),
            customerNotes: customerNotes.trim(),
            declCustomerName: declCustomerName.trim(),
            declCustomerDate: declCustomerDate.trim(),
            driverName: driverNameField.trim(),
            declDriverDate: declDriverDate.trim(),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to submit form");

      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <ClipboardCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Vehicle Pick-up Condition & Consent
                </h2>
                <p className="text-sm text-emerald-100">
                  {booking.vehicleRegistration} ({booking.vehicleState})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            {/* Success */}
            {success && (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Form Submitted Successfully
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  The pickup consent form has been recorded.
                </p>
              </div>
            )}

            {!success && (
              <div className="space-y-6">
                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Section 1: Customer Details */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Car className="h-4 w-4 text-emerald-600" />
                    Customer & Booking Details
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Full Name *</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Booking Ref</label>
                      <input
                        type="text"
                        value={booking._id}
                        disabled
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Phone *</label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Email</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Pickup Location *</label>
                      <input
                        type="text"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Pickup Date/Time *</label>
                      <input
                        type="datetime-local"
                        value={pickupDatetime}
                        onChange={(e) => setPickupDatetime(e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Vehicle Condition */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Car className="h-4 w-4 text-emerald-600" />
                    Vehicle Condition at Pick-up
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Vehicle</label>
                      <input
                        type="text"
                        value={`${booking.vehicleYear || ""} ${booking.vehicleModel || ""}`}
                        disabled
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Rego</label>
                      <input
                        type="text"
                        value={`${booking.vehicleRegistration} (${booking.vehicleState})`}
                        disabled
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Odometer (km) *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={odometerKm}
                        onChange={(e) => setOdometerKm(e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Fuel Level</label>
                      <input
                        type="text"
                        placeholder="e.g. 1/4, 1/2, 3/4"
                        value={fuelLevel}
                        onChange={(e) => setFuelLevel(e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Existing Damage Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Note any visible damage. Add enough detail to identify location and size."
                      value={existingDamageNotes}
                      onChange={(e) => setExistingDamageNotes(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>

                {/* Section 3: Service Centre */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    Service Centre
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Centre Name *</label>
                      <input
                        type="text"
                        value={serviceCentreName}
                        onChange={(e) => setServiceCentreName(e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Contact</label>
                      <input
                        type="text"
                        value={serviceCentreContact}
                        onChange={(e) => setServiceCentreContact(e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Address *</label>
                    <input
                      type="text"
                      value={serviceCentreAddress}
                      onChange={(e) => setServiceCentreAddress(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Special Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Any special instructions, access notes, or workshop requests."
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>

                {/* Section 4: Consent & Privacy */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Consent & Privacy
                  </h3>
                  <div className="text-xs text-emerald-700 space-y-2">
                    <p>
                      By signing this form, you consent to Drivlet collecting your vehicle for the
                      stated service. You confirm the condition notes above are accurate to the best
                      of your knowledge.
                    </p>
                    <p>
                      Nothing in this form limits your rights under Australian Consumer Law.
                    </p>
                    <p>
                      <strong>Privacy Notice:</strong> We collect your personal details, vehicle
                      details, condition notes, signatures, and timestamps. We use this to manage
                      your booking and communicate with you. We may share relevant information with
                      our drivers, insurers, and service providers. See our{" "}
                      <a
                        href="https://drivlet.com.au/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyAcknowledged}
                      onChange={(e) => setPrivacyAcknowledged(e.target.checked)}
                      disabled={submitting}
                      className="mt-1 h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-emerald-800">
                      I acknowledge the Privacy Collection Notice above. *
                    </span>
                  </label>
                </div>

                {/* Section 5: Signatures */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Declaration & Signatures
                  </h3>

                  {/* Customer */}
                  <div className="space-y-3 pb-4 border-b border-slate-200">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                      Customer
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Full Name *</label>
                        <input
                          type="text"
                          value={declCustomerName}
                          onChange={(e) => setDeclCustomerName(e.target.value)}
                          disabled={submitting}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Date *</label>
                        <input
                          type="text"
                          value={declCustomerDate}
                          onChange={(e) => setDeclCustomerDate(e.target.value)}
                          placeholder="dd/mm/yyyy"
                          disabled={submitting}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <SignaturePad
                      id="pickup-customer"
                      label="Customer Signature *"
                      onChange={setCustomerSignature}
                      value={customerSignature}
                      disabled={submitting}
                    />
                  </div>

                  {/* Driver */}
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                      Drivlet Driver
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Driver Name *</label>
                        <input
                          type="text"
                          value={driverNameField}
                          onChange={(e) => setDriverNameField(e.target.value)}
                          disabled={submitting}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Date *</label>
                        <input
                          type="text"
                          value={declDriverDate}
                          onChange={(e) => setDeclDriverDate(e.target.value)}
                          placeholder="dd/mm/yyyy"
                          disabled={submitting}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <SignaturePad
                      id="pickup-driver"
                      label="Driver Signature *"
                      onChange={setDriverSignature}
                      value={driverSignature}
                      disabled={submitting}
                    />
                  </div>

                  <p className="text-xs text-slate-500">
                    By signing digitally, you agree you intend to be legally bound by
                    this form. Governing law: New South Wales, Australia.
                  </p>
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      "Submit Form"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
