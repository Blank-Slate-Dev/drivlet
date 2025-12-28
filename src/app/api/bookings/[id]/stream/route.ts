// src/app/api/bookings/[id]/stream/route.ts
// Server-Sent Events endpoint for real-time booking updates

import { NextRequest } from 'next/server';
import { bookingEvents, BookingEventData } from '@/lib/booking-events';
import { connectDB } from '@/lib/mongodb';
import Booking from '@/models/Booking';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  // Get email and rego from query params for validation
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const rego = searchParams.get('rego');

  if (!email || !rego) {
    return new Response('Missing email or rego parameter', { status: 400 });
  }

  try {
    await connectDB();

    // Verify the booking exists and belongs to this user
    const booking = await Booking.findOne({
      _id: bookingId,
      userEmail: email.toLowerCase().trim(),
      vehicleRegistration: rego.toUpperCase().trim(),
    }).lean();

    if (!booking) {
      return new Response('Booking not found or access denied', { status: 404 });
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        // Send initial connection message
        const connectMsg = `data: ${JSON.stringify({ type: 'connected', bookingId })}\n\n`;
        controller.enqueue(encoder.encode(connectMsg));

        // Send current state immediately
        const initialData: BookingEventData = {
          bookingId: booking._id.toString(),
          currentStage: booking.currentStage,
          overallProgress: booking.overallProgress,
          status: booking.status,
          servicePaymentStatus: booking.servicePaymentStatus,
          updatedAt: booking.updatedAt,
          latestUpdate: booking.updates?.length > 0 
            ? booking.updates[booking.updates.length - 1] 
            : undefined,
        };
        const initialMsg = `data: ${JSON.stringify({ type: 'update', ...initialData })}\n\n`;
        controller.enqueue(encoder.encode(initialMsg));

        // Subscribe to booking updates
        const unsubscribe = bookingEvents.subscribe(bookingId, (data) => {
          const updateMsg = `data: ${JSON.stringify({ type: 'update', ...data })}\n\n`;
          try {
            controller.enqueue(encoder.encode(updateMsg));
          } catch (error) {
            // Stream closed, unsubscribe
            console.log('Stream closed, unsubscribing');
            unsubscribe();
          }
        });

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch {
            clearInterval(heartbeatInterval);
            unsubscribe();
          }
        }, 30000);

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          console.log(`SSE connection closed for booking ${bookingId}`);
          clearInterval(heartbeatInterval);
          unsubscribe();
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('SSE error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}