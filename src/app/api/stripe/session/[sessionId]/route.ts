// src/app/api/stripe/session/[sessionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { requireValidOrigin } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  // CSRF protection - validate request origin
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session.metadata) {
      return NextResponse.json(
        { error: 'No booking details found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      customerName: session.metadata.customerName,
      customerEmail: session.metadata.customerEmail,
      vehicleRegistration: session.metadata.vehicleRegistration,
      vehicleState: session.metadata.vehicleState,
      pickupAddress: session.metadata.pickupAddress,
      serviceType: session.metadata.serviceType,
      earliestPickup: session.metadata.earliestPickup,
      latestDropoff: session.metadata.latestDropoff,
      hasExistingBooking: session.metadata.hasExistingBooking === 'true',
      garageName: session.metadata.garageName,
      amountPaid: session.amount_total,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session details' },
      { status: 500 }
    );
  }
}