// src/components/garage/steps/CoverageStep.tsx
"use client";

import { MapPin, Truck, DollarSign } from "lucide-react";

interface CoverageStepProps {
  data: {
    serviceRadius: number;
    pickupDropoff: {
      available: boolean;
      additionalFee: number;
      maxDistance: number;
    };
  };
  onChange: (data: Partial<CoverageStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function CoverageStep({ data, onChange, errors }: CoverageStepProps) {
  const handlePickupDropoffChange = (field: string, value: boolean | number) => {
    onChange({
      pickupDropoff: {
        ...data.pickupDropoff,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Service Coverage</h3>
        <p className="mt-1 text-sm text-slate-600">
          Define your service area and pickup/drop-off options.
        </p>
      </div>

      {/* Service Radius */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-slate-400" />
            Service Radius <span className="text-red-500">*</span>
          </div>
        </label>
        <div className="space-y-3">
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={data.serviceRadius || 15}
            onChange={(e) => onChange({ serviceRadius: parseInt(e.target.value) })}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>5 km</span>
            <span className="text-emerald-600 font-semibold text-sm">
              {data.serviceRadius || 15} km
            </span>
            <span>50 km</span>
          </div>
        </div>
        {errors.serviceRadius && (
          <p className="mt-1 text-sm text-red-600">{errors.serviceRadius}</p>
        )}
        <p className="mt-2 text-sm text-slate-500">
          This defines how far customers can be from your garage to use your services through Drivlet.
        </p>
      </div>

      {/* Pickup/Drop-off */}
      <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              Offer Pickup & Drop-off Service
            </span>
          </label>
          <button
            type="button"
            onClick={() => handlePickupDropoffChange("available", !data.pickupDropoff?.available)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              data.pickupDropoff?.available ? "bg-emerald-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                data.pickupDropoff?.available ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {data.pickupDropoff?.available && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Configure your pickup and drop-off service options.
            </p>

            {/* Additional Fee */}
            <div>
              <label htmlFor="additionalFee" className="block text-sm font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  Additional Fee (Optional)
                </div>
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400">$</span>
                </div>
                <input
                  type="number"
                  id="additionalFee"
                  min="0"
                  step="5"
                  value={data.pickupDropoff.additionalFee || ""}
                  onChange={(e) =>
                    handlePickupDropoffChange("additionalFee", parseFloat(e.target.value) || 0)
                  }
                  className="block w-full pl-8 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  placeholder="0 for free pickup"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Leave blank or enter 0 for free pickup/drop-off
              </p>
            </div>

            {/* Max Distance */}
            <div>
              <label htmlFor="maxDistance" className="block text-sm font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  Maximum Distance (km)
                </div>
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  id="maxDistance"
                  min="1"
                  value={data.pickupDropoff.maxDistance || ""}
                  onChange={(e) =>
                    handlePickupDropoffChange("maxDistance", parseInt(e.target.value) || 0)
                  }
                  className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  placeholder="Maximum km for pickup/drop-off"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Maximum distance you&apos;re willing to travel for pickup/drop-off
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
        <h4 className="text-sm font-semibold text-emerald-800 mb-2">
          Why Service Coverage Matters
        </h4>
        <p className="text-sm text-emerald-700">
          Drivlet connects customers with garages based on location. A larger service radius
          means more potential customers, but consider your capacity to handle the demand
          and any travel time for pickup/drop-off services.
        </p>
      </div>
    </div>
  );
}
