// src/app/auth/verify/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  // Get error message based on error code
  useEffect(() => {
    if (error) {
      switch (error) {
        case "missing_token":
          setMessage("Verification link is invalid. Please request a new one.");
          setMessageType("error");
          break;
        case "invalid_token":
          setMessage("This verification link has expired or is invalid. Please request a new one.");
          setMessageType("error");
          break;
        case "server_error":
          setMessage("Something went wrong. Please try again.");
          setMessageType("error");
          break;
        default:
          setMessage("An error occurred. Please try again.");
          setMessageType("error");
      }
    }
  }, [error]);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage("Please enter your email address");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.alreadyVerified) {
        setMessage("Your email is already verified. You can sign in now.");
        setMessageType("success");
      } else if (data.success) {
        setMessage("Verification email sent! Please check your inbox.");
        setMessageType("success");
      } else {
        setMessage(data.error || "Failed to send verification email");
        setMessageType("error");
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Check your email</h1>
            <p className="mt-2 text-emerald-100">
              We&apos;ve sent you a verification link
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {!error && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-sm text-emerald-800">
                  Please check your email inbox and click the verification link to activate your account.
                  The link will expire in 24 hours.
                </p>
              </div>
            )}

            {message && (
              <div
                className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                  messageType === "success"
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {messageType === "success" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    messageType === "success" ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {message}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Didn&apos;t receive the email? Enter your email address to resend the verification link.
              </p>

              <form onSubmit={handleResendVerification} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Resend verification email
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-600">
                Already verified?{" "}
                <Link
                  href="/login"
                  className="font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Sign in
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
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </main>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
