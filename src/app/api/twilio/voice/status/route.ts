// src/app/api/twilio/voice/status/route.ts
// Webhook called by Twilio for call status updates
// Used for logging and optional call tracking

import { NextRequest, NextResponse } from "next/server";
import { validateTwilioSignature, formDataToObject } from "@/lib/twilio-validate";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Validate Twilio webhook signature
    const params = formDataToObject(formData);
    if (!validateTwilioSignature(request, params)) {
      console.error('❌ Invalid Twilio signature on status webhook');
      return new NextResponse('Forbidden', { status: 403 });
    }

    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;

    console.log('📊 Call status update:', {
      callSid,
      status: callStatus,
      duration: callDuration ? `${callDuration}s` : 'N/A',
      from,
      to,
    });

    // You could store call records in a database here for:
    // - Billing reconciliation
    // - Dispute resolution
    // - Usage analytics
    
    // For now, we just log it

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Error processing call status:', error);
    return NextResponse.json({ received: true }); // Always acknowledge
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
