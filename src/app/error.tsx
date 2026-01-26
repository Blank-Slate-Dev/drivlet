// src/app/error.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            <p className="mt-2 text-red-100">
              We encountered an unexpected error
            </p>
          </div>

          <div className="p-8 space-y-4">
            <p className="text-slate-600">
              Don&apos;t worry, this is usually temporary. Try refreshing the page or going back to the home page.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => reset()}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <Link
                href="/"
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
