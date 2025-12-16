// src/components/driver/steps/AvailabilityStep.tsx
"use client";

import { Clock, MapPin, Briefcase } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const TIME_OPTIONS = [
  "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30", "22:00",
];

interface AvailabilityStepProps {
  data: {
    availability: Record<string, { available: boolean; startTime: string; endTime: string }>;
    maxJobsPerDay: number;
    preferredAreas: string[];
  };
  onChange: (data: Partial<AvailabilityStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function AvailabilityStep({
  data,
  onChange,
  errors,
}: AvailabilityStepProps) {
  const handleDayToggle = (day: string) => {
    onChange({
      availability: {
        ...data.availability,
        [day]: {
          ...data.availability[day],
          available: !data.availability[day].available,
        },
      },
    });
  };

  const handleTimeChange = (day: string, field: "startTime" | "endTime", value: string) => {
    onChange({
      availability: {
        ...data.availability,
        [day]: {
          ...data.availability[day],
          [field]: value,
        },
      },
    });
  };

  const handlePreferredAreasChange = (value: string) => {
    // Split by comma and clean up
    const areas = value.split(",").map((area) => area.trim());
    onChange({ preferredAreas: areas.filter(Boolean) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Your Availability</h3>
        <p className="mt-1 text-sm text-slate-600">
          Set your weekly availability. You can change this anytime from your dashboard.
        </p>
      </div>

      {/* Weekly Schedule */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Weekly Schedule
        </h4>

        {errors.availability && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{errors.availability}</p>
          </div>
        )}

        <div className="space-y-3">
          {DAYS.map(({ key, label }) => (
            <div
              key={key}
              className={`p-4 rounded-xl border transition ${
                data.availability[key]?.available
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDayToggle(key)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      data.availability[key]?.available
                        ? "bg-emerald-600"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        data.availability[key]?.available
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span
                    className={`font-medium ${
                      data.availability[key]?.available
                        ? "text-slate-900"
                        : "text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {data.availability[key]?.available && (
                  <div className="flex items-center gap-2">
                    <select
                      value={data.availability[key]?.startTime || "07:00"}
                      onChange={(e) => handleTimeChange(key, "startTime", e.target.value)}
                      className="px-3 py-1.5 text-sm border border-emerald-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    <span className="text-slate-500">to</span>
                    <select
                      value={data.availability[key]?.endTime || "18:00"}
                      onChange={(e) => handleTimeChange(key, "endTime", e.target.value)}
                      className="px-3 py-1.5 text-sm border border-emerald-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Max Jobs Per Day */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Job Preferences
        </h4>

        <div>
          <label
            htmlFor="maxJobs"
            className="block text-sm font-medium text-slate-700"
          >
            Maximum jobs per day
          </label>
          <div className="mt-1 flex items-center gap-4">
            <input
              type="range"
              id="maxJobs"
              min="1"
              max="20"
              value={data.maxJobsPerDay}
              onChange={(e) =>
                onChange({ maxJobsPerDay: parseInt(e.target.value) })
              }
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <span className="w-12 text-center font-medium text-slate-900 bg-slate-100 rounded-lg py-1">
              {data.maxJobsPerDay}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            We&apos;ll try not to assign you more than this many jobs in a day.
          </p>
        </div>
      </div>

      {/* Preferred Areas */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Preferred Areas (Optional)
        </h4>

        <div>
          <label
            htmlFor="preferredAreas"
            className="block text-sm font-medium text-slate-700"
          >
            Suburbs or postcodes you prefer to work in
          </label>
          <input
            type="text"
            id="preferredAreas"
            value={data.preferredAreas.join(", ")}
            onChange={(e) => handlePreferredAreasChange(e.target.value)}
            className="mt-1 block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            placeholder="e.g., Sydney CBD, Parramatta, 2000, 2150"
          />
          <p className="mt-1 text-xs text-slate-500">
            Enter suburbs or postcodes separated by commas. Leave blank to accept jobs
            anywhere.
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h4 className="text-sm font-semibold text-blue-800">Flexibility</h4>
        <p className="mt-1 text-sm text-blue-700">
          You&apos;re in control! You can always update your availability and preferences
          from your driver dashboard. We&apos;ll notify you of available jobs matching
          your schedule.
        </p>
      </div>
    </div>
  );
}
