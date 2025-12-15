// src/components/garage/StepIndicator.tsx
"use client";

import { Check } from "lucide-react";

interface Step {
  id: number;
  name: string;
  shortName: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      {/* Mobile view - simple progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-emerald-600">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-sm text-slate-600">
            {steps[currentStep - 1]?.name}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop view - step circles */}
      <ol className="hidden sm:flex items-center">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`relative ${index !== steps.length - 1 ? "flex-1" : ""}`}
          >
            <div className="flex items-center">
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  step.id < currentStep
                    ? "border-emerald-600 bg-emerald-600"
                    : step.id === currentStep
                    ? "border-emerald-600 bg-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="h-5 w-5 text-white" />
                ) : (
                  <span
                    className={`text-sm font-semibold ${
                      step.id === currentStep
                        ? "text-emerald-600"
                        : "text-slate-500"
                    }`}
                  >
                    {step.id}
                  </span>
                )}
              </div>
              {index !== steps.length - 1 && (
                <div
                  className={`h-0.5 w-full mx-2 transition-all ${
                    step.id < currentStep ? "bg-emerald-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
            <div className="mt-2">
              <span
                className={`text-xs font-medium ${
                  step.id === currentStep
                    ? "text-emerald-600"
                    : step.id < currentStep
                    ? "text-slate-600"
                    : "text-slate-400"
                }`}
              >
                {step.shortName}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
