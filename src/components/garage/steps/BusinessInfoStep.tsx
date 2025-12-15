// src/components/garage/steps/BusinessInfoStep.tsx
"use client";

import { Building2, FileText, MapPin, Calendar, Wrench } from "lucide-react";

const AUSTRALIAN_STATES = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
];

const SERVICES = [
  { value: "mechanical", label: "Mechanical Repairs" },
  { value: "panel_beating", label: "Panel Beating" },
  { value: "detailing", label: "Detailing" },
  { value: "electrical", label: "Electrical" },
  { value: "tyres", label: "Tyres & Wheels" },
  { value: "aircon", label: "Air Conditioning" },
  { value: "other", label: "Other" },
];

interface BusinessInfoStepProps {
  data: {
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
  };
  onChange: (data: Partial<BusinessInfoStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function BusinessInfoStep({ data, onChange, errors }: BusinessInfoStepProps) {
  const handleAddressChange = (field: string, value: string) => {
    onChange({
      businessAddress: {
        ...data.businessAddress,
        [field]: value,
      },
    });
  };

  const handleServiceToggle = (service: string) => {
    const current = data.servicesOffered || [];
    const updated = current.includes(service)
      ? current.filter((s) => s !== service)
      : [...current, service];
    onChange({ servicesOffered: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Business Information</h3>
        <p className="mt-1 text-sm text-slate-600">
          Tell us about your automotive business.
        </p>
      </div>

      <div className="space-y-4">
        {/* Business Name */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-slate-700">
            Business Name <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              id="businessName"
              value={data.businessName}
              onChange={(e) => onChange({ businessName: e.target.value })}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors.businessName ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Your registered business name"
            />
          </div>
          {errors.businessName && (
            <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
          )}
        </div>

        {/* Trading Name */}
        <div>
          <label htmlFor="tradingName" className="block text-sm font-medium text-slate-700">
            Trading Name (if different)
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              id="tradingName"
              value={data.tradingName}
              onChange={(e) => onChange({ tradingName: e.target.value })}
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="Trading as (optional)"
            />
          </div>
        </div>

        {/* ABN */}
        <div>
          <label htmlFor="abn" className="block text-sm font-medium text-slate-700">
            ABN <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              id="abn"
              value={data.abn}
              onChange={(e) => onChange({ abn: e.target.value.replace(/[^0-9\s]/g, "") })}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors.abn ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="11 digit ABN"
              maxLength={14}
            />
          </div>
          {errors.abn && (
            <p className="mt-1 text-sm text-red-600">{errors.abn}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Your 11-digit Australian Business Number
          </p>
        </div>

        {/* Business Address */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Business Address <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={data.businessAddress.street}
              onChange={(e) => handleAddressChange("street", e.target.value)}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["businessAddress.street"] ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={data.businessAddress.suburb}
              onChange={(e) => handleAddressChange("suburb", e.target.value)}
              className={`block w-full px-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["businessAddress.suburb"] ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Suburb"
            />
            <input
              type="text"
              value={data.businessAddress.postcode}
              onChange={(e) => handleAddressChange("postcode", e.target.value.replace(/\D/g, ""))}
              className={`block w-full px-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["businessAddress.postcode"] ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Postcode"
              maxLength={4}
            />
          </div>

          <select
            value={data.businessAddress.state}
            onChange={(e) => handleAddressChange("state", e.target.value)}
            className={`block w-full px-3 py-3 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
              errors["businessAddress.state"] ? "border-red-300" : "border-slate-200"
            }`}
          >
            <option value="">Select state</option>
            {AUSTRALIAN_STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
          {errors.businessAddress && (
            <p className="mt-1 text-sm text-red-600">{errors.businessAddress}</p>
          )}
        </div>

        {/* Years in Operation */}
        <div>
          <label htmlFor="yearsInOperation" className="block text-sm font-medium text-slate-700">
            Years in Operation <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="number"
              id="yearsInOperation"
              min="0"
              value={data.yearsInOperation || ""}
              onChange={(e) => onChange({ yearsInOperation: parseInt(e.target.value) || 0 })}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors.yearsInOperation ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Number of years"
            />
          </div>
          {errors.yearsInOperation && (
            <p className="mt-1 text-sm text-red-600">{errors.yearsInOperation}</p>
          )}
        </div>

        {/* Services Offered */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-slate-400" />
              Services Offered <span className="text-red-500">*</span>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {SERVICES.map((service) => (
              <label
                key={service.value}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${
                  data.servicesOffered?.includes(service.value)
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={data.servicesOffered?.includes(service.value)}
                  onChange={() => handleServiceToggle(service.value)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                />
                <span className="text-sm text-slate-700">{service.label}</span>
              </label>
            ))}
          </div>
          {errors.servicesOffered && (
            <p className="mt-1 text-sm text-red-600">{errors.servicesOffered}</p>
          )}
        </div>
      </div>
    </div>
  );
}
