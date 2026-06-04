import "server-only";
import { GoogleAuth } from "google-auth-library";
import { deactivateFcmTokens } from "@/lib/fcm/tokens.server";
import type { NotificationSendResult } from "@/types/notifications";

type FcmMessageInput = {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
};

type AccessTokenShape = string | { token?: string } | null;

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

function buildMessage(token: string, title: string, body: string, data?: Record<string, string>) {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(data || {})) {
    sanitized[String(key)] = String(value);
  }
  sanitized.title ||= title;
  sanitized.body ||= body;

  return {
    message: {
      token,
      data: sanitized,
      webpush: {
        headers: {
          TTL: "604800",
          Urgency: "high",
        },
      },
      android: {
        priority: "HIGH",
        notification: { title, body },
      },
    },
  };
}

async function sendOne(token: string, title: string, body: string, data?: Record<string, string>) {
  const projectId = getProjectId();
  if (!projectId) throw new Error("Firebase project id not configured");
  const accessToken = await getAccessToken();
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildMessage(token, title, body, data)),
  });

  if (response.ok) return;
  const text = await response.text().catch(() => "");
  throw new Error(`FCM send failed: status=${response.status} ${text}`);
}

function isInvalidTokenError(message: string) {
  return /UNREGISTERED|NotRegistered|INVALID_ARGUMENT|registration-token-not-registered|NOT_FOUND/i.test(message);
}

export async function sendFcmToTokens(input: FcmMessageInput): Promise<NotificationSendResult> {
  const tokens = Array.from(new Set((input.tokens || []).filter(Boolean)));
  if (!input.title.trim() || !input.body.trim()) {
    return { success: false, sent: 0, failed: tokens.length, errors: ["Missing title/body"] };
  }
  if (!tokens.length) return { success: false, sent: 0, failed: 0, errors: ["No target tokens"] };

  const settled = await Promise.allSettled(
    tokens.map((token) => sendOne(token, input.title, input.body, input.data)),
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
