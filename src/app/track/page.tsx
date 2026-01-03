// src/app/track/page.tsx
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  Search,
  Car,
  Clock,
  MapPin,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  Mail,
  CreditCard,
  XCircle,
  Package,
  Wrench,
  Truck,
  Home,
  Lock,
  Sparkles,
  Wifi,
  WifiOff,
  Camera,
} from "lucide-react";

import RegistrationPlate, { StateCode } from "@/components/homepage/RegistrationPlate";
import GuestPhotosViewer from "@/components/tracking/GuestPhotosViewer";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Hook for animated counting - counts up smoothly when target changes
function useAnimatedCounter(targetValue: number, duration: number = 800) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const animationRef = useRef<number | null>(null);
  const currentValueRef = useRef(targetValue);

  useEffect(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = currentValueRef.current;
    const difference = targetValue - startValue;

    // If no change, just ensure we're at the right value
    if (difference === 0) {
      setDisplayValue(targetValue);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic curve for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newValue = Math.round(startValue + difference * easeOut);

      currentValueRef.current = newValue;
      setDisplayValue(newValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at target
        currentValueRef.current = targetValue;
        setDisplayValue(targetValue);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount or when target changes
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration]);

  return displayValue;
}

// Simplified stages for visual display
const DISPLAY_STAGES = [
  { id: "confirmed", label: "Confirmed", icon: CheckCircle2, keys: ["booking_confirmed"] },
  { id: "pickup", label: "Picked Up", icon: Car, keys: ["driver_en_route", "car_picked_up"] },
  { id: "service", label: "At Service", icon: Wrench, keys: ["at_garage", "service_in_progress", "awaiting_payment"] },
  { id: "returning", label: "Returning", icon: Truck, keys: ["ready_for_return", "driver_returning"] },
  { id: "delivered", label: "Delivered", icon: Home, keys: ["delivered"] },
];

interface Update {
  stage: string;
  timestamp: string;
  message: string;
  updatedBy: string;
}

interface Booking {
  _id: string;
  vehicleRegistration: string;
  vehicleState: string;
  serviceType: string;
  pickupAddress: string;
  pickupTime: string;
  dropoffTime: string;
  currentStage: string;
  overallProgress: number;
  status: string;
  hasExistingBooking: boolean;
  garageName?: string;
  paymentStatus?: string;
  servicePaymentAmount?: number;
  servicePaymentUrl?: string;
  servicePaymentStatus?: string;
  updates: Update[];
  createdAt: string;
  updatedAt: string;
  cancellation?: {
    cancelledAt: string;
    reason?: string;
    refundAmount: number;
    refundPercentage: number;
    refundStatus: "pending" | "succeeded" | "failed" | "not_applicable";
  };
}

function getDisplayStageIndex(currentStage: string): number {
  for (let i = 0; i < DISPLAY_STAGES.length; i++) {
    if (DISPLAY_STAGES[i].keys.includes(currentStage)) {
      return i;
    }
  }
  return 0;
}

// Embedded Payment Form Component
function ServicePaymentForm({
  onSuccess,
  onError,
  amount,
}: {
  onSuccess: () => void;
  onError: (error: string) => void;
  amount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?type=service`,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message || "Payment failed");
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        onReady={() => setIsReady(true)}
        options={{
          layout: "tabs",
        }}
      />
      <button
        type="submit"
        disabled={!stripe || isProcessing || !isReady}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : !isReady ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <Lock className="h-5 w-5" />
            Pay ${(amount / 100).toFixed(2)} AUD
          </>
        )}
      </button>
      <p className="text-center text-xs text-slate-500">
        <Lock className="mr-1 inline h-3 w-3" />
        Secure payment powered by Stripe
      </p>
    </form>
  );
}

function TrackingContent() {
  const searchParams = useSearchParams();
  const [trackingCode, setTrackingCode] = useState(searchParams.get('code') || '');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // SSE connection state
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Photo viewer state
  const [showPhotos, setShowPhotos] = useState(false);

  // Animated progress counter
  const currentDisplayIndex = booking ? getDisplayStageIndex(booking.currentStage) : 0;
  const animatedProgress = useAnimatedCounter(booking?.overallProgress || 0, 800);

  // Connect to SSE for real-time updates
  const connectSSE = (bookingId: string, code: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/bookings/${bookingId}/stream?code=${encodeURIComponent(code)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connected');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('SSE connection confirmed for booking:', data.bookingId);
        } else if (data.type === 'heartbeat') {
          console.log('SSE heartbeat received');
        } else if (data.type === 'update') {
          console.log('SSE update received:', data);
          // Update booking state with new data (including payment info)
          setBooking(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              currentStage: data.currentStage,
              overallProgress: data.overallProgress,
              status: data.status,
              servicePaymentStatus: data.servicePaymentStatus,
              servicePaymentAmount: data.servicePaymentAmount,
              servicePaymentUrl: data.servicePaymentUrl,
              updatedAt: data.updatedAt,
              updates: data.latestUpdate
                ? [...prev.updates.filter(u => u.timestamp !== data.latestUpdate.timestamp), data.latestUpdate]
                : prev.updates,
            };
          });

          // If payment status changed to paid, clear payment success flag
          if (data.servicePaymentStatus === 'paid') {
            setPaymentSuccess(false);
          }
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setIsConnected(false);
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (booking && email && registration) {
          connectSSE(booking._id, email, registration);
        }
      }, 5000);
    };
  };

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Load saved credentials on mount and auto-search
  useEffect(() => {
    const loadBooking = async () => {
      // Priority: URL params > localStorage
      const codeParam = searchParams.get("code");

      if (codeParam && codeParam.length === 6) {
        setTrackingCode(codeParam);
        localStorage.setItem("drivlet_track_code", codeParam);
        await handleSearch(codeParam);
      } else {
        const savedCode = localStorage.getItem("drivlet_track_code");
        if (savedCode && savedCode.length === 6) {
          setTrackingCode(savedCode);
          await handleSearch(savedCode);
        }
      }
      setInitialLoading(false);
    };

    loadBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = async (code?: string) => {
    const codeToSearch = code || trackingCode;

    if (!codeToSearch || codeToSearch.length !== 6) {
      setError("Please enter a valid 6-character tracking code");
      return;
    }

    setLoading(true);
    setError("");
    setIsExpired(false);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/bookings/track?code=${encodeURIComponent(codeToSearch)}`);
      const data = await response.json();

      if (response.ok) {
        setBooking(data);
        // Save tracking code for refresh persistence
        localStorage.setItem("drivlet_track_code", codeToSearch);
        // Only reset payment UI if this is a fresh search (not a refresh after payment)
        if (!paymentSuccess) {
          setShowPayment(false);
          setClientSecret(null);
        }
        // If DB now shows paid, we can clear our local success state
        if (data.servicePaymentStatus === "paid") {
          setPaymentSuccess(false);
        }

        // Connect to SSE for real-time updates
        connectSSE(data._id, codeToSearch);
      } else {
        if (response.status === 410) {
          // Booking expired (completed or cancelled)
          setIsExpired(true);
        }
        setError(data.error || "Booking not found");
        setBooking(null);
      }
    } catch {
      setError("Failed to search. Please try again.");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const initiatePayment = async () => {
    if (!booking) return;

    setPaymentLoading(true);
    setPaymentError("");

    try {
      const response = await fetch("/api/stripe/create-service-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking._id }),
      });

      const data = await response.json();

      if (response.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowPayment(true);
      } else {
        setPaymentError(data.error || "Failed to initialize payment");
      }
    } catch {
      setPaymentError("Failed to connect to payment service");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setPaymentSuccess(true);
    setShowPayment(false);
    setPaymentError("");

    // Immediately confirm payment with our server (verifies with Stripe directly)
    if (booking?._id) {
      try {
        const confirmResponse = await fetch(`/api/bookings/${booking._id}/confirm-service-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const confirmData = await confirmResponse.json();

        if (confirmData.success) {
          // Update local booking state immediately
          setBooking(prev => prev ? {
            ...prev,
            servicePaymentStatus: 'paid',
            currentStage: 'ready_for_return',
            overallProgress: 85,
          } : null);
          setPaymentSuccess(false); // DB confirmed, show the DB banner instead
          return;
        }
      } catch (err) {
        console.error('Failed to confirm payment:', err);
      }
    }

    // SSE will handle the update automatically, but fall back to polling if needed
    const pollForUpdate = async (attempts: number) => {
      if (attempts <= 0) return;

      try {
        const response = await fetch("/api/bookings/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, registration }),
        });
        const data = await response.json();

        if (response.ok) {
          setBooking(data.booking);
          if (data.booking.servicePaymentStatus === "paid") {
            setPaymentSuccess(false);
            return;
          }
        }
      } catch {
        // Ignore errors during polling
      }

      setTimeout(() => pollForUpdate(attempts - 1), 2000);
    };

    setTimeout(() => pollForUpdate(5), 2000);
  };

  const handlePaymentError = (error: string) => {
    setPaymentError(error);
  };

  const handleTrackAnother = () => {
    // Close SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setBooking(null);
    setHasSearched(false);
    setEmail("");
    setRegistration("");
    setPaymentSuccess(false);
    // Clear saved credentials
    localStorage.removeItem("drivlet_track_email");
    localStorage.removeItem("drivlet_track_rego");
  };

  const needsPayment =
    booking &&
    booking.servicePaymentAmount &&
    booking.servicePaymentStatus === "pending" &&
    !paymentSuccess;

  // Show loading during initial auto-search
  if (initialLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
          <p className="text-white/80 mt-3">Loading your booking...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 relative">
      {/* Subtle pattern */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-12 w-40 sm:h-14 sm:w-48">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain brightness-0 invert"
                priority
              />
            </div>
          </Link>

          {/* Connection status indicator */}
          {booking && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              isConnected
                ? 'bg-emerald-500/20 text-emerald-100'
                : 'bg-amber-500/20 text-amber-100'
            }`}>
              {isConnected ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  Reconnecting...
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                <Package className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Track Your Booking
              </h1>
              <p className="text-slate-600 mt-2">
                Enter your 6-character tracking code
              </p>
            </div>

            {/* Search Form - only show if no booking found yet */}
            <AnimatePresence mode="wait">
              {!booking ? (
                <motion.div
                  key="search"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${
                        isExpired
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      {isExpired ? (
                        <CheckCircle2 className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <p className={`text-sm ${isExpired ? 'text-amber-700' : 'text-red-600'}`}>{error}</p>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label
                        htmlFor="trackingCode"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Tracking Code
                      </label>
                      <div className="relative">
                        <input
                          id="trackingCode"
                          type="text"
                          value={trackingCode}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                            setTrackingCode(value);
                            setError('');
                            setIsExpired(false);
                          }}
                          required
                          maxLength={6}
                          className="w-full px-4 py-3.5 text-center text-2xl font-mono tracking-[0.5em] uppercase rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                          placeholder="e.g. ABC123"
                          autoComplete="off"
                          autoFocus
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {trackingCode.length}/6
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 text-center">
                        Your tracking code was sent to your email after booking
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || trackingCode.length !== 6}
                      className="group w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-5 w-5" />
                          Track Booking
                          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>

                    {/* Help Text */}
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-500 text-center">
                        Can't find your tracking code?{' '}
                        <Link href="/#contact" className="text-emerald-600 hover:underline">
                          Contact support
                        </Link>
                      </p>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Vehicle Info Header */}
                  <div className="flex justify-center pb-4 border-b border-slate-200">
                    <div className="transform scale-[0.85] origin-center">
                      <RegistrationPlate
                        plate={booking.vehicleRegistration}
                        state={booking.vehicleState as StateCode}
                      />
                    </div>
                  </div>

                  {/* Payment Success Banner */}
                  {paymentSuccess && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold">Payment Successful!</p>
                          <p className="text-sm text-emerald-100">
                            Your car is on its way back to you
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Payment Required Section */}
                  {needsPayment && !showPayment && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 p-5 text-white"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold">Your car is ready!</p>
                          <p className="text-sm text-teal-100">Pay to get it delivered back</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          ${((booking.servicePaymentAmount || 0) / 100).toFixed(2)}
                        </span>
                        <button
                          onClick={initiatePayment}
                          disabled={paymentLoading}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-600 shadow-lg transition hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {paymentLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          {paymentLoading ? "Loading..." : "Pay Now"}
                        </button>
                      </div>
                      {paymentError && (
                        <p className="mt-3 text-sm text-red-200 bg-red-500/20 rounded-lg px-3 py-2">
                          {paymentError}
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* Embedded Payment Form */}
                  {showPayment && clientSecret && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="h-5 w-5 text-emerald-600" />
                        <span className="font-semibold text-slate-900">
                          Pay ${((booking.servicePaymentAmount || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          appearance: {
                            theme: "stripe",
                            variables: {
                              colorPrimary: "#059669",
                              colorBackground: "#ffffff",
                              colorText: "#1e293b",
                              colorDanger: "#ef4444",
                              fontFamily: "system-ui, sans-serif",
                              borderRadius: "12px",
                            },
                          },
                        }}
                      >
                        <ServicePaymentForm
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                          amount={booking.servicePaymentAmount || 0}
                        />
                      </Elements>
                      <button
                        onClick={() => setShowPayment(false)}
                        className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  )}

                  {/* Payment Completed Banner (from previous session) */}
                  {booking.servicePaymentStatus === "paid" &&
                    booking.currentStage !== "delivered" &&
                    !paymentSuccess && (
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold">Payment Received!</p>
                            <p className="text-sm text-emerald-100">
                              Your car is on its way back to you
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                  {/* Cancelled State */}
                  {booking.status === "cancelled" && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                      <div className="flex items-center gap-3 text-red-700">
                        <XCircle className="h-5 w-5" />
                        <div>
                          <p className="font-semibold">Booking Cancelled</p>
                          {booking.cancellation?.reason && (
                            <p className="text-sm text-red-600">{booking.cancellation.reason}</p>
                          )}
                        </div>
                      </div>
                      {booking.cancellation && booking.cancellation.refundAmount > 0 && (
                        <p className="mt-2 text-sm text-red-600">
                          Refund: ${(booking.cancellation.refundAmount / 100).toFixed(2)}
                          {booking.cancellation.refundStatus === "succeeded" && " ✓ Processed"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Progress Section */}
                  {booking.status !== "cancelled" && !showPayment && (
                    <div>
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-medium text-slate-700">Progress</span>
                          <span className="font-bold text-emerald-600">
                            {animatedProgress}%
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${booking.overallProgress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                          />
                        </div>
                      </div>

                      {/* Stage Icons */}
                      <div className="flex justify-between">
                        {DISPLAY_STAGES.map((stage, index) => {
                          const isCompleted = index <= currentDisplayIndex;
                          const isCurrent = index === currentDisplayIndex;
                          const Icon = stage.icon;

                          return (
                            <div key={stage.id} className="flex flex-col items-center">
                              <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: isCurrent ? 1.1 : 1 }}
                                className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                                  isCompleted
                                    ? isCurrent
                                      ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                                      : "bg-emerald-500 text-white"
                                    : "bg-slate-200 text-slate-400"
                                }`}
                              >
                                <Icon className="h-5 w-5" />
                              </motion.div>
                              <span
                                className={`mt-2 text-xs text-center max-w-[60px] ${
                                  isCurrent
                                    ? "font-semibold text-emerald-600"
                                    : "text-slate-500"
                                }`}
                              >
                                {stage.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Booking Details */}
                  {!showPayment && (
                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-slate-500">Pickup</p>
                          <p className="text-slate-900">{booking.pickupAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-slate-500">Window</p>
                          <p className="text-slate-900">
                            {booking.pickupTime} - {booking.dropoffTime}
                          </p>
                        </div>
                      </div>
                      {booking.garageName && (
                        <div className="flex items-start gap-3 text-sm">
                          <Wrench className="h-4 w-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-slate-500">Service at</p>
                            <p className="text-slate-900">{booking.garageName}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Latest Update */}
                  {booking.updates && booking.updates.length > 0 && !showPayment && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        Latest Update
                      </p>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-sm text-slate-700">
                          {booking.updates[booking.updates.length - 1].message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(
                            booking.updates[booking.updates.length - 1].timestamp
                          ).toLocaleString("en-AU", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* View Vehicle Photos Button */}
                  {!showPayment && booking.status !== "cancelled" && (
                    <button
                      onClick={() => setShowPhotos(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition"
                    >
                      <Camera className="h-4 w-4" />
                      View Vehicle Photos
                    </button>
                  )}

                  {/* Search Again Button */}
                  {!showPayment && (
                    <button
                      onClick={handleTrackAnother}
                      className="w-full flex justify-center items-center gap-2 py-3 px-4 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-emerald-300 transition"
                    >
                      Track Another Booking
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* No Results */}
            {hasSearched && !booking && !loading && !error && (
              <div className="text-center py-8">
                <Car className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 font-semibold text-slate-900">No booking found</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Please check your details and try again
                </p>
              </div>
            )}
          </div>

          {/* Back to home link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Back to home
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Guest Photos Viewer Modal */}
      {booking && (
        <GuestPhotosViewer
          email={email}
          registration={registration}
          vehicleRegistration={booking.vehicleRegistration}
          vehicleState={booking.vehicleState}
          isOpen={showPhotos}
          onClose={() => setShowPhotos(false)}
        />
      )}
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
