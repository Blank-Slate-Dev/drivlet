// src/app/auth/verify/page.tsx
"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mail, AlertCircle, CheckCircle2, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlCode = searchParams.get("code");

  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendMessageType, setResendMessageType] = useState<"success" | "error" | "">("");
  const [showResend, setShowResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasAutoSubmitted = useRef(false);

  // Handle verification API call
  const handleVerify = useCallback(async (codeString: string) => {
    if (codeString.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeString }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setLoggingIn(true);

        // Auto-login using the token
        const signInResult = await signIn("credentials", {
          autoLoginToken: data.autoLoginToken,
          redirect: false,
        });

        if (signInResult?.ok) {
          // Successfully logged in, redirect to dashboard
          router.push("/dashboard");
        } else {
          // Verification worked but auto-login failed, redirect to login
          console.log("Auto-login failed, redirecting to login");
          router.push("/login?verified=true");
        }
      } else {
        setError(data.error || "Verification failed. Please try again.");
        setShowResend(true);
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setShowResend(true);
      setLoading(false);
    }
  }, [router]);

  // Auto-fill from URL and auto-submit
  useEffect(() => {
    if (urlCode && urlCode.length === 6 && /^\d{6}$/.test(urlCode) && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      setCode(urlCode.split(""));
      // Auto-submit after a brief delay to show the code
      setTimeout(() => handleVerify(urlCode), 500);
    }
  }, [urlCode, handleVerify]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === 5) {
      const fullCode = newCode.join("");
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newCode[i] = pasted[i];
      }
      setCode(newCode);

      // Focus the next empty input or the last one
      const nextEmptyIndex = newCode.findIndex((c) => !c);
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[5]?.focus();
        // Auto-submit if all 6 digits were pasted
        if (pasted.length === 6) {
          handleVerify(pasted);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      const fullCode = code.join("");
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleResendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) {
      setResendMessage("Please enter your email address");
      setResendMessageType("error");
      return;
    }

    setResendLoading(true);
    setResendMessage("");
    setResendMessageType("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await res.json();

      if (data.alreadyVerified) {
        setResendMessage("Your email is already verified. You can sign in now.");
        setResendMessageType("success");
      } else if (data.success) {
        setResendMessage("New verification code sent! Please check your inbox.");
        setResendMessageType("success");
        // Clear the code inputs for new entry
        setCode(["", "", "", "", "", ""]);
        setError("");
        inputRefs.current[0]?.focus();
      } else {
        setResendMessage(data.error || "Failed to send verification code");
        setResendMessageType("error");
      }
    } catch {
      setResendMessage("Something went wrong. Please try again.");
      setResendMessageType("error");
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-center">
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
              <p className="mt-2 text-emerald-100">Your account is now active</p>
            </div>
            <div className="p-8">
              <p className="text-slate-600 mb-4">
                {loggingIn ? "Logging you in..." : "Email verified successfully!"}
              </p>
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
            </div>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Enter verification code</h1>
            <p className="mt-2 text-emerald-100">
              We&apos;ve sent a 6-digit code to your email
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Code Input */}
            <div className="mb-6">
              <div className="flex justify-center gap-2 sm:gap-3">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loading}
                    className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      error
                        ? "border-red-300 bg-red-50"
                        : digit
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-300 bg-white"
                    }`}
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl flex items-start gap-3 bg-red-50 border border-red-200">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Verify Button */}
            <button
              onClick={() => handleVerify(code.join(""))}
              disabled={loading || code.join("").length !== 6}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify Email
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Resend Section */}
            <div className={`mt-6 pt-6 border-t border-slate-200 ${showResend ? "" : ""}`}>
              <button
                onClick={() => setShowResend(!showResend)}
                className="w-full text-sm text-slate-600 hover:text-emerald-600 flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="h-4 w-4" />
                Didn&apos;t receive the code? Resend it
              </button>

              {showResend && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 space-y-4"
                >
                  {resendMessage && (
                    <div
                      className={`p-3 rounded-xl flex items-start gap-3 ${
                        resendMessageType === "success"
                          ? "bg-emerald-50 border border-emerald-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      {resendMessageType === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <p
                        className={`text-sm ${
                          resendMessageType === "success" ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {resendMessage}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleResendCode} className="space-y-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={resendLoading}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                      {resendLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Resend Code
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 text-center">
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
