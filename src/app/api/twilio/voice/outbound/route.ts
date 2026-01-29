// src/app/api/twilio/voice/outbound/route.ts
// Webhook called by Twilio when driver answers the initial call
// Returns TwiML to connect driver to customer

import { NextRequest, NextResponse } from "next/server";
import { 
  generateConnectToCustomerTwiML, 
  generateErrorTwiML 
} from "@/lib/twilio-voice";

export async function POST(request: NextRequest) {
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

    if (!customerPhone) {
      console.error('❌ No customer phone in webhook');
      const errorTwiML = generateErrorTwiML();
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
    const twiml = generateConnectToCustomerTwiML(customerPhone, customerName);

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (error) {
    console.error('❌ Error in outbound webhook:', error);
    const errorTwiML = generateErrorTwiML();
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
