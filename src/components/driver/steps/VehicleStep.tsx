// src/components/driver/steps/VehicleStep.tsx
"use client";

import { Car, Calendar, Shield, FileText } from "lucide-react";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

interface VehicleStepProps {
  data: {
    hasOwnVehicle: boolean;
    vehicle: {
      make: string;
      model: string;
      year: string;
      color: string;
      registration: string;
      registrationState: string;
      registrationExpiry: string;
      insuranceProvider: string;
      insurancePolicyNumber: string;
      insuranceExpiry: string;
    };
  };
  onChange: (data: Partial<VehicleStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function VehicleStep({ data, onChange, errors }: VehicleStepProps) {
  const handleVehicleChange = (field: string, value: string) => {
    onChange({
      vehicle: {
        ...data.vehicle,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Vehicle Information</h3>
        <p className="mt-1 text-sm text-slate-600">
          Let us know if you have your own vehicle. This is optional - you can use
          company vehicles for pickups.
        </p>
      </div>

      {/* Toggle */}
      <div className="p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Car className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900">I have my own vehicle</h4>
              <p className="text-sm text-slate-500">
                Use your own car for pickups and deliveries
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ hasOwnVehicle: !data.hasOwnVehicle })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              data.hasOwnVehicle ? "bg-emerald-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                data.hasOwnVehicle ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {!data.hasOwnVehicle && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h4 className="text-sm font-semibold text-blue-800">No worries!</h4>
          <p className="mt-1 text-sm text-blue-700">
            You can still work as a Drivlet driver without your own vehicle. You&apos;ll
            be assigned jobs where you transport customers&apos; cars between locations
            using our pool vehicles or public transport to get to pickups.
          </p>
        </div>
      )}

      {data.hasOwnVehicle && (
        <div className="space-y-6">
          {/* Vehicle Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
              Vehicle Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="make"
                  className="block text-sm font-medium text-slate-700"
                >
                  Make <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="make"
                  value={data.vehicle.make}
                  onChange={(e) => handleVehicleChange("make", e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                    errors["vehicle.make"] ? "border-red-300" : "border-slate-200"
                  }`}
                  placeholder="e.g., Toyota"
                />
                {errors["vehicle.make"] && (
                  <p className="mt-1 text-sm text-red-600">{errors["vehicle.make"]}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="model"
                  className="block text-sm font-medium text-slate-700"
                >
                  Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="model"
                  value={data.vehicle.model}
                  onChange={(e) => handleVehicleChange("model", e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                    errors["vehicle.model"] ? "border-red-300" : "border-slate-200"
                  }`}
                  placeholder="e.g., Corolla"
                />
                {errors["vehicle.model"] && (
                  <p className="mt-1 text-sm text-red-600">{errors["vehicle.model"]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="year"
                  className="block text-sm font-medium text-slate-700"
                >
                  Year <span className="text-red-500">*</span>
                </label>
                <select
                  id="year"
                  value={data.vehicle.year}
                  onChange={(e) => handleVehicleChange("year", e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                    errors["vehicle.year"] ? "border-red-300" : "border-slate-200"
                  }`}
                >
                  <option value="">Select year</option>
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                {errors["vehicle.year"] && (
                  <p className="mt-1 text-sm text-red-600">{errors["vehicle.year"]}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="color"
                  className="block text-sm font-medium text-slate-700"
                >
                  Color
                </label>
                <input
                  type="text"
                  id="color"
                  value={data.vehicle.color}
                  onChange={(e) => handleVehicleChange("color", e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  placeholder="e.g., White"
                />
              </div>
            </div>
          </div>

          {/* Registration Details */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Registration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="registration"
                  className="block text-sm font-medium text-slate-700"
                >
                  Plate Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="registration"
                  value={data.vehicle.registration}
                  onChange={(e) =>
                    handleVehicleChange("registration", e.target.value.toUpperCase())
                  }
                  className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                    errors["vehicle.registration"]
                      ? "border-red-300"
                      : "border-slate-200"
                  }`}
                  placeholder="ABC123"
                />
                {errors["vehicle.registration"] && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors["vehicle.registration"]}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="registrationState"
                  className="block text-sm font-medium text-slate-700"
                >
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  id="registrationState"
                  value={data.vehicle.registrationState}
                  onChange={(e) =>
                    handleVehicleChange("registrationState", e.target.value)
                  }
                  className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                    errors["vehicle.registrationState"]
                      ? "border-red-300"
                      : "border-slate-200"
                  }`}
                >
                  <option value="">Select</option>
                  {STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="registrationExpiry"
                  className="block text-sm font-medium text-slate-700"
                >
                  Expiry <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    id="registrationExpiry"
                    value={data.vehicle.registrationExpiry}
                    onChange={(e) =>
                      handleVehicleChange("registrationExpiry", e.target.value)
                    }
                    min={new Date().toISOString().split("T")[0]}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                      errors["vehicle.registrationExpiry"]
                        ? "border-red-300"
                        : "border-slate-200"
                    }`}
                  />
                </div>
                {errors["vehicle.registrationExpiry"] && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors["vehicle.registrationExpiry"]}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Insurance Details */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Insurance (Optional)
            </h4>
            <p className="text-sm text-slate-500">
              Comprehensive insurance is recommended if using your own vehicle.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="insuranceProvider"
                  className="block text-sm font-medium text-slate-700"
                >
                  Insurance Provider
                </label>
                <input
                  type="text"
                  id="insuranceProvider"
                  value={data.vehicle.insuranceProvider}
                  onChange={(e) =>
                    handleVehicleChange("insuranceProvider", e.target.value)
                  }
                  className="mt-1 block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  placeholder="e.g., NRMA"
                />
              </div>

              <div>
                <label
                  htmlFor="insurancePolicyNumber"
                  className="block text-sm font-medium text-slate-700"
                >
                  Policy Number
                </label>
                <input
                  type="text"
                  id="insurancePolicyNumber"
                  value={data.vehicle.insurancePolicyNumber}
                  onChange={(e) =>
                    handleVehicleChange("insurancePolicyNumber", e.target.value)
                  }
                  className="mt-1 block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  placeholder="Policy number"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="insuranceExpiry"
                className="block text-sm font-medium text-slate-700"
              >
                Insurance Expiry
              </label>
              <div className="mt-1 relative sm:w-1/2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="date"
                  id="insuranceExpiry"
                  value={data.vehicle.insuranceExpiry}
                  onChange={(e) =>
                    handleVehicleChange("insuranceExpiry", e.target.value)
                  }
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
