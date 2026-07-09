"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import StripePaymentForm from "@/components/StripePaymentForm";
import {
  Car,
  MapPin,
  Building,
  Receipt,
  Hash,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Calendar,
  Clock,
  Copy,
  Check,
  Mail,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface PaymentData {
  firstName: string;
  vehicleRegistration: string;
  pickupAddress: string;
  garageName: string | null;
  serviceDate: string | null;
  pickupTimeSlot: string | null;
  dropoffTimeSlot: string | null;
  amount: number;
  amountDisplay: string;
  reference: string;
  status: string;
}

const TRACKING_POLL_INTERVAL_MS = 3000;
const TRACKING_POLL_MAX_ATTEMPTS = 5;

function formatServiceDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PaymentPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [paidReference, setPaidReference] = useState<string | null>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creatingPI, setCreatingPI] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Tracking code lookup after payment (the webhook creates the booking
  // asynchronously, so we poll briefly to pick up the code once it exists).
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [pollingForCode, setPollingForCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`/api/pay/${token}`);
        if (res.status === 410) {
          // Already paid — capture the reference and tracking code (if provided)
          // for the confirmation screen.
          try {
            const paidJson = await res.json();
            if (paidJson?.reference) setPaidReference(paidJson.reference);
            if (paidJson?.trackingCode) setTrackingCode(paidJson.trackingCode);
          } catch {
            /* no body — still show the already-paid state */
          }
          setAlreadyPaid(true);
          return;
        }
        if (!res.ok) {
          setError("This payment link is no longer valid.");
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // After a successful payment, poll the pay endpoint a few times to pick up
  // the tracking code once the webhook has converted the request into a booking.
  useEffect(() => {
    if (!success || !token || trackingCode) return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    setPollingForCode(true);

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/pay/${token}`);
        if (res.status === 410) {
          const json = await res.json();
          if (json?.trackingCode && !cancelled) {
            setTrackingCode(json.trackingCode);
            setPollingForCode(false);
            return;
          }
        }
      } catch {
        /* transient error — keep polling until attempts run out */
      }
      if (cancelled) return;
      if (attempts < TRACKING_POLL_MAX_ATTEMPTS) {
        timer = setTimeout(poll, TRACKING_POLL_INTERVAL_MS);
      } else {
        // Give up gracefully — the code is in the confirmation email.
        setPollingForCode(false);
      }
    };

    timer = setTimeout(poll, TRACKING_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [success, token, trackingCode]);

  const handleCopyCode = async () => {
    if (!trackingCode) return;
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — user can still read the code */
    }
  };

  const handleProceedToPayment = async () => {
    if (!token || creatingPI) return;
    setCreatingPI(true);
    setPaymentError(null);

    try {
      const res = await fetch("/api/stripe/create-request-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.status === 409) {
        // Server authoritatively refused — this reference is already paid. Switch to the
        // already-paid screen rather than showing an inline error.
        setPaidReference(data?.reference || null);
        setAlreadyPaid(true);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        setPaymentError(err.error || "Failed to initialize payment");
        return;
      }

      const json = await res.json();
      setClientSecret(json.clientSecret);
    } catch {
      setPaymentError("Something went wrong. Please try again.");
    } finally {
      setCreatingPI(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (alreadyPaid) {
    const ref = paidReference || data?.reference || null;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            This booking is already paid and confirmed
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            You&apos;re all set — no need to pay again. We&apos;ve got everything we need and
            your car&apos;s in good hands.
          </p>
          {trackingCode ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs text-emerald-600">Tracking code</p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <p className="font-mono text-lg font-bold tracking-widest text-emerald-800">
                  {trackingCode}
                </p>
                <button
                  onClick={handleCopyCode}
                  className="rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-100"
                  aria-label="Copy tracking code"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            ref && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">Reference</p>
                <p className="font-mono text-sm font-semibold text-slate-800">{ref}</p>
              </div>
            )
          )}
          <Link
            href={trackingCode ? `/track?code=${trackingCode}` : "/track"}
            className="mt-6 inline-block rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Track your booking
          </Link>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Link Invalid
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error || "This payment link is no longer valid or has expired."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Go to Drivlet
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    const serviceDateDisplay = formatServiceDate(data.serviceDate);
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md space-y-4">
          {/* Confirmation header */}
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Booking confirmed
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Payment received — your booking is confirmed.
            </p>

            {/* Tracking code */}
            {trackingCode ? (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-medium text-emerald-600">
                  Your tracking code
                </p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <p className="font-mono text-2xl font-bold tracking-widest text-emerald-800">
                    {trackingCode}
                  </p>
                  <button
                    onClick={handleCopyCode}
                    className="rounded-md p-2 text-emerald-600 transition hover:bg-emerald-100"
                    aria-label="Copy tracking code"
                  >
                    {copied ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="mt-1 text-xs text-emerald-600">Copied!</p>
                )}
              </div>
            ) : pollingForCode ? (
              <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                Fetching your tracking code...
              </div>
            ) : (
              <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
                Your tracking code is in your confirmation email.
              </div>
            )}
          </div>

          {/* Booking summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm font-medium text-slate-500">
              Your booking
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Car className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-xs text-slate-400">Vehicle</p>
                  <p className="font-semibold text-slate-900">
                    {data.vehicleRegistration}
                  </p>
                </div>
              </div>
              {serviceDateDisplay && (
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-xs text-slate-400">Service date</p>
                    <p className="text-sm text-slate-700">{serviceDateDisplay}</p>
                  </div>
                </div>
              )}
              {(data.pickupTimeSlot || data.dropoffTimeSlot) && (
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-xs text-slate-400">Time slots</p>
                    <p className="text-sm text-slate-700">
                      {data.pickupTimeSlot && `Pickup: ${data.pickupTimeSlot}`}
                      {data.pickupTimeSlot && data.dropoffTimeSlot && " • "}
                      {data.dropoffTimeSlot && `Return: ${data.dropoffTimeSlot}`}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-xs text-slate-400">Pickup</p>
                  <p className="text-sm text-slate-700">{data.pickupAddress}</p>
                </div>
              </div>
              {data.garageName && (
                <div className="flex items-start gap-3">
                  <Building className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-xs text-slate-400">Garage</p>
                    <p className="text-sm text-slate-700">{data.garageName}</p>
                  </div>
                </div>
              )}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center gap-3">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-xs text-slate-400">Amount paid</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {data.amountDisplay}{" "}
                      <span className="text-sm font-normal text-slate-400">
                        AUD
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              What happens next
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                A confirmation email with your tracking code is on its way
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                Track your car&apos;s progress any time on the tracking page
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                Our driver will arrive at your pickup address during your
                pickup window
              </li>
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={trackingCode ? `/track?code=${trackingCode}` : "/track"}
              className="group flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
            >
              Track your booking
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/"
              className="flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to home
            </Link>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-700">
              <Shield className="h-4 w-4 shrink-0" />
              <span>
                You&apos;ll receive email updates at every stage of your
                booking.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const serviceDateDisplay = formatServiceDate(data.serviceDate);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Complete Your Booking
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ref: {data.reference}
          </p>
        </div>

        {/* Verification Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium text-slate-500">
            You&apos;re paying for:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Car className="mt-0.5 h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs text-slate-400">Vehicle</p>
                <p className="font-semibold text-slate-900">
                  {data.vehicleRegistration}
                </p>
              </div>
            </div>
            {serviceDateDisplay && (
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-xs text-slate-400">Service date</p>
                  <p className="text-sm text-slate-700">{serviceDateDisplay}</p>
                </div>
              </div>
            )}
            {(data.pickupTimeSlot || data.dropoffTimeSlot) && (
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-xs text-slate-400">Time slots</p>
                  <p className="text-sm text-slate-700">
                    {data.pickupTimeSlot && `Pickup: ${data.pickupTimeSlot}`}
                    {data.pickupTimeSlot && data.dropoffTimeSlot && " • "}
                    {data.dropoffTimeSlot && `Return: ${data.dropoffTimeSlot}`}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs text-slate-400">Pickup</p>
                <p className="text-sm text-slate-700">{data.pickupAddress}</p>
              </div>
            </div>
            {data.garageName && (
              <div className="flex items-start gap-3">
                <Building className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-xs text-slate-400">Garage</p>
                  <p className="text-sm text-slate-700">{data.garageName}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Hash className="mt-0.5 h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs text-slate-400">Reference</p>
                <p className="text-sm text-slate-700">{data.reference}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center gap-3">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {data.amountDisplay}{" "}
                    <span className="text-sm font-normal text-slate-400">
                      AUD
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {!clientSecret ? (
          <div className="space-y-3">
            <button
              onClick={handleProceedToPayment}
              disabled={creatingPI}
              className="w-full rounded-full bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingPI ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading payment...
                </span>
              ) : (
                `Pay ${data.amountDisplay} AUD`
              )}
            </button>
            {paymentError && (
              <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                {paymentError}
              </div>
            )}
          </div>
        ) : (
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
            <StripePaymentForm
              onSuccess={() => setSuccess(true)}
              onError={(msg) => setPaymentError(msg)}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              amountDisplay={`${data.amountDisplay} AUD`}
            />
          </Elements>
        )}

        {paymentError && clientSecret && (
          <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
            {paymentError}
          </div>
        )}

        {/* Security note */}
        <p className="text-center text-xs text-slate-400">
          <Shield className="mr-1 inline h-3 w-3" />
          Secure payment powered by Stripe. Your card details are never stored
          on our servers.
        </p>
      </div>
    </div>
  );
}
