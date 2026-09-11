// src/lib/sms.ts
// SMS service using Twilio

interface TwilioMessageResponse {
  sid: string;
  status: string;
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('❌ Twilio credentials not configured');
    return false;
  }

  // Format Australian phone number
  let formattedTo = to.replace(/[\s\-()]/g, '');
  if (formattedTo.startsWith('0')) {
    formattedTo = '+61' + formattedTo.substring(1);
  } else if (!formattedTo.startsWith('+')) {
    formattedTo = '+61' + formattedTo;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: fromNumber,
        Body: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Twilio error:', errorData);
      return false;
    }

    const data: TwilioMessageResponse = await response.json();
    console.log('✅ SMS sent successfully, SID:', data.sid);
    return true;

  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    return false;
  }
}

// Service payment ready SMS
export async function sendServicePaymentSMS(
  phoneNumber: string,
  customerName: string,
  vehicleRego: string,
  amount: number, // in cents
  paymentUrl: string
): Promise<boolean> {
  const amountFormatted = (amount / 100).toFixed(2);

  // Copy corrected 2026-09-11: the link can be generated mid-service and
  // payment is not a return gate — no "complete"/withholding claims.
  const message = `Hi ${customerName}, here's the secure link to pay the $${amountFormatted} service amount for your car (${vehicleRego}): ${paymentUrl} You can also pay the service centre directly. - drivlet`;

  return sendSMS(phoneNumber, message);
}

// Booking confirmation SMS
export async function sendBookingConfirmationSMS(
  phoneNumber: string,
  customerName: string,
  vehicleRego: string,
  pickupTime: string,
  trackingUrl: string
): Promise<boolean> {
  const message = `Hi ${customerName}! Your drivlet booking for ${vehicleRego} is confirmed. Pickup: ${pickupTime}. Track: ${trackingUrl}`;
  
  return sendSMS(phoneNumber, message);
}

// sendDriverEnRouteSMS REMOVED (2026-09-11): it was dead code (no callers)
// and interpolated the raw Twilio E.164 number — or the literal string
// "our business number" — into the message. If a driver-en-route SMS is
// ever wanted, build it around the masked-call flow, not the raw number.
