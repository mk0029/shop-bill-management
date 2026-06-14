import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { parse } from "dotenv";

export type AppEmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  data?: Record<string, unknown>;
};

export type AppEmailResult = {
  sent: boolean;
  data?: unknown;
  reason?: string;
};

let loadedSanityEnv: Record<string, string> | null = null;
const emailState = globalThis as typeof globalThis & {
  __jambhSmtpTransporter?: ReturnType<typeof nodemailer.createTransport>;
  __jambhSmtpFingerprint?: string;
};

function readSanityEnv() {
  if (loadedSanityEnv) return loadedSanityEnv;
  loadedSanityEnv = {};

  const candidates = [
    path.resolve(process.cwd(), "../jambh-sanity/.env"),
    path.resolve(process.cwd(), "../../jambh-sanity/.env"),
  ];

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        loadedSanityEnv = parse(fs.readFileSync(file, "utf8"));
        break;
      }
    } catch {}
  }

  return loadedSanityEnv;
}

function envValue(name: string) {
  return process.env[name] || readSanityEnv()[name] || "";
}

export function defaultFromEmail() {
  return (
    envValue("EMAIL_FROM") ||
    envValue("MAIL_FROM") ||
    envValue("EMAIL_USER") ||
    envValue("NEXT_PUBLIC_SUPPORT_EMAIL") ||
    envValue("SUPPORT_EMAIL") ||
    envValue("ADMIN_EMAIL") ||
    "jambhelectric@gmail.com"
  );
}

function externalEmailUrl() {
  return (
    envValue("JAMBH_EMAIL_SERVICE_URL") ||
    envValue("EMAIL_SERVICE_URL") ||
    ""
  ).trim();
}

function smtpUser() {
  return envValue("EMAIL_USER") || envValue("SMTP_USER") || envValue("MAIL_USER");
}

function smtpPass() {
  return envValue("EMAIL_PASS") || envValue("SMTP_PASS") || envValue("MAIL_PASS");
}

function smtpNumber(name: string, fallback: number) {
  const value = Number(envValue(name) || fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getSmtpTransporter() {
  const user = smtpUser();
  const pass = smtpPass();
  const service = envValue("EMAIL_SERVICE") || "gmail";
  const fingerprint = [
    service,
    user,
    envValue("EMAIL_FROM"),
    envValue("WEBSITE_NAME"),
    envValue("WEBSITE_EMAIL"),
    envValue("NEXT_PUBLIC_SUPPORT_EMAIL"),
    envValue("EMAIL_MAX_CONNECTIONS"),
    envValue("EMAIL_MAX_MESSAGES"),
    envValue("EMAIL_RATE_DELTA_MS"),
    envValue("EMAIL_RATE_LIMIT"),
  ].join("|");

  if (emailState.__jambhSmtpTransporter && emailState.__jambhSmtpFingerprint === fingerprint) {
    return emailState.__jambhSmtpTransporter;
  }

  emailState.__jambhSmtpFingerprint = fingerprint;
  emailState.__jambhSmtpTransporter = nodemailer.createTransport({
    service,
    auth: { user, pass },
    pool: true,
    maxConnections: smtpNumber("EMAIL_MAX_CONNECTIONS", 2),
    maxMessages: smtpNumber("EMAIL_MAX_MESSAGES", 500),
    rateDelta: smtpNumber("EMAIL_RATE_DELTA_MS", 250),
    rateLimit: smtpNumber("EMAIL_RATE_LIMIT", 10),
    connectionTimeout: smtpNumber("EMAIL_CONNECTION_TIMEOUT_MS", 10000),
    greetingTimeout: smtpNumber("EMAIL_GREETING_TIMEOUT_MS", 10000),
    socketTimeout: smtpNumber("EMAIL_SOCKET_TIMEOUT_MS", 15000),
  });

  return emailState.__jambhSmtpTransporter;
}

export async function sendSmtpEmail(payload: AppEmailPayload): Promise<AppEmailResult> {
  const user = smtpUser();
  const pass = smtpPass();
  if (!user || !pass) {
    return { sent: false, reason: "EMAIL_USER/EMAIL_PASS are not configured" };
  }

  const fromName = envValue("WEBSITE_NAME") || "Jambh Electricals";
  const senderEmail = envValue("EMAIL_FROM") || user;
  const replyTo = envValue("WEBSITE_EMAIL") || envValue("NEXT_PUBLIC_SUPPORT_EMAIL");
  const transporter = getSmtpTransporter();

  try {
    const info = await transporter.sendMail({
      from: `${fromName} <${senderEmail}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: replyTo && replyTo !== senderEmail ? replyTo : undefined,
    });
    return { sent: true, data: { messageId: info.messageId } };
  } catch (error) {
    const maybeError = error as { code?: string | number; responseCode?: string | number; response?: string; message?: string };
    const detail = maybeError.response || maybeError.message || "SMTP send failed";
    return {
      sent: false,
      reason:
        String(detail).includes("454-4.7.0") ||
        maybeError.code === "EAUTH" ||
        maybeError.code === 454 ||
        maybeError.responseCode === 454
          ? `SMTP auth or throttling issue: ${detail}`
          : detail,
    };
  }
}

export async function sendAppEmail(payload: AppEmailPayload): Promise<AppEmailResult> {
  const to = String(payload.to || "").trim();
  if (!to) return { sent: false, reason: "Email recipient is required" };

  const smtpResult = await sendSmtpEmail({ ...payload, to });
  if (smtpResult.sent) return smtpResult;

  const serviceUrl = externalEmailUrl();
  if (!serviceUrl) return smtpResult;

  const body = {
    ...payload,
    to,
    from: defaultFromEmail(),
  };

  try {
    const response = await fetch(serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(envValue("JAMBH_EMAIL_SERVICE_TOKEN")
          ? { Authorization: `Bearer ${envValue("JAMBH_EMAIL_SERVICE_TOKEN")}` }
          : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false || data?.sent === false) {
      return {
        sent: false,
        data,
        reason: data?.error || data?.reason || `Email service failed with ${response.status}`,
      };
    }
    return { sent: true, data };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Email service failed",
    };
  }
}

export function canSendAppEmail() {
  return Boolean((smtpUser() && smtpPass()) || externalEmailUrl());
}
