// src/components/driver/steps/ReviewStep.tsx
"use client";

import {
  User,
  Mail,
  Phone,
  FileText,
  Car,
  Clock,
  CreditCard,
  Heart,
  AlertCircle,
} from "lucide-react";

interface ReviewStepProps {
  data: {
    email: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phone: string;
    address: {
      street: string;
      suburb: string;
      state: string;
      postcode: string;
    };
    license: {
      number: string;
      state: string;
      class: string;
      expiryDate: string;
    };
    hasOwnVehicle: boolean;
    vehicle: {
      make: string;
      model: string;
      year: string;
      color: string;
      registration: string;
    };
    availability: Record<string, { available: boolean; startTime: string; endTime: string }>;
    maxJobsPerDay: number;
    employmentType: string;
    bankDetails: {
      accountName: string;
      bsb: string;
      accountNumber: string;
    };
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  errors: Record<string, string>;
}

export default function ReviewStep({
  data,
  termsAccepted,
  onTermsChange,
  errors,
}: ReviewStepProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const availableDays = Object.entries(data.availability)
    .filter(([, value]) => value.available)
    .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Review Your Application</h3>
        <p className="mt-1 text-sm text-slate-600">
          Please review all your details before submitting. You can go back to any step
          to make changes.
        </p>
      </div>

      {/* Account Section */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-800">
          <Mail className="h-4 w-4" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">Account</h4>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Email</span>
            <span className="text-slate-900 font-medium">{data.email}</span>
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-800">
          <User className="h-4 w-4" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">
            Personal Information
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Name</span>
            <span className="text-slate-900 font-medium">
              {data.firstName} {data.lastName}
            </span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Date of Birth</span>
            <span className="text-slate-900 font-medium">
              {formatDate(data.dateOfBirth)}
            </span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Phone</span>
            <span className="text-slate-900 font-medium">{data.phone}</span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Address</span>
            <span className="text-slate-900 font-medium">
              {data.address.suburb}, {data.address.state} {data.address.postcode}
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Contact Section */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-800">
          <Heart className="h-4 w-4" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">
            Emergency Contact
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Name</span>
            <span className="text-slate-900 font-medium">
              {data.emergencyContact.name}
            </span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Relationship</span>
            <span className="text-slate-900 font-medium">
              {data.emergencyContact.relationship}
            </span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Phone</span>
            <span className="text-slate-900 font-medium">
              {data.emergencyContact.phone}
            </span>
          </div>
        </div>
      </div>

      {/* License Section */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-800">
          <FileText className="h-4 w-4" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">
            License Details
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">License Number</span>
            <span className="text-slate-900 font-medium">{data.license.number}</span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">State</span>
            <span className="text-slate-900 font-medium">{data.license.state}</span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Class</span>
            <span className="text-slate-900 font-medium">{data.license.class}</span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Expiry</span>
            <span className="text-slate-900 font-medium">
              {formatDate(data.license.expiryDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Vehicle Section */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-800">
          <Car className="h-4 w-4" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">Vehicle</h4>
        </div>
        {data.hasOwnVehicle ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between sm:flex-col sm:gap-0">
              <span className="text-slate-500">Vehicle</span>
              <span className="text-slate-900 font-medium">
                {data.vehicle.year} {data.vehicle.make} {data.vehicle.model}
              </span>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-0">
              <span className="text-slate-500">Registration</span>
              <span className="text-slate-900 font-medium">
                {data.vehicle.registration}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            No personal vehicle - will use customer vehicles or company pool
          </p>
        )}
      </div>

      {/* Availability Section */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-800">
          <Clock className="h-4 w-4" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">Availability</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Available Days</span>
            <span className="text-slate-900 font-medium">
              {availableDays.length > 0 ? availableDays.join(", ") : "None selected"}
            </span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Max Jobs/Day</span>
            <span className="text-slate-900 font-medium">{data.maxJobsPerDay}</span>
          </div>
        </div>
      </div>

      {/* Banking Section */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-800">
          <CreditCard className="h-4 w-4" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">
            Banking & Employment
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Employment Type</span>
            <span className="text-slate-900 font-medium capitalize">
              {data.employmentType}
            </span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Account Name</span>
            <span className="text-slate-900 font-medium">
              {data.bankDetails.accountName}
            </span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">BSB</span>
            <span className="text-slate-900 font-medium">{data.bankDetails.bsb}</span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0">
            <span className="text-slate-500">Account Number</span>
            <span className="text-slate-900 font-medium">
              ****{data.bankDetails.accountNumber.slice(-4)}
            </span>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-semibold text-amber-800">Before you submit</h5>
              <p className="mt-1 text-sm text-amber-700">
                Please ensure all information is accurate. Providing false information may
                result in your application being rejected.
              </p>
            </div>
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border-2 transition cursor-pointer ${
            termsAccepted
              ? "bg-emerald-50 border-emerald-300"
              : errors.terms
              ? "bg-red-50 border-red-300"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
          onClick={() => onTermsChange(!termsAccepted)}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="flex items-center h-5 mt-0.5">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => onTermsChange(e.target.checked)}
                className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
            </div>
            <div className="text-sm">
              <span className="text-slate-700">
                I confirm that all information provided is accurate and complete. I agree
                to the{" "}
                <a
                  href="/terms"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </a>
                . I understand that my application will be reviewed and I will be notified
                of the outcome.
              </span>
            </div>
          </label>
        </div>
        {errors.terms && (
          <p className="text-sm text-red-600">{errors.terms}</p>
        )}
      </div>

      {/* What happens next */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h4 className="text-sm font-semibold text-blue-800">What happens next?</h4>
        <ul className="mt-2 space-y-1 text-sm text-blue-700">
          <li>• Your application will be reviewed within 1-2 business days</li>
          <li>• We&apos;ll verify your license and run necessary checks</li>
          <li>• You&apos;ll receive an email notification when approved</li>
          <li>• Once approved, you can start accepting jobs immediately</li>
        </ul>
      </div>
    </div>
  );
}
