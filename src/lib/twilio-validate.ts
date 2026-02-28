// src/lib/twilio-validate.ts
// Validates Twilio webhook signatures without requiring the Twilio SDK
// See: https://www.twilio.com/docs/usage/security#validating-requests

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

/**
 * Validate that a request genuinely came from Twilio by checking the
 * X-Twilio-Signature header against the auth token.
 *
 * Twilio signs requests using HMAC-SHA1:
 *  1. Take the full URL of the webhook
 *  2. Sort POST parameters alphabetically by key
 *  3. Append each key/value pair to the URL string
 *  4. HMAC-SHA1 with auth token, then base64 encode
 */
export function validateTwilioSignature(
  request: NextRequest,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn("TWILIO_AUTH_TOKEN not set — skipping signature validation");
    return false;
  }

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    console.warn("Missing X-Twilio-Signature header");
    return false;
  }

  // Build the full URL that Twilio used when signing
  // Twilio includes the query string in the URL for signature generation
  // In production behind a proxy, use x-forwarded-proto + host
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host") || "";
  const url = new URL(request.url);
  const fullUrl = `${proto}://${host}${url.pathname}${url.search}`;

  // Sort params alphabetically and append key+value to URL
  let data = fullUrl;
  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // Compute HMAC-SHA1
  const expectedSignature = createHmac("sha1", authToken)
    .update(data)
    .digest("base64");

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Helper to extract form data as a plain object for validation
 */
export function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  formData.forEach((value, key) => {
    obj[key] = String(value);
  });
  return obj;
}
