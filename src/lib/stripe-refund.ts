// src/lib/stripe-refund.ts
// Handles Stripe refund processing for booking cancellations

import { stripe } from './stripe';

export interface RefundResult {
  success: boolean;
  refundId?: string;
  status?: string;
  amount?: number;
  error?: string;
  estimatedArrival?: string;
}

/**
 * Process a refund for a payment
 *
 * @param paymentIntentId - The Stripe Payment Intent ID (pi_xxx)
 * @param refundAmount - Amount to refund in cents
 * @param reason - Reason for the refund
 * @param metadata - Additional metadata to attach to the refund
 */
export async function processRefund(
  paymentIntentId: string,
  refundAmount: number,
  reason: string,
  metadata?: Record<string, string>
): Promise<RefundResult> {
  try {
    // Validate payment intent ID format
    if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
      return {
        success: false,
        error: 'Invalid payment intent ID',
      };
    }

    // Don't process zero refunds
    if (refundAmount <= 0) {
      return {
        success: true,
        refundId: 'no_refund_required',
        status: 'succeeded',
        amount: 0,
        estimatedArrival: 'N/A - No refund amount',
      };
    }

    // Create the refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        ...metadata,
      },
    });

    // Estimate arrival time (typically 5-10 business days)
    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 7); // Add 7 days as estimate
    const estimatedArrival = arrivalDate.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      success: true,
      refundId: refund.id,
      status: refund.status ?? undefined,
      amount: refund.amount,
      estimatedArrival: `Approximately ${estimatedArrival} (5-10 business days)`,
    };
  } catch (error) {
    console.error('Stripe refund failed:', error);

    // Handle specific Stripe errors
    if (error instanceof Error) {
      // Check for common Stripe error types
      const errorMessage = error.message;

      if (errorMessage.includes('charge_already_refunded')) {
        return {
          success: false,
          error: 'This payment has already been refunded.',
        };
      }

      if (errorMessage.includes('amount_too_large')) {
        return {
          success: false,
          error: 'Refund amount exceeds the original payment amount.',
        };
      }

      if (errorMessage.includes('No such payment_intent')) {
        return {
          success: false,
          error: 'Payment record not found. Please contact support.',
        };
      }

      return {
        success: false,
        error: `Refund failed: ${errorMessage}`,
      };
    }

    return {
      success: false,
      error: 'An unexpected error occurred while processing the refund.',
    };
  }
}

/**
 * Check if a payment has already been refunded
 */
export async function checkRefundStatus(paymentIntentId: string): Promise<{
  refunded: boolean;
  refundedAmount: number;
  refunds: Array<{ id: string; amount: number; status: string }>;
}> {
  try {
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntentId,
    });

    const totalRefunded = refunds.data.reduce((sum, refund) => {
      return sum + (refund.status === 'succeeded' ? refund.amount : 0);
    }, 0);

    return {
      refunded: refunds.data.length > 0,
      refundedAmount: totalRefunded,
      refunds: refunds.data.map((r) => ({
        id: r.id,
        amount: r.amount,
        status: r.status || 'unknown',
      })),
    };
  } catch (error) {
    console.error('Failed to check refund status:', error);
    return {
      refunded: false,
      refundedAmount: 0,
      refunds: [],
    };
  }
}

/**
 * Get payment details for verification
 */
export async function getPaymentDetails(paymentIntentId: string): Promise<{
  found: boolean;
  amount?: number;
  status?: string;
  refundedAmount?: number;
}> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      found: true,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
      refundedAmount: paymentIntent.amount - (paymentIntent.amount_received || 0),
    };
  } catch (error) {
    console.error('Failed to get payment details:', error);
    return {
      found: false,
    };
  }
}
