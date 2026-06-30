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
  amount: number;
  amountDisplay: string;
  reference: string;
  status: string;
}

export default function PaymentPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creatingPI, setCreatingPI] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`/api/pay/${token}`);
        if (res.status === 410) {
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Already Paid
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            This booking has already been paid. Check your email for the
            confirmation and tracking code.
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Payment Successful!
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your booking is confirmed. We&apos;ll send you a confirmation email
            with your tracking code shortly.
          </p>
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-700">
              <Shield className="h-4 w-4" />
              <span>
                You&apos;ll receive email updates at every stage of your
                booking.
              </span>
            </div>
          </div>
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
