export interface WelcomeTemplateData {
  customerName: string
  displayName?: string
  loginUrl: string
  supportEmail?: string
  supportPhone?: string
  companyName?: string
}

const DEFAULT_COMPANY = "Jambh Electricals"

function safeName(data: WelcomeTemplateData): string {
  return data.displayName || data.customerName || "Customer"
}

function supportContact(data: WelcomeTemplateData): string {
  const parts: string[] = []
  if (data.supportPhone) parts.push(`Phone: ${data.supportPhone}`)
  if (data.supportEmail) parts.push(`Email: ${data.supportEmail}`)
  return parts.length > 0 ? parts.join("\n") : "Contact our support team through the app chat."
}

const FEATURES = [
  "View and download your invoices",
  "Track payment history",
  "Make secure online payments",
  "Monitor service requests",
  "View order history",
  "Manage your account details",
]

export function buildWelcomeText(data: WelcomeTemplateData): string {
  const name = safeName(data)
  const company = data.companyName || DEFAULT_COMPANY
  const support = supportContact(data)

  return [
    `Dear ${name},`,
    "",
    `Your account with ${company} has been created successfully.`,
    "",
    "With your account you can:",
    ...FEATURES.map((f) => `  \u2022 ${f}`),
    "",
    "Access Your Account",
    data.loginUrl,
    "",
    "For your security, never share your login credentials with anyone.",
    "",
    "Need help? Our support team is always happy to assist you.",
    support,
    "",
    "Regards,",
    `${company} Team`,
  ].join("\n")
}

export function buildWelcomeWhatsApp(data: WelcomeTemplateData): string {
  const name = safeName(data)
  const company = data.companyName || DEFAULT_COMPANY

  return [
    `Dear ${name},`,
    "",
    `Your account with ${company} has been created successfully.`,
    "",
    "With your account you can:",
    ...FEATURES.map((f) => `\u2022 ${f}`),
    "",
    "Access Your Account",
    data.loginUrl,
    "",
    "For your security, never share your login credentials.",
    "",
    `Need help? Reply to this message or contact support.`,
    "",
    `Regards,`,
    `${company} Team`,
  ].join("\n")
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

const FEATURES_HTML = FEATURES.map(
  (f) => `<tr><td style="padding:3px 0;color:#64748B;font-size:14px;line-height:1.5">${escapeHtml(f)}</td></tr>`,
).join("")

export function buildWelcomeEmailHtml(data: WelcomeTemplateData): string {
  const name = escapeHtml(safeName(data))
  const company = escapeHtml(data.companyName || DEFAULT_COMPANY)
  const loginUrl = escapeHtml(data.loginUrl)
  const supportEmail = data.supportEmail ? escapeHtml(data.supportEmail) : ""
  const supportPhone = data.supportPhone ? escapeHtml(data.supportPhone) : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<style>
  @media only screen and (max-width:600px) {
    .container { width:100% !important; }
    .content { padding:24px 20px !important; }
    .btn { display:block !important; width:100% !important; text-align:center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9">
<tr><td align="center" style="padding:40px 16px">
  <table class="container" role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
    <tr>
      <td style="padding:0 0 24px 0;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#1E293B">${company}</h1>
      </td>
    </tr>
    <tr>
      <td class="content" style="background:#FFFFFF;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <h2 style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#1E293B">Welcome, ${name}</h2>
        <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569">Your account with ${company} has been created successfully. We're pleased to have you onboard.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0">
          <tr><td style="padding:0 0 8px 0;font-size:13px;font-weight:600;color:#1E293B;text-transform:uppercase;letter-spacing:0.5px">What you can do</td></tr>
          ${FEATURES_HTML}
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0">
          <tr>
            <td align="center" style="padding:16px 0">
              <a class="btn" href="${loginUrl}" target="_blank" style="display:inline-block;padding:12px 32px;background-color:#0EA5E9;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;box-shadow:0 1px 2px rgba(14,165,233,0.3)">Access Your Account</a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 4px 0;font-size:13px;line-height:1.5;color:#94A3B8"><strong>Security:</strong> Never share your login credentials with anyone. ${company} will never ask for your password.</p>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0">
        <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#64748B"><strong>Need help?</strong> Our support team is happy to assist you.</p>
        ${supportPhone ? `<p style="margin:0 0 4px 0;font-size:13px;color:#64748B">Phone: ${supportPhone}</p>` : ""}
        ${supportEmail ? `<p style="margin:0 0 0 0;font-size:13px;color:#64748B">Email: ${supportEmail}</p>` : ""}
      </td>
    </tr>
    <tr>
      <td style="padding:20px 0 0 0;text-align:center">
        <p style="margin:0;font-size:12px;color:#94A3B8">&copy; ${new Date().getFullYear()} ${company}. All rights reserved.</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}
