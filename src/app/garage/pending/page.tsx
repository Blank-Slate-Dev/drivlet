// src/app/garage/pending/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle,
  Mail,
  Phone,
  Building2,
  LogOut,
  RefreshCw,
} from "lucide-react";

export default function GaragePendingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      // If user is approved, redirect to dashboard
      if (session?.user?.isApproved && session?.user?.role === "garage") {
        router.push("/garage/dashboard");
      }
      // If user is not a garage role, redirect to appropriate page
      if (session?.user?.role !== "garage") {
        router.push("/");
      }
    }
  }, [session, status, router]);

  const handleCheckStatus = async () => {
    setChecking(true);
    // Force refresh the session
    window.location.reload();
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/garage/login" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
            Application Under Review
          </h1>

          {/* Description */}
          <p className="mt-4 text-center text-slate-600">
            Thank you for registering your garage with Drivlet! Our team is currently
            reviewing your application.
          </p>

          {/* Timeline */}
          <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              What happens next?
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-emerald-700">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold">
                  1
                </span>
                <span>Our team reviews your application (1-2 business days)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold">
                  2
                </span>
                <span>We verify your business details and insurance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold">
                  3
                </span>
                <span>You&apos;ll receive an email once approved</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold">
                  4
                </span>
                <span>Start accepting bookings through Drivlet!</span>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">
              Questions? Contact us
            </h3>
            <div className="space-y-2">
              <a
                href="mailto:partners@drivlet.com"
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 transition"
              >
                <Mail className="h-4 w-4" />
                partners@drivlet.com
              </a>
              <a
                href="tel:1300123456"
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 transition"
              >
                <Phone className="h-4 w-4" />
                1300 123 456
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              Check Application Status
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-8 text-center space-y-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition"
          >
            <Building2 className="h-4 w-4" />
            Back to Drivlet
          </Link>
        </div>
      </div>
    </div>
  );
}
