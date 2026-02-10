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
  Calendar,
  Star,
  User,
  Briefcase,
  ClipboardCheck,
  PackageCheck,
  FileWarning,
} from "lucide-react";

import RegistrationPlate, { StateCode } from "@/components/homepage/RegistrationPlate";
import GuestPhotosViewer from "@/components/tracking/GuestPhotosViewer";
import PickupConsentForm from "@/components/forms/PickupConsentForm";
import ReturnConfirmationForm from "@/components/forms/ReturnConfirmationForm";
import ClaimLodgementForm from "@/components/forms/ClaimLodgementForm";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Driver info type
interface DriverInfo {
  firstName: string;
  profilePhoto: string | null;
  rating: number;
  totalRatings: number;
  completedJobs: number;
  memberSince: string;
}

interface SignedFormRef {
  formId: string;
  formType: "pickup_consent" | "return_confirmation" | "claim_lodgement";
  submittedAt: string;
}

// Booking type
interface Booking {
  _id: string;
  vehicleRegistration: string;
  vehicleState: string;
  vehicleYear?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  serviceType: string;
  serviceDate?: string;
  pickupAddress: string;
  pickupTime: string;
  dropoffTime: string;
  currentStage: string;
  overallProgress: number;
  status: string;
  garageName?: string;
  garageAddress?: string;
  transmissionType?: string;
  userName?: string;
  userEmail?: string;
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
  // Driver info
  driver?: DriverInfo | null;
  // Signed forms
  signedForms?: SignedFormRef[];
}

// Stage definitions for visual display — matches admin/backend stage IDs
const STAGES = [
  { id: "booking_confirmed", label: "Booking Confirmed", icon: CheckCircle2 },
  { id: "driver_en_route", label: "Driver En Route", icon: Truck },
  { id: "car_picked_up", label: "Car Picked Up", icon: Package },
  { id: "at_garage", label: "At Garage", icon: MapPin },
  { id: "service_in_progress", label: "Service In Progress", icon: Wrench },
  { id: "driver_returning", label: "Driver Returning", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Home },
];

// Stages where pickup form is relevant (from car_picked_up onwards)
const PICKUP_FORM_STAGES = ["car_picked_up", "at_garage", "service_in_progress", "driver_returning", "delivered"];

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

// Driver Card Component
function DriverCard({ driver }: { driver: DriverInfo }) {
  const memberSinceDate = new Date(driver.memberSince);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - memberSinceDate.getFullYear()) * 12 + 
    (now.getMonth() - memberSinceDate.getMonth());
  
  let experienceText = "New driver";
  if (monthsDiff >= 12) {
    const years = Math.floor(monthsDiff / 12);
    experienceText = `${years}+ year${years > 1 ? 's' : ''} with drivlet`;
  } else if (monthsDiff >= 1) {
    experienceText = `${monthsDiff} month${monthsDiff > 1 ? 's' : ''} with drivlet`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-white ring-2 ring-emerald-200 ring-offset-2">
            {driver.profilePhoto ? (
              <Image
                src={driver.profilePhoto}
                alt={driver.firstName}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-emerald-100">
                <User className="h-8 w-8 text-emerald-600" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-1">
            <CheckCircle2 className="h-3 w-3 text-white" />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-900">{driver.firstName}</h4>
            <span className="text-sm text-slate-500">is your driver</span>
          </div>
          
          {driver.totalRatings > 0 ? (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3.5 w-3.5 ${
                      star <= Math.round(driver.rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-slate-700">
                {driver.rating.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500">
                ({driver.totalRatings} review{driver.totalRatings !== 1 ? 's' : ''})
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-500">New driver - no reviews yet</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3 text-emerald-600" />
              {driver.completedJobs} jobs completed
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-emerald-600" />
              {experienceText}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  // Store SSE params in refs to avoid stale closures
  const sseParamsRef = useRef<{ bookingId: string; email: string; rego: string } | null>(null);

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Photo viewer state
  const [showPhotos, setShowPhotos] = useState(false);

  // Form modal state
  const [showPickupForm, setShowPickupForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const autoPromptedRef = useRef<Set<string>>(new Set());

  // Animated progress counter
  const currentDisplayIndex = booking ?
    getDisplayStageIndex(booking.currentStage) : 0;
  const animatedProgress = useAnimatedCounter(booking?.overallProgress || 0, 800);

  // Check which forms are pending / signed
  const hasPickupConsent = booking?.signedForms?.some((f) => f.formType === "pickup_consent");
  const hasReturnConfirmation = booking?.signedForms?.some((f) => f.formType === "return_confirmation");
  const hasClaimLodged = booking?.signedForms?.some((f) => f.formType === "claim_lodgement");
  const needsPickupForm = booking && PICKUP_FORM_STAGES.includes(booking.currentStage) && !hasPickupConsent;
  const needsReturnForm = booking && booking.currentStage === "delivered" && !hasReturnConfirmation;

  // Build booking data for form pre-fill
  const bookingForForms = booking
    ? {
        _id: booking._id,
        userName: booking.userName || email,
        userEmail: booking.userEmail || email,
        vehicleRegistration: booking.vehicleRegistration,
        vehicleState: booking.vehicleState,
        vehicleModel: booking.vehicleModel,
        vehicleYear: booking.vehicleYear,
        vehicleColor: booking.vehicleColor,
        pickupAddress: booking.pickupAddress,
        garageName: booking.garageName,
        garageAddress: booking.garageAddress,
        transmissionType: booking.transmissionType || "automatic",
        pickupTime: booking.pickupTime,
        dropoffTime: booking.dropoffTime,
        createdAt: booking.createdAt,
      }
    : null;

  // Auto-prompt forms when stage changes via SSE
  const checkAutoPromptForms = (bookingData: Booking) => {
    if (!bookingData || bookingData.status === "cancelled" || bookingData.status === "completed") return;

    const signed = bookingData.signedForms ?? [];
    const hasPickup = signed.some((f) => f.formType === "pickup_consent");
    const hasReturn = signed.some((f) => f.formType === "return_confirmation");

    // Auto-prompt pickup form
    if (
      PICKUP_FORM_STAGES.includes(bookingData.currentStage) &&
      !hasPickup &&
      !autoPromptedRef.current.has(`${bookingData._id}-pickup`)
    ) {
      autoPromptedRef.current.add(`${bookingData._id}-pickup`);
      setShowPickupForm(true);
      return;
    }

    // Auto-prompt return form
    if (
      bookingData.currentStage === "delivered" &&
      !hasReturn &&
      !autoPromptedRef.current.has(`${bookingData._id}-return`)
    ) {
      autoPromptedRef.current.add(`${bookingData._id}-return`);
      setShowReturnForm(true);
    }
  };

  // Handle form submission success — refresh booking data
  const handleFormSuccess = async () => {
    setShowPickupForm(false);
    setShowReturnForm(false);
    setShowClaimForm(false);
    // Re-fetch booking to get updated signedForms
    if (trackingCode && email && registration) {
      try {
        const params = new URLSearchParams({
          code: trackingCode,
          email: email.toLowerCase().trim(),
          rego: registration.toUpperCase().trim(),
        });
        const response = await fetch(`/api/bookings/track?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setBooking(data);
        }
      } catch (err) {
        console.error("Error refreshing booking after form:", err);
      }
    }
  };

  // Connect to SSE for real-time updates
  const connectSSE = (bookingId: string, emailParam: string, regoParam: string) => {
    sseParamsRef.current = { bookingId, email: emailParam, rego: regoParam };

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (document.hidden) {
      return;
    }

    const url = `/api/bookings/${bookingId}/stream?email=${encodeURIComponent(emailParam)}&rego=${encodeURIComponent(regoParam)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('SSE connection confirmed for booking:', data.bookingId);
        } else if (data.type === 'heartbeat') {
          // Heartbeat received - connection is alive
        } else if (data.type === 'update') {
          console.log('SSE update received:', data);
          setBooking(prev => {
            if (!prev) return prev;
            const updated = {
              ...prev,
              currentStage: data.currentStage,
              overallProgress: data.overallProgress,
              status: data.status,
              servicePaymentStatus: data.servicePaymentStatus,
              servicePaymentAmount: data.servicePaymentAmount,
              servicePaymentUrl: data.servicePaymentUrl,
              driver: data.driver || prev.driver,
              signedForms: data.signedForms || prev.signedForms,
              updatedAt: data.updatedAt,
              updates: data.latestUpdate
                ? [...prev.updates.filter(u => u.timestamp !== data.latestUpdate.timestamp), data.latestUpdate]
                : prev.updates,
            };

            // Check if forms should auto-open after this SSE update
            checkAutoPromptForms(updated);

            return updated;
          });

          if (data.servicePaymentStatus === 'paid') {
            setPaymentSuccess(false);
          }
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      console.log('SSE connection error or closed');
      setIsConnected(false);

      if (reconnectAttemptsRef.current >= maxReconnectAttempts || document.hidden) {
        return;
      }

      const backoffMs = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current += 1;

      reconnectTimeoutRef.current = setTimeout(() => {
        const params = sseParamsRef.current;
        if (params && !document.hidden) {
          connectSSE(params.bookingId, params.email, params.rego);
        }
      }, backoffMs);
    };
  };

  const closeSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        closeSSE();
      } else {
        const params = sseParamsRef.current;
        if (params) {
          reconnectAttemptsRef.current = 0;
          connectSSE(params.bookingId, params.email, params.rego);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      closeSSE();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadBooking = async () => {
      const codeParam = searchParams.get("code");
      const emailParam = searchParams.get("email");
      const regoParam = searchParams.get("rego");

      if (codeParam && codeParam.length === 6 && emailParam && regoParam) {
        setTrackingCode(codeParam.toUpperCase());
        setEmail(emailParam);
        setRegistration(regoParam.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        localStorage.setItem("drivlet_track_code", codeParam.toUpperCase());
        localStorage.setItem("drivlet_track_email", emailParam);
        localStorage.setItem("drivlet_track_rego", regoParam.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        await handleSearch(codeParam, emailParam, regoParam);
      } else {
        const savedCode = localStorage.getItem("drivlet_track_code");
        const savedEmail = localStorage.getItem("drivlet_track_email");
        const savedRego = localStorage.getItem("drivlet_track_rego");

        if (savedCode && savedCode.length === 6 && savedEmail && savedRego) {
          setTrackingCode(savedCode);
          setEmail(savedEmail);
          setRegistration(savedRego);
          await handleSearch(savedCode, savedEmail, savedRego);
        } else {
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

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};
    let isValid = true;

    if (!trackingCode || trackingCode.length !== 6) {
      errors.trackingCode = "Please enter a valid 6-character tracking code";
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = "Email address is required";
      isValid = false;
    } else if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid email address";
      isValid = false;
    }

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

    setFieldErrors({});
    setError("");

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
        localStorage.setItem("drivlet_track_code", codeToSearch.toUpperCase());
        localStorage.setItem("drivlet_track_email", emailToSearch.toLowerCase().trim());
        localStorage.setItem("drivlet_track_rego", regoToSearch.toUpperCase().trim());
        if (!paymentSuccess) {
          setShowPayment(false);
          setClientSecret(null);
        }
        if (data.servicePaymentStatus === "paid") {
          setPaymentSuccess(false);
        }

        // Connect to SSE for real-time updates
        connectSSE(data._id, emailToSearch.toLowerCase().trim(), regoToSearch.toUpperCase().trim());

        // Check for auto-prompt on initial load
        checkAutoPromptForms(data);
      } else {
        if (response.status === 410) {
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

    if (booking?._id) {
      try {
        const confirmResponse = await fetch(`/api/bookings/${booking._id}/confirm-service-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const confirmData = await confirmResponse.json();

        if (confirmData.success) {
          setBooking(prev => prev ? {
            ...prev,
            servicePaymentStatus: 'paid',
            currentStage: 'driver_returning',
            overallProgress: 86,
          } : null);
          setPaymentSuccess(false);
          return;
        }
      } catch (err) {
        console.error('Failed to confirm payment:', err);
      }
    }

    const pollForUpdate = async (attempts: number) => {
      if (attempts <= 0) return;

      try {
        const response = await fetch(`/api/bookings/track?code=${encodeURIComponent(trackingCode)}&email=${encodeURIComponent(email)}&rego=${encodeURIComponent(registration)}`);
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
    closeSSE();
    sseParamsRef.current = null;
    autoPromptedRef.current.clear();
    setBooking(null);
    setHasSearched(false);
    setTrackingCode("");
    setEmail("");
    setRegistration("");
    setFieldErrors({});
    setPaymentSuccess(false);
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
      {/* Subtle pattern overlay */}
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
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Main Card */}
          <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm p-8 shadow-2xl">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Track Your Booking
              </h1>
              <p className="text-slate-600 mt-2">
                Enter your details to see your vehicle's status
              </p>
            </div>

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

                  {/* Driver Card */}
                  {booking.driver && (
                    <DriverCard driver={booking.driver} />
                  )}

                  {/* ── Action Required Banner ── */}
                  {(needsPickupForm || needsReturnForm) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-200">
                          <ClipboardCheck className="h-4 w-4 text-amber-700" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-900">Signature Required</p>
                          <p className="mt-0.5 text-xs text-amber-700">
                            Please sign the {needsPickupForm && needsReturnForm ? 'pickup and return forms' : needsPickupForm ? 'pickup consent form' : 'return confirmation form'}.
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {needsPickupForm && (
                              <button
                                onClick={() => setShowPickupForm(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                Sign Pickup Form
                              </button>
                            )}
                            {needsReturnForm && (
                              <button
                                onClick={() => setShowReturnForm(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
                              >
                                <PackageCheck className="h-3.5 w-3.5" />
                                Sign Return Form
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Signed Form Badges */}
                  {(hasPickupConsent || hasReturnConfirmation || hasClaimLodged) && (
                    <div className="flex flex-wrap gap-2">
                      {hasPickupConsent && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Pickup Signed
                        </span>
                      )}
                      {hasReturnConfirmation && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Return Confirmed
                        </span>
                      )}
                      {hasClaimLodged && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Claim Lodged
                        </span>
                      )}
                    </div>
                  )}

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
                    {booking.serviceDate && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>Date: {new Date(booking.serviceDate).toLocaleDateString('en-AU', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                      </div>
                    )}
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

                  {/* Action Buttons — Photos, Forms, Claim */}
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowPhotos(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-emerald-300 transition"
                    >
                      <Camera className="h-4 w-4" />
                      View Vehicle Photos
                    </button>

                    {/* Form Buttons Row */}
                    {(booking.status === "in_progress" || booking.status === "pending") && (
                      <div className="flex flex-wrap gap-2">
                        {!hasPickupConsent && PICKUP_FORM_STAGES.includes(booking.currentStage) && (
                          <button
                            onClick={() => setShowPickupForm(true)}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-100 px-3 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200"
                          >
                            <ClipboardCheck className="h-4 w-4" />
                            Pickup Form
                          </button>
                        )}
                        {hasPickupConsent && (
                          <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Pickup Signed
                          </span>
                        )}
                        {!hasReturnConfirmation && booking.currentStage === "delivered" && (
                          <button
                            onClick={() => setShowReturnForm(true)}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-100 px-3 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                          >
                            <PackageCheck className="h-4 w-4" />
                            Return Form
                          </button>
                        )}
                        {hasReturnConfirmation && (
                          <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs font-medium text-blue-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Return Signed
                          </span>
                        )}
                        {!hasClaimLodged ? (
                          <button
                            onClick={() => setShowClaimForm(true)}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-100 px-3 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-200"
                          >
                            <FileWarning className="h-4 w-4" />
                            Lodge Claim
                          </button>
                        ) : (
                          <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5 text-xs font-medium text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Claim Lodged
                          </span>
                        )}
                      </div>
                    )}
                  </div>

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

      {/* Form Modals */}
      {bookingForForms && (
        <>
          <PickupConsentForm
            booking={bookingForForms}
            isOpen={showPickupForm}
            onClose={() => setShowPickupForm(false)}
            onSuccess={handleFormSuccess}
            driverName={booking?.driver?.firstName || ""}
          />

          <ReturnConfirmationForm
            booking={bookingForForms}
            isOpen={showReturnForm}
            onClose={() => setShowReturnForm(false)}
            onSuccess={handleFormSuccess}
            driverName={booking?.driver?.firstName || ""}
          />

          <ClaimLodgementForm
            booking={bookingForForms}
            isOpen={showClaimForm}
            onClose={() => setShowClaimForm(false)}
            onSuccess={handleFormSuccess}
          />
        </>
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
