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

// Booking type
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
  garageName?: string;
  updates: Array<{
    stage: string;
    timestamp: string;
    message: string;
  }>;
  createdAt: string;
  updatedAt: string;
  // Payment fields
  servicePaymentStatus?: 'pending' | 'paid';
  servicePaymentAmount?: number;
  servicePaymentUrl?: string;
}

// Stage definitions for visual display
const STAGES = [
  { id: "booking_confirmed", label: "Booking Confirmed", icon: CheckCircle2 },
  { id: "driver_en_route", label: "Driver En Route", icon: Truck },
  { id: "car_picked_up", label: "Car Picked Up", icon: Package },
  { id: "at_service_location", label: "At Service Location", icon: MapPin },
  { id: "service_in_progress", label: "Service In Progress", icon: Wrench },
  { id: "ready_for_return", label: "Ready For Return", icon: CheckCircle2 },
  { id: "returning", label: "Returning", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Home },
];

// Helper to get stage index for progress display
const getDisplayStageIndex = (stageId: string): number => {
  const index = STAGES.findIndex((s) => s.id === stageId);
  return index >= 0 ? index : 0;
};

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 500) {
  const [count, setCount] = useState(0);
  const previousTarget = useRef(target);

  useEffect(() => {
    if (previousTarget.current === target) {
      setCount(target);
      return;
    }

    const startValue = previousTarget.current;
    const startTime = Date.now();
    const difference = target - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + difference * easeOut;

      setCount(Math.round(currentValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    previousTarget.current = target;
  }, [target, duration]);

  return count;
}

// Stripe Payment Form Component
function ServicePaymentForm({
  clientSecret,
  amount,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
      } else if (paymentIntent?.status === "succeeded") {
        onSuccess();
      }
    } catch {
      onError("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
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
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [registration, setRegistration] = useState(
    (searchParams.get('rego') || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  );
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Field-specific validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    trackingCode?: string;
    email?: string;
    registration?: string;
  }>({});

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
  const currentDisplayIndex = booking ?
    getDisplayStageIndex(booking.currentStage) : 0;
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
        if (booking && trackingCode) {
          connectSSE(booking._id, trackingCode);
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
      const emailParam = searchParams.get("email");
      const regoParam = searchParams.get("rego");

      // If all three URL params are present, auto-search
      if (codeParam && codeParam.length === 6 && emailParam && regoParam) {
        setTrackingCode(codeParam.toUpperCase());
        setEmail(emailParam);
        setRegistration(regoParam.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        // Save to localStorage for persistence
        localStorage.setItem("drivlet_track_code", codeParam.toUpperCase());
        localStorage.setItem("drivlet_track_email", emailParam);
        localStorage.setItem("drivlet_track_rego", regoParam.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        await handleSearch(codeParam, emailParam, regoParam);
      } else {
        // Try to load from localStorage
        const savedCode = localStorage.getItem("drivlet_track_code");
        const savedEmail = localStorage.getItem("drivlet_track_email");
        const savedRego = localStorage.getItem("drivlet_track_rego");

        if (savedCode && savedCode.length === 6 && savedEmail && savedRego) {
          setTrackingCode(savedCode);
          setEmail(savedEmail);
          setRegistration(savedRego);
          await handleSearch(savedCode, savedEmail, savedRego);
        } else {
          // Pre-fill any available params
          if (codeParam) setTrackingCode(codeParam.toUpperCase());
          if (emailParam) setEmail(emailParam);
          if (regoParam) setRegistration(regoParam.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        }
      }
      setInitialLoading(false);
    };

    loadBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};
    let isValid = true;

    // Validate tracking code
    if (!trackingCode || trackingCode.length !== 6) {
      errors.trackingCode = "Please enter a valid 6-character tracking code";
      isValid = false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = "Email address is required";
      isValid = false;
    } else if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid email address";
      isValid = false;
    }

    // Validate registration
    if (!registration) {
      errors.registration = "Vehicle registration is required";
      isValid = false;
    } else if (registration.length < 2) {
      errors.registration = "Registration must be at least 2 characters";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSearch = async (code?: string, emailParam?: string, regoParam?: string) => {
    const codeToSearch = code || trackingCode;
    const emailToSearch = emailParam || email;
    const regoToSearch = regoParam || registration;

    // Clear previous errors
    setFieldErrors({});
    setError("");

    // If called without params (from form submit), validate
    if (!code && !validateForm()) {
      return;
    }

    setLoading(true);
    setIsExpired(false);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        code: codeToSearch,
        email: emailToSearch.toLowerCase().trim(),
        rego: regoToSearch.toUpperCase().trim(),
      });
      const response = await fetch(`/api/bookings/track?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setBooking(data);
        // Save credentials for refresh persistence
        localStorage.setItem("drivlet_track_code", codeToSearch.toUpperCase());
        localStorage.setItem("drivlet_track_email", emailToSearch.toLowerCase().trim());
        localStorage.setItem("drivlet_track_rego", regoToSearch.toUpperCase().trim());
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
        const response = await fetch(`/api/bookings/track?code=${encodeURIComponent(trackingCode)}`);
        const data = await response.json();

        if (response.ok) {
          setBooking(data);
          if (data.servicePaymentStatus === "paid") {
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
    setTrackingCode("");
    setEmail("");
    setRegistration("");
    setFieldErrors({});
    setPaymentSuccess(false);
    // Clear saved credentials
    localStorage.removeItem("drivlet_track_code");
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

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="relative h-12 w-40 sm:h-14 sm:w-48 mx-auto">
                <Image
                  src="/logo.png"
                  alt="drivlet"
                  fill
                  className="object-contain brightness-0 invert"
                  priority
                />
              </div>
            </Link>
            <h1 className="mt-4 text-2xl font-bold text-white">Track Your Booking</h1>
            <p className="mt-2 text-emerald-100/80">
              Enter your tracking code to see your vehicle's status
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            {/* Connection Status */}
            {booking && (
              <div className={`flex items-center gap-2 text-xs mb-4 ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Live updates active</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Reconnecting...</span>
                  </>
                )}
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* Search Form */}
              {!booking ? (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Error Display */}
                    {error && (
                      <div className={`flex items-start gap-3 p-4 rounded-xl ${isExpired ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                        {isExpired ? (
                          <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className={`text-sm font-medium ${isExpired ? 'text-amber-800' : 'text-red-800'}`}>
                            {error}
                          </p>
                          {isExpired && (
                            <p className="text-xs text-amber-600 mt-1">
                              Need help? <Link href="/#contact" className="underline">Contact support</Link>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tracking Code Input */}
                    <div>
                      <label htmlFor="trackingCode" className="block text-sm font-medium text-slate-700 mb-2">
                        Tracking Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="trackingCode"
                          value={trackingCode}
                          onChange={(e) => {
                            setTrackingCode(e.target.value.toUpperCase().slice(0, 6));
                            if (fieldErrors.trackingCode) {
                              setFieldErrors(prev => ({ ...prev, trackingCode: undefined }));
                            }
                          }}
                          className={`w-full rounded-xl border px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal focus:ring-2 transition ${
                            fieldErrors.trackingCode
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                          }`}
                          placeholder="ABC123"
                          autoComplete="off"
                          autoFocus
                          aria-invalid={!!fieldErrors.trackingCode}
                          aria-describedby={fieldErrors.trackingCode ? "trackingCode-error" : "trackingCode-help"}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {trackingCode.length}/6
                        </div>
                      </div>
                      {fieldErrors.trackingCode ? (
                        <p id="trackingCode-error" className="mt-2 text-xs text-red-600 text-center">
                          {fieldErrors.trackingCode}
                        </p>
                      ) : (
                        <p id="trackingCode-help" className="mt-2 text-xs text-slate-500 text-center">
                          Your tracking code was sent to your email after booking
                        </p>
                      )}
                    </div>

                    {/* Email Input */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Mail className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (fieldErrors.email) {
                              setFieldErrors(prev => ({ ...prev, email: undefined }));
                            }
                          }}
                          className={`w-full rounded-xl border pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 transition ${
                            fieldErrors.email
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                          }`}
                          placeholder="Enter your email address"
                          autoComplete="email"
                          aria-invalid={!!fieldErrors.email}
                          aria-describedby={fieldErrors.email ? "email-error" : "email-help"}
                        />
                      </div>
                      {fieldErrors.email ? (
                        <p id="email-error" className="mt-2 text-xs text-red-600">
                          {fieldErrors.email}
                        </p>
                      ) : (
                        <p id="email-help" className="mt-2 text-xs text-slate-500">
                          The email address used when making the booking
                        </p>
                      )}
                    </div>

                    {/* Registration Number Input */}
                    <div>
                      <label htmlFor="registration" className="block text-sm font-medium text-slate-700 mb-2">
                        Vehicle Registration Number
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Car className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          id="registration"
                          value={registration}
                          onChange={(e) => {
                            // Transform: uppercase, remove spaces and special chars
                            const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                            setRegistration(cleaned);
                            if (fieldErrors.registration) {
                              setFieldErrors(prev => ({ ...prev, registration: undefined }));
                            }
                          }}
                          className={`w-full rounded-xl border pl-10 pr-4 py-3 text-slate-900 font-mono uppercase placeholder:text-slate-400 placeholder:font-sans focus:ring-2 transition ${
                            fieldErrors.registration
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                          }`}
                          placeholder="e.g., ABC123"
                          autoComplete="off"
                          aria-invalid={!!fieldErrors.registration}
                          aria-describedby={fieldErrors.registration ? "registration-error" : "registration-help"}
                        />
                      </div>
                      {fieldErrors.registration ? (
                        <p id="registration-error" className="mt-2 text-xs text-red-600">
                          {fieldErrors.registration}
                        </p>
                      ) : (
                        <p id="registration-help" className="mt-2 text-xs text-slate-500">
                          Your vehicle's registration plate number
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
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
                      className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
                    >
                      <div className="shrink-0 h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-800">Payment Successful!</p>
                        <p className="text-sm text-emerald-600">Your car will be returned soon</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Service Payment Paid Banner (from DB) */}
                  {booking.servicePaymentStatus === 'paid' && !paymentSuccess && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="shrink-0 h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-800">Service Payment Complete</p>
                        <p className="text-sm text-emerald-600">
                          ${((booking.servicePaymentAmount || 0) / 100).toFixed(2)} paid
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Progress Section */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-600">Overall Progress</span>
                      <span className="text-lg font-bold text-emerald-600">{animatedProgress}%</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${booking.overallProgress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Current Stage */}
                  <div className="text-center">
                    {(() => {
                      const currentStage = STAGES[currentDisplayIndex];
                      const Icon = currentStage?.icon || CheckCircle2;
                      return (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full">
                          <Icon className="h-5 w-5" />
                          <span className="font-semibold">{currentStage?.label || booking.currentStage}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Stage Timeline */}
                  <div className="space-y-3">
                    {STAGES.map((stage, index) => {
                      const isCompleted = index < currentDisplayIndex;
                      const isCurrent = index === currentDisplayIndex;
                      const Icon = stage.icon;

                      return (
                        <div
                          key={stage.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition ${
                            isCurrent
                              ? "bg-emerald-50 border border-emerald-200"
                              : isCompleted
                              ? "bg-slate-50"
                              : "opacity-50"
                          }`}
                        >
                          <div
                            className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                              isCurrent
                                ? "bg-emerald-600 text-white"
                                : isCompleted
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-slate-200 text-slate-400"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Icon className="h-4 w-4" />
                            )}
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              isCurrent
                                ? "text-emerald-700"
                                : isCompleted
                                ? "text-slate-600"
                                : "text-slate-400"
                            }`}
                          >
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Service Details */}
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Wrench className="h-4 w-4 text-slate-400" />
                      <span>Service: {booking.serviceType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>
                    {booking.garageName && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>Location: {booking.garageName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>Pickup: {booking.pickupTime}</span>
                    </div>
                  </div>

                  {/* View Photos Button */}
                  <button
                    onClick={() => setShowPhotos(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-emerald-300 transition"
                  >
                    <Camera className="h-4 w-4" />
                    View Vehicle Photos
                  </button>

                  {/* Payment Section */}
                  {needsPayment && (
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="h-5 w-5 text-emerald-600" />
                        <span className="font-semibold text-slate-900">Service Payment Required</span>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-800 font-medium">Service Cost</span>
                          <span className="text-2xl font-bold text-amber-900">
                            ${((booking.servicePaymentAmount || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-amber-700 mt-1">
                          Please pay to have your vehicle returned
                        </p>
                      </div>

                      {paymentError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                          <span className="text-sm text-red-700">{paymentError}</span>
                        </div>
                      )}

                      {!showPayment ? (
                        <button
                          onClick={initiatePayment}
                          disabled={paymentLoading}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
                        >
                          {paymentLoading ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-5 w-5" />
                              Pay Now
                            </>
                          )}
                        </button>
                      ) : clientSecret ? (
                        <Elements
                          stripe={stripePromise}
                          options={{
                            clientSecret,
                            appearance: {
                              theme: 'stripe',
                              variables: {
                                colorPrimary: '#059669',
                                borderRadius: '12px',
                              },
                            },
                          }}
                        >
                          <ServicePaymentForm
                            clientSecret={clientSecret}
                            amount={booking.servicePaymentAmount || 0}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                          />
                        </Elements>
                      ) : null}
                    </div>
                  )}

                  {/* Track Another Button */}
                  {booking && (
                    <button
                      onClick={handleTrackAnother}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-emerald-300 transition"
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
