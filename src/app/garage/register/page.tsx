// src/app/garage/register/page.tsx
"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import RegistrationForm from "@/components/garage/RegistrationForm";

export default function GarageRegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Drivlet</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Partner with Drivlet
          </h1>
          <p className="mt-2 text-slate-600">
            Register your garage and start receiving bookings from customers in your area.
          </p>
        </div>

        {/* Registration Form */}
        <RegistrationForm />

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/garage/login"
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
