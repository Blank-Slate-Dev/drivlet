// src/app/api/twilio/voice/outbound/route.ts
// Webhook called by Twilio when driver answers the initial call

import { NextRequest, NextResponse } from "next/server";
import { validateTwilioSignature } from "@/lib/twilio-validate";

export async function POST(request: NextRequest) {
  console.log('🔵 OUTBOUND WEBHOOK HIT');
  
  const twilioPhoneNumber = '+61259416665';
  
  try {
    // Validate Twilio webhook signature (empty params for GET-style requests;
    // query string is included in the URL used for signature generation)
    if (!validateTwilioSignature(request, {})) {
      console.error('❌ Invalid Twilio signature on outbound webhook');
      return new NextResponse('Forbidden', { status: 403 });
    }

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

    // Validate phone number format (E.164: + followed by digits only)
    if (!/^\+?[0-9]+$/.test(customerPhone)) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Invalid phone number provided.</Say></Response>`,
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }

    // Escape XML special characters to prevent TwiML injection
    const escapeXml = (str: string) => str.replace(/[&<>"']/g, (c) => {
      const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
      return map[c] || c;
    });

    const safePhone = escapeXml(customerPhone);

    // Build TwiML response
    // Driver hears this message, then gets connected to the customer
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting your call now.</Say>
  <Dial callerId="${twilioPhoneNumber}" timeout="30">
    <Number>${safePhone}</Number>
  </Dial>
  <Say voice="alice">The customer did not answer. Please try again later. Goodbye.</Say>
</Response>`;

    console.log('✅ Returning TwiML');

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (error) {
    console.error('❌ OUTBOUND ERROR:', error);
    
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Sorry, we encountered an error. Please try again later. Goodbye.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
