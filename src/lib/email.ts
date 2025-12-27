// src/lib/email.ts
// Email service using Mailjet

import Mailjet from 'node-mailjet';

const mailjet = new Mailjet({
  apiKey: process.env.MAILJET_API_KEY || '',
  apiSecret: process.env.MAILJET_SECRET_KEY || '',
});

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  textContent: string;
  htmlContent: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
    console.error('❌ Mailjet credentials not configured');
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