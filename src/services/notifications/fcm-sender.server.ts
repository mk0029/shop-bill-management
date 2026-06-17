import "server-only";
import { GoogleAuth } from "google-auth-library";
import { deactivateFcmTokens } from "@/lib/fcm/tokens.server";
import type { NotificationSendResult } from "@/types/notifications";

type FcmMessageInput = {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
};

type AccessTokenShape = string | { token?: string } | null;

const NOTIFICATION_ICON = "/je-p-192.png";
const NOTIFICATION_BADGE = "/je-p-48.png";

function getProjectId() {
  if (process.env.PROJECT_ID) return process.env.PROJECT_ID;
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  try {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    return json ? JSON.parse(json)?.project_id : undefined;
  } catch {
    return undefined;
  }
}

function getGoogleAuth() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return new GoogleAuth({
    ...(json ? { credentials: JSON.parse(json) } : {}),
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
}

async function getAccessToken() {
  const client = await getGoogleAuth().getClient();
  const token = (await client.getAccessToken()) as AccessTokenShape;
  if (typeof token === "string") return token;
  if (token?.token) return token.token;
  throw new Error("Unable to acquire Google OAuth2 access token");
}

function getSiteOrigin() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "https://jambh-ell.vercel.app";
  const withProtocol = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "https://jambh-ell.vercel.app";
  }
}

function buildWebPushLink(sanitized: Record<string, string>) {
  const raw =
    sanitized.link ||
    sanitized.click_action ||
    sanitized.route ||
    sanitized.route_path ||
    "/";
  try {
    return new URL(raw, getSiteOrigin()).toString();
  } catch {
    return getSiteOrigin();
  }
}

function buildWebPushTopic(sanitized: Record<string, string>) {
  const raw = sanitized.tag || sanitized.id || sanitized.type || "app-notification";
  const safe = raw.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 32);
  return safe || "app-notification";
}

function buildMessage(token: string, title: string, body: string, data?: Record<string, string>) {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(data || {})) {
    sanitized[String(key)] = String(value);
  }
  sanitized.title ||= title;
  sanitized.body ||= body;
  sanitized.icon ||= NOTIFICATION_ICON;
  sanitized.badge ||= NOTIFICATION_BADGE;
  sanitized.click_action ||= buildWebPushLink(sanitized);
  const topic = buildWebPushTopic(sanitized);

  return {
    message: {
      token,
      data: sanitized,
      webpush: {
        headers: {
          TTL: "604800",
          Urgency: "high",
          Topic: topic,
        },
        notification: {
          icon: sanitized.icon,
          badge: sanitized.badge,
        },
        fcm_options: {
          link: sanitized.click_action,
        },
      },
      android: {
        priority: "HIGH",
        ttl: "604800s",
      },
    },
  };
}

function tokenHint(token: string) {
  if (!token) return "";
  return `${token.slice(0, 10)}...${token.slice(-6)}`;
}

function isRetryableFcmError(message: string) {
  return /UNAVAILABLE|INTERNAL|DEADLINE_EXCEEDED|RESOURCE_EXHAUSTED|429|500|502|503|504/i.test(message);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendOne(token: string, title: string, body: string, data?: Record<string, string>) {
  const projectId = getProjectId();
  if (!projectId) throw new Error("Firebase project id not configured");
  console.log("[FCM_TRACE] firebase_project_id", projectId);
  console.log("[FCM_TRACE] send_token", tokenHint(token));
  const accessToken = await getAccessToken();
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildMessage(token, title, body, data)),
  });

  const text = await response.text().catch(() => "");
  if (response.ok) {
    console.log("[FCM_TRACE] firebase_response", text || `status=${response.status}`);
    return;
  }
  console.error("[FCM_TRACE] firebase_error", `status=${response.status} ${text}`);
  throw new Error(`FCM send failed: status=${response.status} ${text}`);
}

function isInvalidTokenError(message: string) {
  return /UNREGISTERED|NotRegistered|registration-token-not-registered|requested entity was not found|token is not a valid FCM registration token/i.test(message);
}

export async function sendFcmToTokens(input: FcmMessageInput): Promise<NotificationSendResult> {
  const tokens = Array.from(new Set((input.tokens || []).filter(Boolean)));
  console.log("[FCM_TRACE] token_count", tokens.length);
  if (!input.title.trim() || !input.body.trim()) {
    return { success: false, sent: 0, failed: tokens.length, errors: ["Missing title/body"] };
  }
  if (!tokens.length) return { success: false, sent: 0, failed: 0, errors: ["No target tokens"] };

  const settled = await Promise.allSettled(
    tokens.map(async (token) => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await sendOne(token, input.title, input.body, input.data);
          return;
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error);
          if (isInvalidTokenError(message) || !isRetryableFcmError(message) || attempt === 2) break;
          await sleep(250 * 2 ** attempt);
        }
      }
      throw lastError;
    }),
  );

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  const invalidTokens: string[] = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sent += 1;
      return;
    }
    failed += 1;
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
    errors.push(`${tokens[index]}: ${message}`);
    if (isInvalidTokenError(message)) invalidTokens.push(tokens[index]);
  });

  if (invalidTokens.length) {
    await deactivateFcmTokens(invalidTokens).catch((error) => {
      console.error("[FCM] Failed to deactivate invalid tokens", error);
    });
  }

  return {
    success: failed === 0,
    sent,
    failed,
    ...(errors.length ? { errors } : {}),
    ...(invalidTokens.length ? { invalidTokens } : {}),
  };
}
