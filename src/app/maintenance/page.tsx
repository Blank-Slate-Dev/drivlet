// src/app/maintenance/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Wrench, ArrowLeft, Mail, Clock } from "lucide-react";
import { useState } from "react";

export default function MaintenancePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just show success. Later you can hook this up to your email list.
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 flex items-center justify-center px-4">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-8 text-center">
            {/* Logo */}
            <Link href="/" className="inline-block mb-6">
              <div className="relative h-12 w-40 mx-auto">
                <Image src="/logo.png" alt="drivlet" fill className="object-contain" priority />
              </div>
            </Link>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6"
            >
              <Wrench className="h-10 w-10 text-emerald-600" />
            </motion.div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Coming Soon
            </h1>
            <p className="text-slate-500">
              We&apos;re working hard to bring you something great. This feature will be available soon!
            </p>
          </div>

          {/* Notify me form */}
          <div className="px-6 pb-8">
            {!submitted ? (
              <form onSubmit={handleNotify} className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                  <Clock className="h-4 w-4" />
                  Want to know when it&apos;s ready?
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition"
                  >
                    Notify Me
                  </button>
                </div>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center"
              >
                <p className="text-emerald-700 font-medium">Thanks! We&apos;ll let you know.</p>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
