// src/lib/appUrl.ts
// Single source of truth for the app's absolute URL, used in customer
// emails, SMS and Stripe redirects. Previously 12 call sites fell back to
// http://localhost:3000, so a missing APP_URL env var silently sent broken
// links to customers in production (pre-launch audit LB-8, 2026-08-02).
// Fallback order mirrors src/lib/twilio-voice.ts: explicit env vars, then
// the production domain on Vercel production, then the deployment URL,
// then localhost for local dev only.

export function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_ENV === "production") return "https://drivlet.com.au";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
