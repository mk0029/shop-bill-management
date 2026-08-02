import { NextResponse } from "next/server";
import { SECURITY_HEADERS } from "@/lib/security/headers";
import { sendAppEmail } from "@/lib/email/server";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, code, message }, { status, headers: SECURITY_HEADERS });
}

function buildRecoveryEmailHtml(name: string, phone: string, secretKey: string) {
  const rawDigits = phone.replace(/\D/g, "");
  const loginPhone = rawDigits.length === 10 ? rawDigits : rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
              <tr>
                <td style="padding:32px 32px 0 32px">
                  <h1 style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:#0B0D12">Login Credentials Recovery</h1>
                  <p style="margin:0 0 20px 0;font-size:14px;color:#6B7280">You recently requested your login details</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px">
                  <p style="font-size:14px;color:#374151;margin:0 0 16px 0">Hello <strong>${name}</strong>,</p>
                  <p style="font-size:14px;color:#374151;margin:0 0 16px 0">Here are your login credentials for Jambh Electricals:</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;margin:0 0 20px 0">
                    <tr>
                      <td style="padding:16px">
                        <p style="margin:0 0 8px 0;font-size:13px;color:#6B7280">Phone Number</p>
                        <p style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#0B0D12;font-family:monospace">${loginPhone}</p>
                        <p style="margin:0 0 8px 0;font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;padding-top:16px">Secret Key</p>
                        <p style="margin:0 0 0 0;font-size:16px;font-weight:700;color:#0B0D12;font-family:monospace">${secretKey}</p>
                      </td>
                    </tr>
                  </table>
                  <p style="font-size:13px;color:#6B7280;margin:0 0 8px 0">For security, please change your secret key after logging in.</p>
                  <p style="font-size:13px;color:#6B7280;margin:0 0 24px 0">If you did not request this, please ignore this email or contact support.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px 32px 32px">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-top:1px solid #E5E7EB;padding-top:16px">
                        <p style="margin:0;font-size:12px;color:#9CA3AF">Jambh Electricals &middot; Customer Support</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function buildRecoveryEmailText(name: string, phone: string, secretKey: string) {
  const rawDigits = phone.replace(/\D/g, "");
  const loginPhone = rawDigits.length === 10 ? rawDigits : rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;
  return [
    `Hello ${name},`,
    "",
    "Here are your login credentials for Jambh Electricals:",
    "",
    `Phone Number: ${loginPhone}`,
    `Secret Key: ${secretKey}`,
    "",
    "For security, please change your secret key after logging in.",
    "If you did not request this, please ignore this email or contact support.",
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const internalToken = process.env.RECOVERY_INTERNAL_TOKEN;
    if (internalToken && authHeader !== `Bearer ${internalToken}`) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    let body: { to?: string; name?: string; phone?: string; secretKey?: string };
    try {
      body = await request.json();
    } catch {
      return errorResponse("INVALID_JSON", "Invalid JSON", 400);
    }

    const { to, name, phone, secretKey } = body;
    if (!to || !name || !phone || !secretKey) {
      return errorResponse("MISSING_FIELDS", "Missing required fields: to, name, phone, secretKey", 400);
    }

    const result = await sendAppEmail({
      to,
      subject: "Your Jambh Electricals Login Credentials",
      html: buildRecoveryEmailHtml(name, phone, secretKey),
      text: buildRecoveryEmailText(name, phone, secretKey),
    });

    if (!result.sent) {
      return errorResponse("EMAIL_FAILED", result.reason || "Failed to send email", 500);
    }

    return NextResponse.json({ success: true, message: "Recovery email sent" }, { status: 200, headers: SECURITY_HEADERS });
  } catch (error) {
    console.error("Send recovery email error:", error);
    return errorResponse("SERVER_ERROR", "An unexpected error occurred", 500);
  }
}

export const dynamic = "force-dynamic";
