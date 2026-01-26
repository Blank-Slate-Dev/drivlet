// src/app/auth/verify/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function VerifySuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  // Auto-redirect to dashboard after 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-center">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white mb-4"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Email Verified!</h1>
            <p className="mt-2 text-emerald-100">
              Your account is now active
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <p className="text-slate-600 mb-6">
              Thank you for verifying your email address. Your account is now fully activated and you can start using Drivlet.
            </p>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition"
            >
              Go to your dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>

            <p className="mt-4 text-sm text-slate-500">
              Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
            </p>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Need help?{" "}
                <Link
                  href="/contact"
                  className="font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Contact support
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="hover:text-emerald-600 transition">
            &larr; Back to home
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
