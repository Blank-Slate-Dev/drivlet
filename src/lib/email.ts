// src/lib/email.ts
// Email service using Mailjet

import Mailjet from 'node-mailjet';

// Only initialize Mailjet if credentials are present
const mailjet = process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY
  ? new Mailjet({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_SECRET_KEY,
    })
  : null;

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

  try {
    const result = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.EMAIL_FROM || 'noreply@drivlet.com.au',
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

    console.log('✅ Email sent successfully to:', options.to);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
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

// Service payment ready email
export async function sendServicePaymentEmail(
  customerEmail: string,
  customerName: string,
  vehicleRego: string,
  amount: number, // in cents
  paymentUrl: string,
  garageName?: string
): Promise<boolean> {
  const amountFormatted = (amount / 100).toFixed(2);
  
  const subject = `Your car is ready! Pay $${amountFormatted} to get it back - ${vehicleRego}`;
  
  const textContent = `
Hi ${customerName},

Great news! Your car service is complete.

Vehicle: ${vehicleRego}
${garageName ? `Service at: ${garageName}` : ''}
Amount due: $${amountFormatted} AUD

Pay now to have your car delivered back to you:
${paymentUrl}

Our driver is ready and waiting to bring your car home as soon as you pay.

Questions? Reply to this email or call us.

Thanks,
The drivlet Team
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Your car is ready! 🚗</h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; color: #475569; font-size: 16px;">Hi ${customerName},</p>
        
        <p style="margin: 0 0 24px; color: #475569; font-size: 16px;">Great news! Your car service is complete and ready for delivery.</p>
        
        <!-- Details Box -->
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <div style="margin-bottom: 12px;">
            <span style="color: #64748b; font-size: 14px;">Vehicle</span>
            <div style="color: #1e293b; font-size: 18px; font-weight: 600;">${vehicleRego}</div>
          </div>
          ${garageName ? `
          <div style="margin-bottom: 12px;">
            <span style="color: #64748b; font-size: 14px;">Service at</span>
            <div style="color: #1e293b; font-size: 16px;">${garageName}</div>
          </div>
          ` : ''}
          <div>
            <span style="color: #64748b; font-size: 14px;">Amount due</span>
            <div style="color: #059669; font-size: 28px; font-weight: 700;">$${amountFormatted}</div>
          </div>
        </div>
        
        <!-- CTA Button -->
        <a href="${paymentUrl}" style="display: block; background: #059669; color: white; text-decoration: none; text-align: center; padding: 16px 32px; border-radius: 9999px; font-size: 16px; font-weight: 600; margin-bottom: 24px;">
          Pay Now & Get Your Car
        </a>
        
        <p style="margin: 0; color: #64748b; font-size: 14px; text-align: center;">
          Our driver is ready to bring your car home as soon as you pay.
        </p>
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
  } = data;

  const content = STAGE_EMAIL_CONTENT[currentStage];
  if (!content) {
    console.warn(`⚠️ No email content defined for stage: ${currentStage}`);
    return false;
  }

  const appUrl = getAppUrl();
  const progress = STAGE_PROGRESS[currentStage] || 0;
  const message = customMessage || content.message;

  // Build tracking URL if tracking code exists
  const trackingUrl = trackingCode
    ? `${appUrl}/track?code=${trackingCode}`
    : `${appUrl}/track`;

  const subject = `${content.emoji} ${content.subject} — ${vehicleRegistration}`;

  // ── Plain text version ──
  const textContent = `
${content.heading}

Hi ${customerName},

${message}

Vehicle: ${vehicleRegistration}
${garageName ? `Service at: ${garageName}` : ''}
Progress: ${progress}%

Track your booking: ${trackingUrl}

Questions? Reply to this email or visit drivlet.com.au

---
drivlet - Car service made simple
Newcastle, Australia
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
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">${vehicleRegistration}</p>
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
                Hi ${customerName},
              </p>

              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                ${message}
              </p>

              <!-- Details Box -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 0 0 12px;">
                      <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Vehicle</span>
                      <div style="color: #1e293b; font-size: 16px; font-weight: 600; margin-top: 2px;">${vehicleRegistration}</div>
                    </td>
                    <td style="padding: 0 0 12px; text-align: right;">
                      <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Progress</span>
                      <div style="color: ${content.color}; font-size: 16px; font-weight: 700; margin-top: 2px;">${progress}%</div>
                    </td>
                  </tr>
                  ${garageName ? `
                  <tr>
                    <td colspan="2" style="padding: 12px 0 0; border-top: 1px solid #e2e8f0;">
                      <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Service Centre</span>
                      <div style="color: #1e293b; font-size: 15px; margin-top: 2px;">${garageName}</div>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 0 0 8px;">
                    <a href="${trackingUrl}" style="display: inline-block; background-color: ${content.color}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 40px; border-radius: 9999px; box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.15);">
                      Track Your Booking
                    </a>
                  </td>
                </tr>
              </table>
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