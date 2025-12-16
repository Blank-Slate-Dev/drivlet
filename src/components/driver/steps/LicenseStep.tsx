// src/components/driver/steps/LicenseStep.tsx
"use client";

import { FileText, Calendar, MapPin } from "lucide-react";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

const LICENSE_CLASSES = [
  { value: "C", label: "C - Car" },
  { value: "LR", label: "LR - Light Rigid" },
  { value: "MR", label: "MR - Medium Rigid" },
  { value: "HR", label: "HR - Heavy Rigid" },
  { value: "HC", label: "HC - Heavy Combination" },
  { value: "MC", label: "MC - Multi Combination" },
];

interface LicenseStepProps {
  data: {
    license: {
      number: string;
      state: string;
      class: string;
      expiryDate: string;
    };
  };
  onChange: (data: Partial<LicenseStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function LicenseStep({ data, onChange, errors }: LicenseStepProps) {
  const handleLicenseChange = (field: string, value: string) => {
    onChange({
      license: {
        ...data.license,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">License Details</h3>
        <p className="mt-1 text-sm text-slate-600">
          We need your driver&apos;s license information for verification. Make sure your
          license is current and valid.
        </p>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h4 className="text-sm font-semibold text-blue-800">Requirements</h4>
        <ul className="mt-2 text-sm text-blue-700 space-y-1">
          <li>• Must hold a valid Australian driver&apos;s license</li>
          <li>• License must not be expired</li>
          <li>• Class C (Car) license minimum required</li>
          <li>• Must be at least 18 years old</li>
        </ul>
      </div>

      <div className="space-y-4">
        {/* License Number */}
        <div>
          <label
            htmlFor="licenseNumber"
            className="block text-sm font-medium text-slate-700"
          >
            License Number <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              id="licenseNumber"
              value={data.license.number}
              onChange={(e) =>
                handleLicenseChange("number", e.target.value.toUpperCase())
              }
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["license.number"] ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="e.g., 12345678"
            />
          </div>
          {errors["license.number"] && (
            <p className="mt-1 text-sm text-red-600">{errors["license.number"]}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Enter your license number exactly as it appears on your license
          </p>
        </div>

        {/* State & Class */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="licenseState"
              className="block text-sm font-medium text-slate-700"
            >
              Issuing State <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              <select
                id="licenseState"
                value={data.license.state}
                onChange={(e) => handleLicenseChange("state", e.target.value)}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                  errors["license.state"] ? "border-red-300" : "border-slate-200"
                }`}
              >
                <option value="">Select state</option>
                {STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            {errors["license.state"] && (
              <p className="mt-1 text-sm text-red-600">{errors["license.state"]}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="licenseClass"
              className="block text-sm font-medium text-slate-700"
            >
              License Class <span className="text-red-500">*</span>
            </label>
            <select
              id="licenseClass"
              value={data.license.class}
              onChange={(e) => handleLicenseChange("class", e.target.value)}
              className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["license.class"] ? "border-red-300" : "border-slate-200"
              }`}
            >
              {LICENSE_CLASSES.map((lc) => (
                <option key={lc.value} value={lc.value}>
                  {lc.label}
                </option>
              ))}
            </select>
            {errors["license.class"] && (
              <p className="mt-1 text-sm text-red-600">{errors["license.class"]}</p>
            )}
          </div>
        </div>

        {/* Expiry Date */}
        <div>
          <label
            htmlFor="licenseExpiry"
            className="block text-sm font-medium text-slate-700"
          >
            Expiry Date <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="date"
              id="licenseExpiry"
              value={data.license.expiryDate}
              onChange={(e) => handleLicenseChange("expiryDate", e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["license.expiryDate"] ? "border-red-300" : "border-slate-200"
              }`}
            />
          </div>
          {errors["license.expiryDate"] && (
            <p className="mt-1 text-sm text-red-600">{errors["license.expiryDate"]}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Your license must be valid and not expired
          </p>
        </div>
      </div>

      {/* Document Upload Info */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <h4 className="text-sm font-semibold text-amber-800">Coming Soon</h4>
        <p className="mt-1 text-sm text-amber-700">
          We&apos;ll soon add the ability to upload a photo of your license for faster
          verification. For now, our team will verify your details manually.
        </p>
      </div>
    </div>
  );
}
