// src/lib/twilio-voice.ts
// Twilio Voice utilities for two-way call masking

interface TwilioCallResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
}

interface InitiateCallParams {
  toPhoneNumber: string;      // Driver's phone (we call them first)
  customerPhoneNumber: string; // Customer's phone (we connect after driver answers)
  bookingId: string;          // For tracking/logging
  driverName: string;         // For the voice prompt
  customerName: string;       // For the voice prompt
}

interface CallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

/**
 * Format Australian phone number to E.164 format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all spaces, dashes, parentheses
  let formatted = phone.replace(/[\s\-()]/g, '');
  
  // Convert Australian formats to E.164
  if (formatted.startsWith('0')) {
    formatted = '+61' + formatted.substring(1);
  } else if (!formatted.startsWith('+')) {
    formatted = '+61' + formatted;
  }
  
  return formatted;
}

/**
 * Validate that a phone number looks valid
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const formatted = formatPhoneNumber(phone);
  // Basic E.164 validation for Australian numbers
  return /^\+61[2-478]\d{8}$/.test(formatted);
}

/**
 * Get Twilio credentials from environment
 */
function getTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error('Twilio credentials not configured');
  }

  return { accountSid, authToken, phoneNumber };
}

/**
 * Get the app URL for webhooks
 */
function getAppUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://drivlet.com.au';
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

/**
 * Initiate a masked call from driver to customer
 * 
 * Flow:
 * 1. Twilio calls the driver's phone
 * 2. When driver answers, Twilio webhook connects them to customer
 * 3. Both parties see the business number, not each other's personal numbers
 */
export async function initiateDriverToCustomerCall(
  params: InitiateCallParams
): Promise<CallResult> {
  const { toPhoneNumber, customerPhoneNumber, bookingId, driverName, customerName } = params;

  try {
    const { accountSid, authToken, phoneNumber } = getTwilioCredentials();
    const appUrl = getAppUrl();

    const driverPhone = formatPhoneNumber(toPhoneNumber);
    const customerPhone = formatPhoneNumber(customerPhoneNumber);

    // Validate phone numbers
    if (!isValidPhoneNumber(toPhoneNumber)) {
      return { success: false, error: 'Invalid driver phone number' };
    }
    if (!isValidPhoneNumber(customerPhoneNumber)) {
      return { success: false, error: 'Invalid customer phone number' };
    }

    // Build the webhook URL that Twilio will call when driver answers
    // We pass the customer's phone and booking ID as query params
    const webhookUrl = new URL(`${appUrl}/api/twilio/voice/outbound`);
    webhookUrl.searchParams.set('customerPhone', customerPhone);
    webhookUrl.searchParams.set('bookingId', bookingId);
    webhookUrl.searchParams.set('customerName', customerName);

    // Make the API call to Twilio to initiate the call to the driver
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: driverPhone,           // Call the driver first
        From: phoneNumber,         // Show business number as caller ID
        Url: webhookUrl.toString(), // When driver answers, this webhook tells Twilio what to do
        Method: 'POST',
        StatusCallback: `${appUrl}/api/twilio/voice/status`,
        StatusCallbackMethod: 'POST',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Twilio call initiation failed:', errorData);
      return { 
        success: false, 
        error: errorData.message || 'Failed to initiate call' 
      };
    }

    const data: TwilioCallResponse = await response.json();
    console.log('✅ Call initiated to driver:', {
      callSid: data.sid,
      driverPhone,
      bookingId,
    });

    return { success: true, callSid: data.sid };

  } catch (error) {
    console.error('❌ Error initiating call:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generate TwiML to connect the driver to the customer
 * Called by webhook when driver answers the initial call
 */
export function generateConnectToCustomerTwiML(
  customerPhone: string,
  customerName: string
): string {
  const { phoneNumber } = getTwilioCredentials();
  
  // TwiML XML that tells Twilio to:
  // 1. Say a brief message to the driver
  // 2. Dial the customer's phone
  // 3. Show business number as caller ID to customer
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to ${customerName}.</Say>
  <Dial callerId="${phoneNumber}" timeout="30" action="/api/twilio/voice/call-complete">
    <Number>${customerPhone}</Number>
  </Dial>
  <Say voice="alice">The customer did not answer. Goodbye.</Say>
</Response>`;
}

/**
 * Generate TwiML for incoming calls (customer calling back)
 * Looks up the booking and connects to the assigned driver
 */
export function generateConnectToDriverTwiML(
  driverPhone: string,
  driverName: string
): string {
  const { phoneNumber } = getTwilioCredentials();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to your driver, ${driverName}.</Say>
  <Dial callerId="${phoneNumber}" timeout="30" action="/api/twilio/voice/call-complete">
    <Number>${driverPhone}</Number>
  </Dial>
  <Say voice="alice">Your driver did not answer. Please try again later. Goodbye.</Say>
</Response>`;
}

/**
 * Generate TwiML for when we can't find a booking for the caller
 */
export function generateNoBookingFoundTwiML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we couldn't find an active booking for your phone number. If you need assistance, please visit our website at drivlet.com. Goodbye.</Say>
</Response>`;
}

/**
 * Generate TwiML for when no driver is assigned
 */
export function generateNoDriverAssignedTwiML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, no driver has been assigned to your booking yet. Please try again later or check your booking status online. Goodbye.</Say>
</Response>`;
}

/**
 * Generate TwiML for errors
 */
export function generateErrorTwiML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we encountered an error. Please try again later. Goodbye.</Say>
</Response>`;
}
