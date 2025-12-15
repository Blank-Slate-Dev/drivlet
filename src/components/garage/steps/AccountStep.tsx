// src/components/garage/steps/AccountStep.tsx
"use client";

import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface AccountStepProps {
  data: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  onChange: (data: Partial<AccountStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function AccountStep({ data, onChange, errors }: AccountStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Create Your Account</h3>
        <p className="mt-1 text-sm text-slate-600">
          Set up your login credentials for your garage partner account.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email address <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="email"
              id="email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors.email ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="garage@example.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={data.password}
              onChange={(e) => onChange({ password: e.target.value })}
              className={`block w-full pl-10 pr-10 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors.password ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Minimum 6 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              ) : (
                <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Password must be at least 6 characters long
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              value={data.confirmPassword}
              onChange={(e) => onChange({ confirmPassword: e.target.value })}
              className={`block w-full pl-10 pr-10 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors.confirmPassword ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              ) : (
                <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>
      </div>
    </div>
  );
}
