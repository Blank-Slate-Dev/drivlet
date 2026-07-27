// src/app/forgot-password/page.tsx
// Request a password reset email. One page for all account types
// (customers, drivers, admins); the same email flow covers everyone.
"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-slate-900">Check your inbox</h1>
              <p className="mt-2 text-sm text-slate-500">
                If an account exists for <span className="font-medium text-slate-700">{email.trim()}</span>,
                we&apos;ve sent a password reset link. It&apos;s valid for 1 hour.
              </p>
              <p className="mt-3 text-xs text-slate-400">
                Nothing arriving? Check your spam folder, or try again with the
                email you used to sign up.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900">Forgot your password?</h1>
              <p className="mt-1 text-sm text-slate-500">
                Enter the email you use for drivlet and we&apos;ll send you a link
                to reset it.
              </p>
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={submitting}
                      autoComplete="email"
                      className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                    />
                  </div>
                </div>
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send reset link
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-5 flex items-center justify-center gap-4 text-sm">
          <Link href="/login" className="inline-flex items-center gap-1 text-emerald-100 underline underline-offset-2 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Customer login
          </Link>
          <Link href="/driver/login" className="text-emerald-100 underline underline-offset-2 hover:text-white">
            Driver login
          </Link>
        </div>
      </div>
    </main>
  );
}
