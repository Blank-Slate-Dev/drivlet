// src/app/api/twilio/voice/outbound/route.ts
// Webhook called by Twilio when driver answers the initial call
// Returns TwiML to connect driver to customer

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Get Twilio phone number - fallback to hardcoded if env not available
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+61259416665';
  
  try {
    // Twilio sends form data
    const formData = await request.formData();
    
    // Log the incoming webhook for debugging
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    
    console.log('📞 Outbound webhook received:', {
      callSid,
      callStatus,
    });

    // Get customer phone and booking ID from query params
    const { searchParams } = new URL(request.url);
    const customerPhone = searchParams.get('customerPhone');
    const bookingId = searchParams.get('bookingId');
    const customerName = searchParams.get('customerName') || 'the customer';

    console.log('📞 Webhook params:', {
      customerPhone,
      bookingId,
      customerName,
      twilioPhoneNumber,
    });

    if (!customerPhone) {
      console.error('❌ No customer phone in webhook');
      const errorTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we could not find the customer's phone number. Goodbye.</Say>
</Response>`;
      return new NextResponse(errorTwiML, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    console.log('📞 Connecting driver to customer:', {
      customerPhone,
      bookingId,
      customerName,
    });

    // Generate TwiML to connect to customer
    // TwiML tells Twilio to:
    // 1. Say a brief message to the driver
    // 2. Dial the customer's phone
    // 3. Show business number as caller ID to customer
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to ${customerName}.</Say>
  <Dial callerId="${twilioPhoneNumber}" timeout="30" action="/api/twilio/voice/call-complete">
    <Number>${customerPhone}</Number>
  </Dial>
  <Say voice="alice">The customer did not answer. Goodbye.</Say>
</Response>`;

    console.log('📞 Returning TwiML:', twiml);

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (error) {
    console.error('❌ Error in outbound webhook:', error);
    const errorTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we encountered an error. Please try again later. Goodbye.</Say>
</Response>`;
    return new NextResponse(errorTwiML, {
      status: 200, // Must return 200 for Twilio to process
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}

// Twilio may also send GET requests for some operations
export async function GET(request: NextRequest) {
  return POST(request);
}
