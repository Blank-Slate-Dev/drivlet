// src/app/api/twilio/voice/outbound/route.ts
// Webhook called by Twilio when driver answers the initial call

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log('🔵 OUTBOUND WEBHOOK HIT');
  
  const twilioPhoneNumber = '+61259416665';
  
  try {
    // Get query params from URL
    const url = new URL(request.url);
    const customerPhone = url.searchParams.get('customerPhone');
    const customerName = url.searchParams.get('customerName') || 'the customer';
    const bookingId = url.searchParams.get('bookingId');

    console.log('🔵 Query params:', { customerPhone, customerName, bookingId });

    if (!customerPhone) {
      console.log('❌ No customerPhone in query params');
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">No customer phone number provided.</Say></Response>`,
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }

    // Build TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to ${customerName}.</Say>
  <Dial callerId="${twilioPhoneNumber}" timeout="30">
    <Number>${customerPhone}</Number>
  </Dial>
  <Say voice="alice">The customer did not answer. Goodbye.</Say>
</Response>`;

    console.log('✅ Returning TwiML:', twiml);

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (error) {
    console.error('❌ OUTBOUND ERROR:', error);
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Sorry, we encountered an error. Please try again later. Goodbye.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
