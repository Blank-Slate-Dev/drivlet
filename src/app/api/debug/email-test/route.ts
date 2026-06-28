// TEMPORARY DEBUG — REMOVE AFTER DIAGNOSIS
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to") || process.env.ADMIN_NOTIFICATION_EMAIL || "support@drivlet.com.au";
  const from = process.env.EMAIL_FROM || "noreply@drivlet.com.au";

  const envCheck = {
    hasApiKey: !!process.env.MAILJET_API_KEY,
    hasSecret: !!process.env.MAILJET_SECRET_KEY,
    hasAdminEmail: !!process.env.ADMIN_NOTIFICATION_EMAIL,
    hasEmailFrom: !!process.env.EMAIL_FROM,
    from,
    to,
  };

  try {
    const success = await sendEmail({
      to,
      toName: "Debug Test",
      subject: "Drivlet Email Debug Test",
      textContent: "If you received this, the Mailjet integration is working correctly on this environment.",
      htmlContent: "<p>If you received this, the <strong>Mailjet integration</strong> is working correctly on this environment.</p>",
    });

    return NextResponse.json({
      envCheck,
      result: { success },
      message: success
        ? "Email sent — check inbox"
        : "sendEmail returned false — check Vercel logs for [EMAIL_DEBUG] lines",
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string; ErrorMessage?: string; response?: { status?: number; data?: unknown } };
    return NextResponse.json({
      envCheck,
      result: {
        success: false,
        error: {
          message: err.ErrorMessage || err.message || "Unknown error",
          statusCode: err.statusCode,
          responseStatus: err.response?.status,
          responseData: err.response?.data,
        },
      },
      message: "sendEmail threw an exception — see error details",
    });
  }
}
