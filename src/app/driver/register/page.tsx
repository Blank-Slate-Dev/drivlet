// src/app/driver/register/page.tsx
"use client";

import Link from "next/link";
import { Car } from "lucide-react";
import DriverRegistrationForm from "@/components/driver/RegistrationForm";

export default function DriverRegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 shadow-lg">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Drivlet</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Become a Drivlet Driver
          </h1>
          <p className="mt-2 text-slate-600">
            Join our team and earn money delivering cars for service appointments.
          </p>
        </div>

        {/* Benefits Banner */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <div className="text-2xl font-bold text-emerald-600">$25-35</div>
            <div className="text-sm text-slate-600">Per delivery</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <div className="text-2xl font-bold text-emerald-600">Flexible</div>
            <div className="text-sm text-slate-600">Set your own hours</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <div className="text-2xl font-bold text-emerald-600">Weekly</div>
            <div className="text-sm text-slate-600">Pay deposits</div>
          </div>
        </div>

        {/* Registration Form */}
        <DriverRegistrationForm />

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/driver/login"
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
