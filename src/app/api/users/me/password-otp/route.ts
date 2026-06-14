import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { getServerAuth } from "@/lib/server-auth";
import { sanityClient } from "@/lib/sanity";
import { sendAppEmail } from "@/lib/email/server";

export const runtime = "nodejs";

type OtpRecord = {
  code: string;
  userId: string;
  channel: "email" | "whatsapp";
  expiresAt: number;
  verifiedUntil?: number;
};

const store = globalThis as typeof globalThis & {
  __passwordOtpStore?: Map<string, OtpRecord>;
};

function otpStore() {
  if (!store.__passwordOtpStore) store.__passwordOtpStore = new Map();
  return store.__passwordOtpStore;
}

async function getUser(userId: string) {
  return sanityClient.fetch<{ _id: string; name?: string | null; email?: string | null; phone?: string | null } | null>(
    `*[_type=="user" && _id==$userId && isActive != false][0]{_id,name,email,phone}`,
    { userId },
  );
}

async function sendOtpEmail(email: string, code: string) {
  return sendAppEmail({
    to: email,
    subject: "Your Jambh Electric password OTP",
    text: `Your Jambh Electric password OTP is ${code}. It expires in 10 minutes. Do not share it with anyone.`,
    template: "password-otp",
    data: { code },
  });
}

async function sendOtpWhatsApp(phone: string, code: string, name?: string | null) {
  const waBotBaseUrl = (process.env.WA_BOT_URL || "").replace(/\/+$/, "");
  const token = process.env.WA_BOT_TOKEN || "";
  if (!waBotBaseUrl || !token) return { sent: false, reason: "WhatsApp service is not configured" };

  const firstName = String(name || "").trim().split(/\s+/)[0] || "Customer";
  const response = await fetch(`${waBotBaseUrl}/send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": token,
    },
    body: JSON.stringify({
      phone,
      message: `Hi ${firstName}, your Jambh Electric password OTP is ${code}. It expires in 10 minutes. Do not share it with anyone.`,
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json?.ok) {
    return { sent: false, reason: json?.error || `WhatsApp send failed (${response.status})` };
  }
  return { sent: true };
}

function channelLabel(channel: "email" | "whatsapp") {
  return channel === "whatsapp" ? "WhatsApp" : "email";
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "request") {
      const user = await getUser(auth.userId);
      if (!user?._id) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
      }

      const requestedChannel = String(body?.channel || "").toLowerCase();
      const channel: "email" | "whatsapp" =
        requestedChannel === "email" || requestedChannel === "whatsapp"
          ? requestedChannel
          : user.phone
            ? "whatsapp"
            : "email";

      if (channel === "email" && !user.email) {
        return NextResponse.json({ success: false, error: "Add an email address in Personal Information first" }, { status: 400 });
      }
      if (channel === "whatsapp" && !user.phone) {
        return NextResponse.json({ success: false, error: "No mobile number is available for this account" }, { status: 400 });
      }
      const code = String(randomInt(100000, 999999));
      otpStore().set(auth.userId, {
        code,
        userId: auth.userId,
        channel,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      const result =
        channel === "whatsapp"
          ? await sendOtpWhatsApp(user.phone || "", code, user.name).catch((error) => ({
              sent: false,
              reason: error instanceof Error ? error.message : "WhatsApp failed",
            }))
          : await sendOtpEmail(user.email || "", code).catch((error) => ({
              sent: false,
              reason: error instanceof Error ? error.message : "Email failed",
            }));

      if (!result.sent && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { success: false, error: result.reason || `${channelLabel(channel)} OTP could not be sent` },
          { status: 502 },
        );
      }

      return NextResponse.json({
        success: true,
        channel,
        emailSent: channel === "email" ? result.sent : false,
        whatsappSent: channel === "whatsapp" ? result.sent : false,
        message: result.sent
          ? `OTP sent on ${channelLabel(channel)}`
          : `Dev OTP generated. ${result.reason || `${channelLabel(channel)} service is not configured`}`,
        devOtp: process.env.NODE_ENV !== "production" ? code : undefined,
      });
    }

    if (action === "verify") {
      const code = String(body?.otp || "").trim();
      const record = otpStore().get(auth.userId);
      if (!record || record.expiresAt < Date.now()) {
        return NextResponse.json({ success: false, error: "OTP expired. Request a new code." }, { status: 400 });
      }
      if (record.code !== code) {
        return NextResponse.json({ success: false, error: "Invalid OTP" }, { status: 400 });
      }
      otpStore().set(auth.userId, { ...record, verifiedUntil: Date.now() + 5 * 60 * 1000 });
      return NextResponse.json({ success: true, message: "OTP verified" });
    }

    if (action === "update") {
      const newPassword = String(body?.newPassword || "").trim();
      const record = otpStore().get(auth.userId);
      if (!record?.verifiedUntil || record.verifiedUntil < Date.now()) {
        return NextResponse.json({ success: false, error: "Verify OTP before updating password" }, { status: 400 });
      }
      if (newPassword.length < 6 || newPassword.length > 64) {
        return NextResponse.json({ success: false, error: "Password must be 6 to 64 characters" }, { status: 400 });
      }
      await sanityClient.patch(auth.userId).set({ secretKey: newPassword, updatedAt: new Date().toISOString() }).commit();
      otpStore().delete(auth.userId);
      return NextResponse.json({ success: true, message: "Password updated" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[PasswordOtp] failed", error);
    return NextResponse.json({ success: false, error: "Password update failed" }, { status: 500 });
  }
}
