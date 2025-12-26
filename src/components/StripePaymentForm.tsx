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
}

export default function StripePaymentForm({
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
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
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/success`,
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
            Pay $119.00 AUD
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
