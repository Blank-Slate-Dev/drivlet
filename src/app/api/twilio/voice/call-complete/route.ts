// src/app/api/twilio/voice/call-complete/route.ts
// Webhook called by Twilio after a <Dial> completes
// Used for logging call outcomes

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const callSid = formData.get('CallSid') as string;
    const dialCallStatus = formData.get('DialCallStatus') as string;
    const dialCallDuration = formData.get('DialCallDuration') as string;
    const dialCallSid = formData.get('DialCallSid') as string;

    console.log('📞 Call completed:', {
      parentCallSid: callSid,
      dialCallSid,
      status: dialCallStatus,
      duration: dialCallDuration ? `${dialCallDuration}s` : 'N/A',
    });

    // Return empty TwiML to end the call gracefully
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (error) {
    console.error('❌ Error processing call completion:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
