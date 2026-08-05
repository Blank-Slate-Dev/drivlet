// src/components/StripePaymentForm.tsx
'use client';

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Loader2, Lock } from 'lucide-react';

interface StripePaymentFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  amountDisplay?: string;
}

export default function StripePaymentForm({
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
  amountDisplay,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // audit B-17: return_url used to be `/booking/success`, which belongs to
      // the retired Checkout flow. Any card needing a redirect-based
      // authentication step (3-D Secure) therefore left /pay/[token] and came
      // back on a page that showed "Booking Confirmed! Payment received."
      // unconditionally — even when redirect_status was `failed`.
      //
      // Returning to the CURRENT page lets the page that started the payment
      // handle the outcome, poll for the tracking code, and show a real error
      // when the authentication failed.
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          onError(error.message || 'Payment failed');
        } else {
          onError('An unexpected error occurred');
        }
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess();
      } else {
        // Payment requires additional action (3D Secure, etc.)
        // The redirect will handle this
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      onError('Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <PaymentElement
          onReady={() => setIsReady(true)}
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                address: {
                  country: 'AU',
                },
              },
            },
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing || !isReady}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing payment...
          </>
        ) : !isReady ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <Lock className="h-5 w-5" />
            Pay {amountDisplay || "now"}
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
