// src/components/garage/steps/OperationalStep.tsx
"use client";

import { Clock, Warehouse, Car, CalendarCheck } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const VEHICLE_TYPES = [
  { value: "sedan", label: "Sedans" },
  { value: "suv", label: "SUVs" },
  { value: "ute", label: "Utes" },
  { value: "truck", label: "Trucks" },
  { value: "motorcycle", label: "Motorcycles" },
  { value: "electric", label: "Electric Vehicles" },
  { value: "hybrid", label: "Hybrid Vehicles" },
  { value: "commercial", label: "Commercial Vehicles" },
];

const APPOINTMENT_POLICIES = [
  { value: "walk_ins", label: "Walk-ins Welcome" },
  { value: "appointment_only", label: "Appointment Only" },
  { value: "both", label: "Both Walk-ins & Appointments" },
];

interface OperatingHoursDay {
  open: string;
  close: string;
  closed: boolean;
}

interface OperationalStepProps {
  data: {
    operatingHours: Record<string, OperatingHoursDay>;
    serviceBays: number;
    vehicleTypes: string[];
    averageTurnaroundTimes: {
      standardService: string;
      majorService: string;
      logbookService: string;
      other: string;
    };
    appointmentPolicy: string;
  };
  onChange: (data: Partial<OperationalStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function OperationalStep({ data, onChange, errors }: OperationalStepProps) {
  const handleHoursChange = (day: string, field: string, value: string | boolean) => {
    onChange({
      operatingHours: {
        ...data.operatingHours,
        [day]: {
          ...data.operatingHours[day],
          [field]: value,
        },
      },
    });
  };

  const handleVehicleTypeToggle = (type: string) => {
    const current = data.vehicleTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onChange({ vehicleTypes: updated });
  };

  const handleTurnaroundChange = (field: string, value: string) => {
    onChange({
      averageTurnaroundTimes: {
        ...data.averageTurnaroundTimes,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Operational Capacity</h3>
        <p className="mt-1 text-sm text-slate-600">
          Tell us about your garage&apos;s operational details.
        </p>
      </div>

      {/* Operating Hours */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-slate-400" />
            Operating Hours
          </div>
        </label>
        <div className="space-y-2">
          {DAYS.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
            >
              <span className="w-24 text-sm font-medium text-slate-700">{label}</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.operatingHours[key]?.closed}
                  onChange={(e) => handleHoursChange(key, "closed", e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                />
                <span className="text-sm text-slate-600">Closed</span>
              </label>
              {!data.operatingHours[key]?.closed && (
                <>
                  <input
                    type="time"
                    value={data.operatingHours[key]?.open || "08:00"}
                    onChange={(e) => handleHoursChange(key, "open", e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="time"
                    value={data.operatingHours[key]?.close || "17:00"}
                    onChange={(e) => handleHoursChange(key, "close", e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Service Bays */}
      <div>
        <label htmlFor="serviceBays" className="block text-sm font-medium text-slate-700">
          <div className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-slate-400" />
            Number of Service Bays <span className="text-red-500">*</span>
          </div>
        </label>
        <div className="mt-1">
          <input
            type="number"
            id="serviceBays"
            min="1"
            value={data.serviceBays || ""}
            onChange={(e) => onChange({ serviceBays: parseInt(e.target.value) || 0 })}
            className={`block w-full px-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
              errors.serviceBays ? "border-red-300" : "border-slate-200"
            }`}
            placeholder="Number of bays"
          />
        </div>
        {errors.serviceBays && (
          <p className="mt-1 text-sm text-red-600">{errors.serviceBays}</p>
        )}
      </div>

      {/* Vehicle Types */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-slate-400" />
            Vehicle Types Serviced <span className="text-red-500">*</span>
          </div>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {VEHICLE_TYPES.map((type) => (
            <label
              key={type.value}
              className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${
                data.vehicleTypes?.includes(type.value)
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={data.vehicleTypes?.includes(type.value)}
                onChange={() => handleVehicleTypeToggle(type.value)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
              />
              <span className="text-sm text-slate-700">{type.label}</span>
            </label>
          ))}
        </div>
        {errors.vehicleTypes && (
          <p className="mt-1 text-sm text-red-600">{errors.vehicleTypes}</p>
        )}
      </div>

      {/* Average Turnaround Times */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Average Turnaround Times (Optional)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              type="text"
              value={data.averageTurnaroundTimes?.standardService || ""}
              onChange={(e) => handleTurnaroundChange("standardService", e.target.value)}
              className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="Standard service (e.g., 2 hours)"
            />
          </div>
          <div>
            <input
              type="text"
              value={data.averageTurnaroundTimes?.majorService || ""}
              onChange={(e) => handleTurnaroundChange("majorService", e.target.value)}
              className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="Major service (e.g., 4 hours)"
            />
          </div>
          <div>
            <input
              type="text"
              value={data.averageTurnaroundTimes?.logbookService || ""}
              onChange={(e) => handleTurnaroundChange("logbookService", e.target.value)}
              className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="Logbook service (e.g., 3 hours)"
            />
          </div>
          <div>
            <input
              type="text"
              value={data.averageTurnaroundTimes?.other || ""}
              onChange={(e) => handleTurnaroundChange("other", e.target.value)}
              className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="Other services"
            />
          </div>
        </div>
      </div>

      {/* Appointment Policy */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-slate-400" />
            Appointment Policy <span className="text-red-500">*</span>
          </div>
        </label>
        <div className="space-y-2">
          {APPOINTMENT_POLICIES.map((policy) => (
            <label
              key={policy.value}
              className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${
                data.appointmentPolicy === policy.value
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="appointmentPolicy"
                value={policy.value}
                checked={data.appointmentPolicy === policy.value}
                onChange={(e) => onChange({ appointmentPolicy: e.target.value })}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="text-sm text-slate-700">{policy.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
