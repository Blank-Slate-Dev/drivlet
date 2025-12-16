// src/components/driver/steps/PersonalInfoStep.tsx
"use client";

import { User, Phone, MapPin, Calendar, Heart } from "lucide-react";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

const RELATIONSHIPS = [
  "Spouse",
  "Partner",
  "Parent",
  "Sibling",
  "Child",
  "Friend",
  "Other",
];

interface PersonalInfoStepProps {
  data: {
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
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  onChange: (data: Partial<PersonalInfoStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function PersonalInfoStep({
  data,
  onChange,
  errors,
}: PersonalInfoStepProps) {
  const handleAddressChange = (field: string, value: string) => {
    onChange({
      address: {
        ...data.address,
        [field]: value,
      },
    });
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    onChange({
      emergencyContact: {
        ...data.emergencyContact,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>
        <p className="mt-1 text-sm text-slate-600">
          Tell us about yourself. This information will be used for verification.
        </p>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">
            First Name <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              id="firstName"
              value={data.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors.firstName ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="John"
            />
          </div>
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">
            Last Name <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              id="lastName"
              value={data.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors.lastName ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Smith"
            />
          </div>
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Date of Birth & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-700">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="date"
              id="dateOfBirth"
              value={data.dateOfBirth}
              onChange={(e) => onChange({ dateOfBirth: e.target.value })}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors.dateOfBirth ? "border-red-300" : "border-slate-200"
              }`}
            />
          </div>
          {errors.dateOfBirth && (
            <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            You must be at least 18 years old
          </p>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="tel"
              id="phone"
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors.phone ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="04XX XXX XXX"
            />
          </div>
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>
      </div>

      {/* Address Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Home Address
        </h4>

        <div>
          <label htmlFor="street" className="block text-sm font-medium text-slate-700">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="street"
            value={data.address.street}
            onChange={(e) => handleAddressChange("street", e.target.value)}
            className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
              errors["address.street"] ? "border-red-300" : "border-slate-200"
            }`}
            placeholder="123 Main Street"
          />
          {errors["address.street"] && (
            <p className="mt-1 text-sm text-red-600">{errors["address.street"]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2 sm:col-span-2">
            <label htmlFor="suburb" className="block text-sm font-medium text-slate-700">
              Suburb <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="suburb"
              value={data.address.suburb}
              onChange={(e) => handleAddressChange("suburb", e.target.value)}
              className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["address.suburb"] ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Sydney"
            />
            {errors["address.suburb"] && (
              <p className="mt-1 text-sm text-red-600">{errors["address.suburb"]}</p>
            )}
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-slate-700">
              State <span className="text-red-500">*</span>
            </label>
            <select
              id="state"
              value={data.address.state}
              onChange={(e) => handleAddressChange("state", e.target.value)}
              className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["address.state"] ? "border-red-300" : "border-slate-200"
              }`}
            >
              <option value="">Select</option>
              {STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {errors["address.state"] && (
              <p className="mt-1 text-sm text-red-600">{errors["address.state"]}</p>
            )}
          </div>

          <div>
            <label htmlFor="postcode" className="block text-sm font-medium text-slate-700">
              Postcode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="postcode"
              value={data.address.postcode}
              onChange={(e) => handleAddressChange("postcode", e.target.value)}
              maxLength={4}
              className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["address.postcode"] ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="2000"
            />
            {errors["address.postcode"] && (
              <p className="mt-1 text-sm text-red-600">{errors["address.postcode"]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Contact Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Emergency Contact
        </h4>
        <p className="text-sm text-slate-500">
          Someone we can contact in case of an emergency.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="emergencyName"
              className="block text-sm font-medium text-slate-700"
            >
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="emergencyName"
              value={data.emergencyContact.name}
              onChange={(e) => handleEmergencyContactChange("name", e.target.value)}
              className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["emergencyContact.name"] ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Jane Smith"
            />
            {errors["emergencyContact.name"] && (
              <p className="mt-1 text-sm text-red-600">
                {errors["emergencyContact.name"]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="emergencyRelationship"
              className="block text-sm font-medium text-slate-700"
            >
              Relationship <span className="text-red-500">*</span>
            </label>
            <select
              id="emergencyRelationship"
              value={data.emergencyContact.relationship}
              onChange={(e) =>
                handleEmergencyContactChange("relationship", e.target.value)
              }
              className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["emergencyContact.relationship"]
                  ? "border-red-300"
                  : "border-slate-200"
              }`}
            >
              <option value="">Select relationship</option>
              {RELATIONSHIPS.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
            {errors["emergencyContact.relationship"] && (
              <p className="mt-1 text-sm text-red-600">
                {errors["emergencyContact.relationship"]}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="emergencyPhone"
            className="block text-sm font-medium text-slate-700"
          >
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="tel"
              id="emergencyPhone"
              value={data.emergencyContact.phone}
              onChange={(e) => handleEmergencyContactChange("phone", e.target.value)}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["emergencyContact.phone"] ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="04XX XXX XXX"
            />
          </div>
          {errors["emergencyContact.phone"] && (
            <p className="mt-1 text-sm text-red-600">
              {errors["emergencyContact.phone"]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
