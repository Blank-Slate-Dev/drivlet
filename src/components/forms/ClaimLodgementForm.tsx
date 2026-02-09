"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Car,
  Shield,
  FileWarning,
  Phone,
  MapPin,
  Wrench,
  Camera,
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
  vehicleColor?: string;
  pickupAddress: string;
  garageName?: string;
  garageAddress?: string;
  transmissionType: string;
  pickupTime: string;
  dropoffTime: string;
  createdAt: string;
}

interface ClaimLodgementFormProps {
  booking: BookingData;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CLAIM_TYPES = [
  { key: "scratch", label: "Scratch / dent" },
  { key: "wheel", label: "Wheel / tyre" },
  { key: "glass", label: "Windscreen / glass" },
  { key: "keys", label: "Lost keys" },
  { key: "mech", label: "Mechanical issue" },
  { key: "missing", label: "Item missing" },
  { key: "property", label: "Property damage" },
  { key: "other", label: "Other" },
] as const;

const NOTICED_OPTIONS = [
  { key: "pickup", label: "At pick-up" },
  { key: "return", label: "At return" },
  { key: "after", label: "After return" },
] as const;

const STAGE_OPTIONS = [
  { key: "pickup", label: "Pick-up" },
  { key: "transit", label: "In transit" },
  { key: "workshop", label: "At workshop" },
  { key: "unknown", label: "Unknown" },
] as const;

const EVIDENCE_TYPES = [
  { key: "damage_photos", label: "Photos of damage" },
  { key: "pickup_return_photos", label: "Photos from pick-up/return" },
  { key: "video", label: "Video (if relevant)" },
  { key: "quote", label: "Workshop quote/assessment" },
  { key: "receipt", label: "Repair receipt (if repaired)" },
  { key: "police", label: "Police report" },
  { key: "thirdparty", label: "Third-party details" },
  { key: "msgs", label: "Screenshots/messages" },
  { key: "witness", label: "Witness details" },
  { key: "other_evidence", label: "Other supporting info" },
] as const;

export default function ClaimLodgementForm({ booking, isOpen, onClose, onSuccess }: ClaimLodgementFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Booking & Customer
  const [bookingDate, setBookingDate] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [contactPref, setContactPref] = useState<string[]>([]);
  const [pickupAddress, setPickupAddress] = useState("");
  const [returnAddress, setReturnAddress] = useState("");

  // Vehicle
  const [rego, setRego] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [colour, setColour] = useState("");
  const [odometer, setOdometer] = useState("");
  const [transmission, setTransmission] = useState<"auto" | "manual">("auto");
  const [under100k, setUnder100k] = useState<"yes" | "no" | "">("");

  // Workshop
  const [workshopName, setWorkshopName] = useState("");
  const [workshopAddress, setWorkshopAddress] = useState("");
  const [workshopContact, setWorkshopContact] = useState("");

  // Claim
  const [claimTypes, setClaimTypes] = useState<string[]>([]);
  const [whereOnVehicle, setWhereOnVehicle] = useState("");
  const [estimate, setEstimate] = useState("");
  const [preferredResolution, setPreferredResolution] = useState("");
  const [summary, setSummary] = useState("");

  // Incident
  const [noticedDatetime, setNoticedDatetime] = useState("");
  const [policeInvolved, setPoliceInvolved] = useState<"yes" | "no" | "">("");
  const [policeRef, setPoliceRef] = useState("");
  const [noticedWhen, setNoticedWhen] = useState<string[]>([]);
  const [damageStage, setDamageStage] = useState<string[]>([]);
  const [incidentDesc, setIncidentDesc] = useState("");
  const [safeToDrive, setSafeToDrive] = useState<"yes" | "no" | "">("");

  // Evidence
  const [evidenceTypes, setEvidenceTypes] = useState<string[]>([]);
  const [attachmentNotes, setAttachmentNotes] = useState("");
  const [otherNotes, setOtherNotes] = useState("");

  // Declaration
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [declName, setDeclName] = useState("");
  const [declDate, setDeclDate] = useState("");
  const [customerSignature, setCustomerSignature] = useState("");

  const toggle = (list: string[], setter: (v: string[]) => void, key: string) => {
    setter(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  };

  useEffect(() => {
    if (isOpen && booking) {
      setFullName(booking.userName || "");
      setEmail(booking.userEmail || "");
      setPickupAddress(booking.pickupAddress || "");
      setReturnAddress(booking.pickupAddress || "");
      setRego(`${booking.vehicleRegistration} (${booking.vehicleState})`);
      setMakeModel(`${booking.vehicleYear || ""} ${booking.vehicleModel || ""}`.trim());
      setColour(booking.vehicleColor || "");
      setTransmission(booking.transmissionType === "manual" ? "manual" : "auto");
      setWorkshopName(booking.garageName || "");
      setWorkshopAddress(booking.garageAddress || "");
      setDeclName(booking.userName || "");
      const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
      setDeclDate(fmt(new Date().toISOString()));
      setBookingDate(fmt(booking.createdAt));
      setServiceDate(fmt(booking.pickupTime));
      setReturnDate(fmt(booking.dropoffTime));
    }
  }, [isOpen, booking]);

  useEffect(() => {
    if (!isOpen) {
      setSuccess(false); setError(""); setSubmitting(false);
      setPrivacyAcknowledged(false); setCustomerSignature("");
      setClaimTypes([]); setNoticedWhen([]); setDamageStage([]); setEvidenceTypes([]); setContactPref([]);
    }
  }, [isOpen]);

  const validate = (): string | null => {
    if (!fullName.trim()) return "Full name is required";
    if (!mobile.trim()) return "Mobile number is required";
    if (!email.trim()) return "Email is required";
    if (!pickupAddress.trim()) return "Pick-up address is required";
    if (!returnAddress.trim()) return "Return address is required";
    if (!rego.trim()) return "Vehicle registration is required";
    if (!makeModel.trim()) return "Vehicle make/model is required";
    if (claimTypes.length === 0) return "Please select at least one claim type";
    if (!incidentDesc.trim()) return "Please describe the incident";
    if (!privacyAcknowledged) return "Please acknowledge the privacy notice";
    if (!declName.trim()) return "Declaration name is required";
    if (!customerSignature) return "Signature is required";
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/bookings/${booking._id}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType: "claim_lodgement",
          submittedByName: fullName.trim(),
          submittedByEmail: email.trim(),
          privacyAcknowledged,
          signatures: { customer: customerSignature },
          formData: {
            bookingId: booking._id, bookingDate, serviceDate, returnDate,
            fullName: fullName.trim(), mobile: mobile.trim(), email: email.trim(),
            contactPreferences: contactPref,
            pickupAddress: pickupAddress.trim(), returnAddress: returnAddress.trim(),
            rego: rego.trim(), makeModel: makeModel.trim(), colour: colour.trim(),
            odometer: odometer.trim(), transmission, under100k,
            workshopName: workshopName.trim(), workshopAddress: workshopAddress.trim(),
            workshopContact: workshopContact.trim(),
            claimTypes, whereOnVehicle: whereOnVehicle.trim(),
            estimatedLoss: estimate.trim(), preferredResolution: preferredResolution.trim(),
            summary: summary.trim(), noticedDatetime: noticedDatetime.trim(),
            policeInvolved, policeRef: policeRef.trim(),
            noticedWhen, damageStage,
            incidentDescription: incidentDesc.trim(), safeToDrive,
            evidenceTypesAttached: evidenceTypes,
            attachmentNotes: attachmentNotes.trim(), otherNotes: otherNotes.trim(),
            declName: declName.trim(), declDate: declDate.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit claim");
      setSuccess(true);
      setTimeout(() => onSuccess(), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit claim");
    } finally { setSubmitting(false); }
  };

  if (!isOpen) return null;

  const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50";
  const checkCls = "h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-amber-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <FileWarning className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Customer Claim Lodgement</h2>
                <p className="text-sm text-amber-100">{booking.vehicleRegistration} ({booking.vehicleState})</p>
              </div>
            </div>
            <button onClick={onClose} disabled={submitting} className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white disabled:opacity-50">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            {success ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <CheckCircle className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Claim Submitted</h3>
                <p className="mt-2 text-sm text-slate-600">Our team will review your claim and contact you within 2 business days.</p>
                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs text-amber-700">If your vehicle is unsafe to drive, call <strong>1300 470 886</strong> immediately.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-800">Claims relate to Drivlet transport/handling only. Workshop fees are paid directly by the customer. If the vehicle is unsafe to drive, call <strong>1300 470 886</strong>.</p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Booking Details */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">Booking Details</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Booking ID</label><input type="text" value={booking._id} disabled className={`${inputCls} !bg-slate-100 !text-slate-500`} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Booking Date</label><input type="text" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} disabled={submitting} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Service Date *</label><input type="text" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} disabled={submitting} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Return Date</label><input type="text" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} disabled={submitting} className={inputCls} /></div>
                  </div>
                </div>

                {/* Customer */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Phone className="h-4 w-4 text-amber-600" />Your Details</h3>
                  <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Full Name *</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={submitting} className={inputCls} /></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Mobile *</label><input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={submitting} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Email *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} className={inputCls} /></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Contact Preference</label>
                    <div className="flex gap-4">
                      {["Call", "SMS", "Email"].map((p) => (
                        <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="checkbox" checked={contactPref.includes(p.toLowerCase())} onChange={() => toggle(contactPref, setContactPref, p.toLowerCase())} disabled={submitting} className={checkCls} />{p}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Pick-up Address *</label><input type="text" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} disabled={submitting} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Return Address *</label><input type="text" value={returnAddress} onChange={(e) => setReturnAddress(e.target.value)} disabled={submitting} className={inputCls} /></div>
                  </div>
                </div>

                {/* Vehicle */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Car className="h-4 w-4 text-amber-600" />Vehicle Details</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Rego *</label><input type="text" value={rego} onChange={(e) => setRego(e.target.value)} disabled={submitting} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Make / Model *</label><input type="text" value={makeModel} onChange={(e) => setMakeModel(e.target.value)} disabled={submitting} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Colour</label><input type="text" value={colour} onChange={(e) => setColour(e.target.value)} disabled={submitting} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Odometer (approx.)</label><input type="text" value={odometer} onChange={(e) => setOdometer(e.target.value)} disabled={submitting} className={inputCls} /></div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Transmission</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="claim-trans" value="auto" checked={transmission === "auto"} onChange={() => setTransmission("auto")} disabled={submitting} className="h-4 w-4 text-amber-600 focus:ring-amber-500" />Auto</label>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="claim-trans" value="manual" checked={transmission === "manual"} onChange={() => setTransmission("manual")} disabled={submitting} className="h-4 w-4 text-amber-600 focus:ring-amber-500" />Manual</label>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Value under $100k?</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="claim-val" value="yes" checked={under100k === "yes"} onChange={() => setUnder100k("yes")} disabled={submitting} className="h-4 w-4 text-amber-600 focus:ring-amber-500" />Yes</label>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="claim-val" value="no" checked={under100k === "no"} onChange={() => setUnder100k("no")} disabled={submitting} className="h-4 w-4 text-amber-600 focus:ring-amber-500" />No</label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workshop */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Wrench className="h-4 w-4 text-amber-600" />Workshop</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Workshop Name</label><input type="text" value={workshopName} onChange={(e) => setWorkshopName(e.target.value)} disabled={submitting} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Workshop Contact</label><input type="text" value={workshopContact} onChange={(e) => setWorkshopContact(e.target.value)} disabled={submitting} className={inputCls} /></div>
                  </div>
                  <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Workshop Address</label><input type="text" value={workshopAddress} onChange={(e) => setWorkshopAddress(e.target.value)} disabled={submitting} className={inputCls} /></div>
                </div>

                {/* Claim Type */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2"><FileWarning className="h-4 w-4" />Claim Type *</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {CLAIM_TYPES.map((ct) => (
                      <label key={ct.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={claimTypes.includes(ct.key)} onChange={() => toggle(claimTypes, setClaimTypes, ct.key)} disabled={submitting} className={checkCls} />{ct.label}
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Where on the vehicle?</label><input type="text" value={whereOnVehicle} onChange={(e) => setWhereOnVehicle(e.target.value)} disabled={submitting} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Estimated loss/repair (AUD)</label><input type="text" value={estimate} onChange={(e) => setEstimate(e.target.value)} disabled={submitting} className={inputCls} /></div>
                  </div>
                  <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Preferred resolution</label><input type="text" value={preferredResolution} onChange={(e) => setPreferredResolution(e.target.value)} disabled={submitting} className={inputCls} /></div>
                  <div className="space-y-1"><label className="text-xs font-medium text-slate-600">One-line summary</label><input type="text" value={summary} onChange={(e) => setSummary(e.target.value)} disabled={submitting} className={inputCls} /></div>
                </div>

                {/* Incident Details */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">Incident Details</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Date/time noticed</label><input type="text" value={noticedDatetime} onChange={(e) => setNoticedDatetime(e.target.value)} disabled={submitting} className={inputCls} /></div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Police involved?</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="claim-police" value="yes" checked={policeInvolved === "yes"} onChange={() => setPoliceInvolved("yes")} disabled={submitting} className="h-4 w-4 text-amber-600 focus:ring-amber-500" />Yes</label>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="claim-police" value="no" checked={policeInvolved === "no"} onChange={() => setPoliceInvolved("no")} disabled={submitting} className="h-4 w-4 text-amber-600 focus:ring-amber-500" />No</label>
                      </div>
                    </div>
                  </div>
                  {policeInvolved === "yes" && (
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Police Reference No.</label><input type="text" value={policeRef} onChange={(e) => setPoliceRef(e.target.value)} disabled={submitting} className={inputCls} /></div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">When was the damage noticed?</label>
                    <div className="flex gap-4">
                      {NOTICED_OPTIONS.map((o) => (
                        <label key={o.key} className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="checkbox" checked={noticedWhen.includes(o.key)} onChange={() => toggle(noticedWhen, setNoticedWhen, o.key)} disabled={submitting} className={checkCls} />{o.label}</label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">At which stage did the damage likely occur?</label>
                    <div className="flex flex-wrap gap-4">
                      {STAGE_OPTIONS.map((o) => (
                        <label key={o.key} className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="checkbox" checked={damageStage.includes(o.key)} onChange={() => toggle(damageStage, setDamageStage, o.key)} disabled={submitting} className={checkCls} />{o.label}</label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Describe the incident *</label>
                    <textarea rows={4} placeholder="Include: what you observed, where on the vehicle, any pre-existing damage, and any relevant details." value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)} disabled={submitting} className={`${inputCls} resize-none`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Is the vehicle safe to drive?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="claim-safe" value="yes" checked={safeToDrive === "yes"} onChange={() => setSafeToDrive("yes")} disabled={submitting} className="h-4 w-4 text-amber-600 focus:ring-amber-500" />Yes, safe to drive</label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="claim-safe" value="no" checked={safeToDrive === "no"} onChange={() => setSafeToDrive("no")} disabled={submitting} className="h-4 w-4 text-red-600 focus:ring-red-500" />NOT safe to drive</label>
                    </div>
                  </div>
                </div>

                {/* Evidence */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Camera className="h-4 w-4 text-amber-600" />Evidence & Attachments</h3>
                  <p className="text-xs text-slate-500">Check the types of evidence you will provide. Email supporting documents to <strong>support@drivlet.com.au</strong>.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EVIDENCE_TYPES.map((ev) => (
                      <label key={ev.key} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={evidenceTypes.includes(ev.key)} onChange={() => toggle(evidenceTypes, setEvidenceTypes, ev.key)} disabled={submitting} className={checkCls} />{ev.label}</label>
                    ))}
                  </div>
                  <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Describe attachments</label><textarea rows={2} placeholder="Describe each attachment briefly." value={attachmentNotes} onChange={(e) => setAttachmentNotes(e.target.value)} disabled={submitting} className={`${inputCls} resize-none`} /></div>
                  <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Other notes</label><input type="text" value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} disabled={submitting} className={inputCls} /></div>
                </div>

                {/* Privacy & Declaration */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2"><Shield className="h-4 w-4" />Declaration & Privacy</h3>
                  <div className="text-xs text-amber-700 space-y-2">
                    <p>Nothing in this form limits your rights under Australian Consumer Law.</p>
                    <p>Drivlet maintains commercial insurance for its transport activities. This does not replace your own vehicle insurance.</p>
                    <p><strong>Privacy Collection Notice:</strong> We collect your personal details, vehicle details, claim details, signatures, evidence files you upload (if any), timestamps, and any information you provide in this form. We use this information to assess and manage your claim/dispute, keep records, and communicate with you. We may disclose relevant information to our employees/drivers, our insurers, the workshop (if relevant), and service providers who help operate our systems. See our <a href="https://drivlet.com.au/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline font-medium">Privacy Policy</a>.</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={privacyAcknowledged} onChange={(e) => setPrivacyAcknowledged(e.target.checked)} disabled={submitting} className="mt-1 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500" />
                    <span className="text-sm font-medium text-amber-800">I acknowledge the Privacy Collection Notice above. *</span>
                  </label>
                  <p className="text-xs text-amber-700">By signing digitally, you agree you intend to be legally bound by this form. Governing law: New South Wales, Australia.</p>
                </div>

                {/* Signature */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900">Signature</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Full Name *</label><input type="text" value={declName} onChange={(e) => setDeclName(e.target.value)} disabled={submitting} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-slate-600">Date *</label><input type="text" value={declDate} onChange={(e) => setDeclDate(e.target.value)} placeholder="dd/mm/yyyy" disabled={submitting} className={inputCls} /></div>
                  </div>
                  <SignaturePad id="claim-customer" label="Your Signature *" onChange={setCustomerSignature} value={customerSignature} disabled={submitting} />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                  <button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50">
                    {submitting ? (<span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Submitting...</span>) : "Submit Claim"}
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
