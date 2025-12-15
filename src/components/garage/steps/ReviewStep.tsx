// src/components/garage/steps/ReviewStep.tsx
"use client";

import {
  Building2,
  User,
  Clock,
  MapPin,
  Shield,
  CreditCard,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface ReviewStepProps {
  data: {
    email: string;
    businessName: string;
    tradingName: string;
    abn: string;
    businessAddress: {
      street: string;
      suburb: string;
      state: string;
      postcode: string;
    };
    yearsInOperation: number;
    servicesOffered: string[];
    primaryContact: {
      name: string;
      role: string;
      phone: string;
      email: string;
    };
    operatingHours: Record<string, { open: string; close: string; closed: boolean }>;
    serviceBays: number;
    vehicleTypes: string[];
    appointmentPolicy: string;
    serviceRadius: number;
    pickupDropoff: {
      available: boolean;
      additionalFee?: number;
      maxDistance?: number;
    };
    publicLiabilityInsurance: {
      provider: string;
      policyNumber: string;
      expiryDate: string;
      coverAmount: number;
    };
    certifications: string[];
    paymentTerms: string;
    bankDetails: {
      accountName: string;
      bsb: string;
      accountNumber: string;
    };
    gstRegistered: boolean;
  };
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  errors: Record<string, string>;
}

const SERVICE_LABELS: Record<string, string> = {
  mechanical: "Mechanical Repairs",
  panel_beating: "Panel Beating",
  detailing: "Detailing",
  electrical: "Electrical",
  tyres: "Tyres & Wheels",
  aircon: "Air Conditioning",
  other: "Other",
};

const VEHICLE_LABELS: Record<string, string> = {
  sedan: "Sedans",
  suv: "SUVs",
  ute: "Utes",
  truck: "Trucks",
  motorcycle: "Motorcycles",
  electric: "Electric Vehicles",
  hybrid: "Hybrid Vehicles",
  commercial: "Commercial Vehicles",
};

const PAYMENT_LABELS: Record<string, string> = {
  immediate: "Immediate",
  "7_days": "7 Days",
  "14_days": "14 Days",
  "30_days": "30 Days",
};

const POLICY_LABELS: Record<string, string> = {
  walk_ins: "Walk-ins Welcome",
  appointment_only: "Appointment Only",
  both: "Both Walk-ins & Appointments",
};

export default function ReviewStep({
  data,
  termsAccepted,
  onTermsChange,
  errors,
}: ReviewStepProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maskAccountNumber = (num: string) => {
    if (num.length <= 4) return num;
    return "•".repeat(num.length - 4) + num.slice(-4);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Review Your Application</h3>
        <p className="mt-1 text-sm text-slate-600">
          Please review all the information before submitting your application.
        </p>
      </div>

      {/* Business Information */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-emerald-600" />
          <h4 className="text-sm font-semibold text-slate-800">Business Information</h4>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Business Name</span>
              <p className="font-medium text-slate-900">{data.businessName}</p>
            </div>
            {data.tradingName && (
              <div>
                <span className="text-slate-500">Trading Name</span>
                <p className="font-medium text-slate-900">{data.tradingName}</p>
              </div>
            )}
            <div>
              <span className="text-slate-500">ABN</span>
              <p className="font-medium text-slate-900">{data.abn}</p>
            </div>
            <div>
              <span className="text-slate-500">Years in Operation</span>
              <p className="font-medium text-slate-900">{data.yearsInOperation} years</p>
            </div>
          </div>
          <div>
            <span className="text-sm text-slate-500">Address</span>
            <p className="text-sm font-medium text-slate-900">
              {data.businessAddress.street}, {data.businessAddress.suburb},{" "}
              {data.businessAddress.state} {data.businessAddress.postcode}
            </p>
          </div>
          <div>
            <span className="text-sm text-slate-500">Services Offered</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.servicesOffered?.map((service) => (
                <span
                  key={service}
                  className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full"
                >
                  {SERVICE_LABELS[service] || service}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 flex items-center gap-2">
          <User className="h-5 w-5 text-emerald-600" />
          <h4 className="text-sm font-semibold text-slate-800">Contact Information</h4>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Account Email</span>
              <p className="font-medium text-slate-900">{data.email}</p>
            </div>
            <div>
              <span className="text-slate-500">Primary Contact</span>
              <p className="font-medium text-slate-900">{data.primaryContact.name}</p>
              <p className="text-slate-600">{data.primaryContact.role}</p>
            </div>
            <div>
              <span className="text-slate-500">Phone</span>
              <p className="font-medium text-slate-900">{data.primaryContact.phone}</p>
            </div>
            <div>
              <span className="text-slate-500">Contact Email</span>
              <p className="font-medium text-slate-900">{data.primaryContact.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Details */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-emerald-600" />
          <h4 className="text-sm font-semibold text-slate-800">Operational Details</h4>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Service Bays</span>
              <p className="font-medium text-slate-900">{data.serviceBays} bays</p>
            </div>
            <div>
              <span className="text-slate-500">Appointment Policy</span>
              <p className="font-medium text-slate-900">
                {POLICY_LABELS[data.appointmentPolicy] || data.appointmentPolicy}
              </p>
            </div>
          </div>
          <div>
            <span className="text-sm text-slate-500">Vehicle Types</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.vehicleTypes?.map((type) => (
                <span
                  key={type}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {VEHICLE_LABELS[type] || type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Service Coverage */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-600" />
          <h4 className="text-sm font-semibold text-slate-800">Service Coverage</h4>
        </div>
        <div className="p-4 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500">Service Radius</span>
              <p className="font-medium text-slate-900">{data.serviceRadius} km</p>
            </div>
            <div>
              <span className="text-slate-500">Pickup/Drop-off</span>
              <p className="font-medium text-slate-900">
                {data.pickupDropoff?.available ? "Available" : "Not Available"}
              </p>
            </div>
          </div>
          {data.pickupDropoff?.available && (
            <div className="grid grid-cols-2 gap-3">
              {data.pickupDropoff.additionalFee !== undefined && (
                <div>
                  <span className="text-slate-500">Additional Fee</span>
                  <p className="font-medium text-slate-900">
                    {data.pickupDropoff.additionalFee === 0
                      ? "Free"
                      : formatCurrency(data.pickupDropoff.additionalFee)}
                  </p>
                </div>
              )}
              {data.pickupDropoff.maxDistance && (
                <div>
                  <span className="text-slate-500">Max Distance</span>
                  <p className="font-medium text-slate-900">
                    {data.pickupDropoff.maxDistance} km
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Insurance */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          <h4 className="text-sm font-semibold text-slate-800">Insurance & Compliance</h4>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div>
            <span className="text-slate-500">Public Liability Insurance</span>
            <p className="font-medium text-slate-900">
              {data.publicLiabilityInsurance.provider} - {formatCurrency(data.publicLiabilityInsurance.coverAmount)}
            </p>
            <p className="text-slate-600">
              Policy: {data.publicLiabilityInsurance.policyNumber} | Expires:{" "}
              {new Date(data.publicLiabilityInsurance.expiryDate).toLocaleDateString("en-AU")}
            </p>
          </div>
          {data.certifications?.length > 0 && (
            <div>
              <span className="text-slate-500">Certifications</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.certifications.map((cert, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                  >
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <h4 className="text-sm font-semibold text-slate-800">Payment Details</h4>
        </div>
        <div className="p-4 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500">Payment Terms</span>
              <p className="font-medium text-slate-900">
                {PAYMENT_LABELS[data.paymentTerms] || data.paymentTerms}
              </p>
            </div>
            <div>
              <span className="text-slate-500">GST Registered</span>
              <p className="font-medium text-slate-900">
                {data.gstRegistered ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Account Name</span>
              <p className="font-medium text-slate-900">{data.bankDetails.accountName}</p>
            </div>
            <div>
              <span className="text-slate-500">Bank Account</span>
              <p className="font-medium text-slate-900">
                BSB: {data.bankDetails.bsb} | Acc: {maskAccountNumber(data.bankDetails.accountNumber)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="space-y-4">
        <label
          className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition ${
            termsAccepted
              ? "border-emerald-500 bg-emerald-50"
              : errors.terms
              ? "border-red-300 bg-red-50"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => onTermsChange(e.target.checked)}
            className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
          />
          <div className="text-sm">
            <p className="font-medium text-slate-900">
              I agree to the Terms and Conditions <span className="text-red-500">*</span>
            </p>
            <p className="text-slate-600 mt-1">
              By checking this box, I confirm that all information provided is accurate and I agree to
              Drivlet&apos;s{" "}
              <a href="/terms" className="text-emerald-600 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-emerald-600 hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </label>
        {errors.terms && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.terms}
          </p>
        )}
      </div>

      {/* Info Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
        <CheckCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-amber-800">What happens next?</h4>
          <p className="text-sm text-amber-700 mt-1">
            After submitting, our team will review your application within 1-2 business days.
            You&apos;ll receive an email notification once your garage is approved and you can start
            accepting bookings through Drivlet.
          </p>
        </div>
      </div>
    </div>
  );
}
