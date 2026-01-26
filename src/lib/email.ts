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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Email verification
export async function sendVerificationEmail(
  email: string,
  username: string,
  token: string
): Promise<boolean> {
  const verificationUrl = `${APP_URL}/auth/verify?token=${token}`;

  const subject = "Verify your email - Drivlet";

  const textContent = `
Verify your email address

Hi ${username},

Thanks for signing up for Drivlet! Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

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

              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                Thanks for signing up for Drivlet! Please verify your email address by clicking the button below.
              </p>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 16px 0 32px;">
                    <a href="${verificationUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px 0 rgba(5, 150, 105, 0.4);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #64748b; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>

              <p style="margin: 0 0 24px; padding: 12px 16px; background-color: #f1f5f9; border-radius: 8px; word-break: break-all;">
                <a href="${verificationUrl}" style="color: #059669; text-decoration: none; font-size: 14px;">${verificationUrl}</a>
              </p>

              <p style="margin: 0 0 8px; color: #64748b; font-size: 14px; line-height: 1.6;">
                This link will expire in 24 hours.
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