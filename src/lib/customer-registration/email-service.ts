import { sendAppEmail } from "@/lib/email/server";

export async function sendRecoveryEmail(
  to: string,
  customerId: string,
  secretKey: string,
): Promise<boolean> {
  const result = await sendAppEmail({
    to,
    subject: "Your Jambh Electricals Login Credentials",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0B0D12;">Login Credentials Recovery</h2>
        <p>You recently requested your login credentials for Jambh Electricals.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Customer ID:</strong> ${customerId}</p>
          <p style="margin: 4px 0;"><strong>Secret Key:</strong> ${secretKey}</p>
        </div>
        <p style="color: #666; font-size: 12px;">For security, please change your secret key after logging in.</p>
        <p style="color: #666; font-size: 12px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
    text: `Login Credentials\n\nCustomer ID: ${customerId}\nSecret Key: ${secretKey}\n\nFor security, please change your secret key after logging in.`,
  });
  return result.sent;
}
