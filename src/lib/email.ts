// src/lib/email.ts
// Email service using Mailjet

import Mailjet from 'node-mailjet';
import { CANCELLATION_POLICY_TEXT, SUPPORT_PHONE, SUPPORT_EMAIL } from './policy';

const EMAIL_DEBUG = process.env.NODE_ENV !== 'production';

// Only initialize Mailjet if credentials are present
const mailjet = process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY
  ? new Mailjet({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_SECRET_KEY,
    })
  : null;

// Escape HTML special characters to prevent injection in email templates
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  textContent: string;
  htmlContent: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!mailjet) {
    console.warn('⚠️ Mailjet not configured - skipping email send');
    return false;
  }

  const fromEmail = process.env.EMAIL_FROM || 'noreply@drivlet.com.au';
  if (EMAIL_DEBUG) console.log(`[EMAIL_DEBUG] sendEmail called — from=${fromEmail}, to=${options.to}, subject="${options.subject}"`);

  try {
    const result = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: fromEmail,
            Name: 'drivlet',
          },
          To: [
            {
              Email: options.to,
              Name: options.toName || options.to,
            },
          ],
          Subject: options.subject,
          TextPart: options.textContent,
          HTMLPart: options.htmlContent,
        },
      ],
    });

    if (EMAIL_DEBUG) {
      const statusCode = (result as { response?: { status?: number } }).response?.status;
      console.log(`[EMAIL_DEBUG] Mailjet success — status=${statusCode}, body=${JSON.stringify(result.body)}`);
      console.log('✅ Email sent successfully to:', options.to);
    }
    return true;
  } catch (error: unknown) {
    const err = error as { statusCode?: number; ErrorMessage?: string; message?: string; response?: { status?: number } };
    console.error(`❌ Failed to send email — statusCode=${err.statusCode}, message=${err.ErrorMessage || err.message}, responseStatus=${err.response?.status}`);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════
// Shared building blocks — every customer email should include the booking
// details block and the policy footer so customers always have full context.
// ════════════════════════════════════════════════════════════════════════

export interface BookingEmailDetails {
  vehicleRegistration?: string;
  vehicleDescription?: string;
  serviceType?: string;
  serviceDate?: Date | string;
  pickupTime?: string;
  dropoffTime?: string;
  pickupAddress?: string;
  garageName?: string;
  trackingCode?: string;
  amount?: number; // cents
}

function formatServiceDate(date?: Date | string): string | undefined {
  if (!date) return undefined;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : undefined;
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function detailPairs(d: BookingEmailDetails): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  if (d.vehicleRegistration) pairs.push(['Vehicle', d.vehicleDescription ? `${d.vehicleRegistration} — ${d.vehicleDescription}` : d.vehicleRegistration]);
  if (d.serviceType) pairs.push(['Service', d.serviceType]);
  const dateStr = formatServiceDate(d.serviceDate);
  if (dateStr) pairs.push(['Date', dateStr]);
  if (d.pickupTime) pairs.push(['Pickup window', d.pickupTime]);
  if (d.dropoffTime) pairs.push(['Return window', d.dropoffTime]);
  if (d.pickupAddress) pairs.push(['Pickup address', d.pickupAddress]);
  if (d.garageName) pairs.push(['Service centre', d.garageName]);
  if (typeof d.amount === 'number') pairs.push(['Amount', `$${(d.amount / 100).toFixed(2)} AUD`]);
  if (d.trackingCode) pairs.push(['Tracking code', d.trackingCode]);
  return pairs;
}

/** HTML table of booking details for embedding in any email template. */
export function bookingDetailsHtml(d: BookingEmailDetails): string {
  const pairs = detailPairs(d);
  if (pairs.length === 0) return '';
  const rows = pairs
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding: 6px 12px 6px 0; color: #64748b; font-size: 13px; white-space: nowrap; vertical-align: top;">${escapeHtml(label)}</td>
        <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${escapeHtml(value)}</td>
      </tr>`
    )
    .join('');
  return `
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
    <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Booking details</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">${rows}</table>
  </div>`;
}

/** Plain-text booking details for the text part of any email. */
export function bookingDetailsText(d: BookingEmailDetails): string {
  const pairs = detailPairs(d);
  if (pairs.length === 0) return '';
  return ['Booking details:', ...pairs.map(([label, value]) => `  ${label}: ${value}`)].join('\n');
}

/** Standard footer: cancellation policy disclaimer + support contact. */
export function emailPolicyFooterHtml(): string {
  return `
  <div style="margin-top: 8px; padding: 14px 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px;">
    <p style="margin: 0; color: #92400e; font-size: 12px; line-height: 1.6;">${escapeHtml(CANCELLATION_POLICY_TEXT)}</p>
  </div>
  <p style="margin: 12px 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
    Need help? Call <a href="tel:${SUPPORT_PHONE.replace(/\s/g, '')}" style="color: #059669; text-decoration: none;">${SUPPORT_PHONE}</a>
    or email <a href="mailto:${SUPPORT_EMAIL}" style="color: #059669; text-decoration: none;">${SUPPORT_EMAIL}</a>
  </p>`;
}

export function emailPolicyFooterText(): string {
  return `${CANCELLATION_POLICY_TEXT}\n\nNeed help? Call ${SUPPORT_PHONE} or email ${SUPPORT_EMAIL}`;
}

// Get app URL at runtime (not at module load time)
function getAppUrl(): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// Email verification with 6-digit code
export async function sendVerificationEmail(
  email: string,
  username: string,
  code: string
): Promise<boolean> {
  const appUrl = getAppUrl();
  const verificationUrl = `${appUrl}/auth/verify?code=${code}`;

  // Format code with spaces for readability: "123 456"
  const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;

  const subject = `Your verification code is ${code} - Drivlet`;

  const textContent = `
Verify your email address

Hi ${username},

Thanks for signing up for Drivlet! Your verification code is:

${formattedCode}

Enter this code on the verification page, or click the link below to verify automatically:
${verificationUrl}

This code will expire in 24 hours.

If you didn't create an account with Drivlet, you can safely ignore this email.

---
Drivlet - Car service made simple
Newcastle, Australia
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email - Drivlet</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Drivlet</h1>
              <p style="margin: 8px 0 0; color: #d1fae5; font-size: 14px;">Car service made simple</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px; font-weight: 600;">Verify your email address</h2>

              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                Hi ${username},
              </p>

              <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
                Thanks for signing up for Drivlet! Your verification code is:
              </p>

              <!-- Code Display -->
              <div style="margin: 24px 0; padding: 24px; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px solid #86efac; border-radius: 12px; text-align: center;">
                <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #059669; font-family: 'Courier New', monospace;">
                  ${code.split('').join(' ')}
                </div>
              </div>

              <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">
                Enter this code on the verification page
              </p>

              <!-- Divider -->
              <div style="margin: 24px 0; border-top: 1px solid #e2e8f0;"></div>

              <p style="margin: 0 0 16px; color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
                Or click the button below to verify automatically:
              </p>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${verificationUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px 0 rgba(5, 150, 105, 0.4);">
                      Verify Automatically
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; color: #64748b; font-size: 14px; line-height: 1.6;">
                This code will expire in 24 hours.
              </p>

              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                If you didn't create an account with Drivlet, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Drivlet. All rights reserved.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Newcastle, Australia
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return sendEmail({
    to: email,
    toName: username,
    subject,
    textContent,
    htmlContent,
  });
}

// Service payment ready email — sent when the garage has finished and the
// service invoice is ready. The primary link points at the tracking page
// (embedded payment, never expires) rather than the raw Stripe Checkout URL,
// which Stripe expires after 24 hours.
export async function sendServicePaymentEmail(
  customerEmail: string,
  customerName: string,
  vehicleRego: string,
  amount: number, // in cents
  paymentUrl: string,
  garageName?: string,
  trackingCode?: string
): Promise<boolean> {
  const amountFormatted = (amount / 100).toFixed(2);
  const safeCustomerName = escapeHtml(customerName);
  const appUrl = getAppUrl();
  // Prefer the tracking page (durable, embedded payment); fall back to the
  // Stripe Checkout URL for legacy bookings without a tracking code.
  const payLink = trackingCode ? `${appUrl}/track?code=${trackingCode}` : paymentUrl;

  const details: BookingEmailDetails = {
    vehicleRegistration: vehicleRego,
    garageName,
    amount,
    trackingCode,
  };

  const subject = `Your car is ready — service payment of $${amountFormatted} due (${vehicleRego})`;

  const textContent = `
Hi ${customerName},

Good news — the service on your car is complete.

${bookingDetailsText(details)}

How to pay and get your car back:
1. Open your tracking page: ${payLink}
2. Review the service amount and pay securely by card.
3. Once payment is confirmed, our driver will return your car to you.

${emailPolicyFooterText()}

Thanks,
The drivlet team
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Your car is ready 🚗</h1>
        <p style="margin: 8px 0 0; color: #d1fae5; font-size: 14px;">Service payment of $${amountFormatted} due</p>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; color: #475569; font-size: 16px;">Hi ${safeCustomerName},</p>

        <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">Good news — the service on your car is complete. Once the service payment below is confirmed, our driver will return your car to you.</p>

        ${bookingDetailsHtml(details)}

        <!-- CTA Button -->
        <a href="${payLink}" style="display: block; background: #059669; color: white; text-decoration: none; text-align: center; padding: 16px 32px; border-radius: 9999px; font-size: 16px; font-weight: 600; margin-bottom: 16px;">
          Pay $${amountFormatted} securely
        </a>

        <p style="margin: 0 0 24px; color: #64748b; font-size: 13px; text-align: center; line-height: 1.6;">
          The link opens your tracking page, where you can review the amount and pay by card. Payment is processed securely by Stripe.
        </p>

        ${emailPolicyFooterHtml()}
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          Questions? Reply to this email or visit <a href="https://drivlet.com.au" style="color: #059669;">drivlet.com.au</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: customerEmail,
    toName: customerName,
    subject,
    textContent,
    htmlContent,
  });
}


// ════════════════════════════════════════════════════════════════════════
// Booking stage update email — sent on every stage progression
// ════════════════════════════════════════════════════════════════════════

// Stage-specific content for emails
interface StageEmailContent {
  emoji: string;
  heading: string;
  subject: string;
  message: string;
  color: string; // hex accent color for the stage
}

const STAGE_EMAIL_CONTENT: Record<string, StageEmailContent> = {
  booking_confirmed: {
    emoji: "✅",
    heading: "Booking Confirmed",
    subject: "Your booking is confirmed",
    message: "We've locked in your pick-up and service details. Our team will be in touch soon with next steps.",
    color: "#059669",
  },
  driver_en_route: {
    emoji: "🚗",
    heading: "Driver On The Way",
    subject: "Your driver is on the way",
    message: "Your driver is heading to your location to collect your vehicle. Please have your keys ready!",
    color: "#2563eb",
  },
  car_picked_up: {
    emoji: "📦",
    heading: "Car Picked Up",
    subject: "Your car has been picked up",
    message: "Your vehicle has been collected and is on its way to the service centre. We'll keep you updated on its progress.",
    color: "#7c3aed",
  },
  at_garage: {
    emoji: "📍",
    heading: "Arrived at Garage",
    subject: "Your car has arrived at the garage",
    message: "Your vehicle has safely arrived at the service centre and is ready to be worked on.",
    color: "#0891b2",
  },
  service_in_progress: {
    emoji: "🔧",
    heading: "Service In Progress",
    subject: "Your car is being serviced",
    message: "Our expert mechanics are working on your vehicle. We'll let you know as soon as it's ready.",
    color: "#d97706",
  },
  driver_returning: {
    emoji: "🏠",
    heading: "On Its Way Back",
    subject: "Your car is on its way back to you",
    message: "Great news! Service is complete and your driver is bringing your car back to you.",
    color: "#2563eb",
  },
  delivered: {
    emoji: "🎉",
    heading: "Delivered!",
    subject: "Your car has been delivered",
    message: "Your vehicle has been delivered. Thanks for choosing drivlet — we hope to see you again!",
    color: "#059669",
  },
};

// Progress percentages matching STAGE_PROGRESS in admin route
const STAGE_PROGRESS: Record<string, number> = {
  booking_confirmed: 14,
  driver_en_route: 28,
  car_picked_up: 42,
  at_garage: 57,
  service_in_progress: 72,
  driver_returning: 86,
  delivered: 100,
};

export interface BookingStageEmailData {
  customerEmail: string;
  customerName: string;
  vehicleRegistration: string;
  currentStage: string;
  trackingCode?: string;
  garageName?: string;
  /** Optional override message (e.g. from admin custom message) */
  customMessage?: string;
  // Booking details included in every stage email
  serviceType?: string;
  serviceDate?: Date | string;
  pickupTime?: string;
  dropoffTime?: string;
  pickupAddress?: string;
}

export async function sendBookingStageEmail(
  data: BookingStageEmailData
): Promise<boolean> {
  const {
    customerEmail,
    customerName,
    vehicleRegistration,
    currentStage,
    trackingCode,
    garageName,
    customMessage,
    serviceType,
    serviceDate,
    pickupTime,
    dropoffTime,
    pickupAddress,
  } = data;

  const content = STAGE_EMAIL_CONTENT[currentStage];
  if (!content) {
    console.warn(`⚠️ No email content defined for stage: ${currentStage}`);
    return false;
  }

  const appUrl = getAppUrl();
  const progress = STAGE_PROGRESS[currentStage] || 0;
  const message = customMessage || content.message;

  // Escape user-supplied values for HTML templates
  const safeCustomerName = escapeHtml(customerName);
  const safeVehicleRegistration = escapeHtml(vehicleRegistration);
  const safeMessage = escapeHtml(message);

  // Build tracking URL if tracking code exists
  const trackingUrl = trackingCode
    ? `${appUrl}/track?code=${trackingCode}`
    : `${appUrl}/track`;

  const subject = `${content.emoji} ${content.subject} — ${vehicleRegistration}`;

  const details: BookingEmailDetails = {
    vehicleRegistration,
    serviceType,
    serviceDate,
    pickupTime,
    dropoffTime,
    pickupAddress,
    garageName,
    trackingCode,
  };

  // ── Plain text version ──
  const textContent = `
${content.heading}

Hi ${customerName},

${message}

${bookingDetailsText(details)}
Progress: ${progress}%

Track your booking: ${trackingUrl}

${emailPolicyFooterText()}

---
drivlet - Car service made simple
`.trim();

  // ── HTML version ──
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${content.color} 0%, ${content.color}dd 100%); padding: 36px 32px 28px; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 12px;">${content.emoji}</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">${content.heading}</h1>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">${safeVehicleRegistration}</p>
            </td>
          </tr>

          <!-- Progress Bar -->
          <tr>
            <td style="padding: 0;">
              <div style="height: 6px; background-color: #e2e8f0;">
                <div style="height: 6px; width: ${progress}%; background-color: ${content.color}; transition: width 0.3s;"></div>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                Hi ${safeCustomerName},
              </p>

              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                ${safeMessage}
              </p>

              <!-- Details Box -->
              ${bookingDetailsHtml(details)}

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 0 0 20px;">
                    <a href="${trackingUrl}" style="display: inline-block; background-color: ${content.color}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 40px; border-radius: 9999px; box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.15);">
                      Track Your Booking
                    </a>
                  </td>
                </tr>
              </table>

              ${emailPolicyFooterHtml()}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; background-color: #f8fafc;">
              <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px;">
                Questions? Reply to this email or visit <a href="https://drivlet.com.au" style="color: #059669; text-decoration: none;">drivlet.com.au</a>
              </p>
              <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                &copy; ${new Date().getFullYear()} drivlet &middot; Newcastle, Australia
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return sendEmail({
    to: customerEmail,
    toName: customerName,
    subject,
    textContent,
    htmlContent,
  });
}
// ════════════════════════════════════════════════════════════════════════
// Signed handover form copy — emailed to the customer after they sign the
// pickup consent or return confirmation form on the driver's device.
// ════════════════════════════════════════════════════════════════════════

export interface SignedFormEmailData {
  customerEmail: string;
  customerName: string;
  formType: "pickup_consent" | "return_confirmation";
  vehicleRegistration?: string;
  trackingCode?: string;
  submittedAt: Date;
  /** [label, value] pairs summarising the recorded form fields. */
  fields: Array<[string, string]>;
}

const FORM_EMAIL_META: Record<
  SignedFormEmailData["formType"],
  { title: string; intro: string }
> = {
  pickup_consent: {
    title: "Vehicle Pick-up Condition & Consent Form",
    intro:
      "Thanks for signing the pick-up consent form. Here is a copy of what was recorded when our driver collected your vehicle. Photos of your vehicle were also taken and are stored securely against your booking.",
  },
  return_confirmation: {
    title: "Vehicle Return Confirmation & Acceptance Form",
    intro:
      "Thanks for confirming the return of your vehicle. Here is a copy of what was recorded at the time of return. Photos taken during the service journey remain stored securely against your booking.",
  },
};

export async function sendSignedFormEmail(
  data: SignedFormEmailData
): Promise<boolean> {
  const meta = FORM_EMAIL_META[data.formType];
  const appUrl = getAppUrl();
  const trackingUrl = data.trackingCode
    ? `${appUrl}/track?code=${data.trackingCode}`
    : null;

  const submitted = data.submittedAt.toLocaleString("en-AU", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Australia/Sydney",
  });

  const subject = `Your signed copy — ${meta.title}${data.vehicleRegistration ? ` (${data.vehicleRegistration})` : ""}`;

  const fieldRowsHtml = data.fields
    .filter(([, value]) => value && value.trim() !== "")
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding: 6px 12px 6px 0; color: #64748b; font-size: 13px; white-space: nowrap; vertical-align: top;">${escapeHtml(label)}</td>
        <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${escapeHtml(value)}</td>
      </tr>`
    )
    .join("");

  const fieldsText = data.fields
    .filter(([, value]) => value && value.trim() !== "")
    .map(([label, value]) => `  ${label}: ${value}`)
    .join("\n");

  const textContent = `
${meta.title}

Hi ${data.customerName},

${meta.intro}

Signed: ${submitted}

${fieldsText}
${trackingUrl ? `\nTrack your booking: ${trackingUrl}\n` : ""}
This form was signed digitally and is stored securely with your booking, as set out in our Privacy Policy. Nothing in this form limits your rights under Australian Consumer Law.

---
drivlet - Car service made simple
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: #059669; padding: 24px 32px;">
              <p style="margin: 0; color: #a7f3d0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your signed copy</p>
              <h1 style="margin: 4px 0 0; color: #ffffff; font-size: 20px;">${escapeHtml(meta.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <p style="margin: 0 0 16px; color: #1e293b; font-size: 15px;">Hi ${escapeHtml(data.customerName)},</p>
              <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.6;">${escapeHtml(meta.intro)}</p>
              <p style="margin: 0 0 16px; color: #64748b; font-size: 13px;">Signed: <strong style="color: #1e293b;">${escapeHtml(submitted)}</strong></p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
                <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Recorded details</p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">${fieldRowsHtml}</table>
              </div>
              ${trackingUrl ? `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px;">
                <tr>
                  <td style="border-radius: 999px; background-color: #059669;">
                    <a href="${trackingUrl}" style="display: inline-block; padding: 12px 28px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none;">Track your booking</a>
                  </td>
                </tr>
              </table>` : ""}
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
                This form was signed digitally and is stored securely with your booking, as set out in our Privacy Policy.
                Nothing in this form limits your rights under Australian Consumer Law.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; background-color: #f8fafc;">
              <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px;">
                Questions? Reply to this email or visit <a href="https://drivlet.com.au" style="color: #059669; text-decoration: none;">drivlet.com.au</a>
              </p>
              <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                &copy; ${new Date().getFullYear()} drivlet &middot; Newcastle, Australia
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return sendEmail({
    to: data.customerEmail,
    toName: data.customerName,
    subject,
    textContent,
    htmlContent,
  });
}
