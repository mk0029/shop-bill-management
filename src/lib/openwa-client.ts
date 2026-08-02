import { normalizePhoneToE164, phoneToJid } from "@/lib/whatsapp/phone";
import { classifySendFailure, type ClassifiedWaError } from "@/lib/whatsapp/errors";
import { waitSendGap } from "@/lib/whatsapp/send-gap";

function getOpenWaBaseUrl(): string {
  return (process.env.OPENWA_URL || "http://localhost:2785").replace(/\/+$/, "");
}

function getOpenWaApiKey(): string {
  return process.env.OPENWA_API_KEY || "";
}

function getOpenWaSessionId(): string {
  return process.env.OPENWA_SESSION_ID || "";
}

export function isOpenWaConfigured(): boolean {
  return Boolean(getOpenWaApiKey() && getOpenWaSessionId());
}

/**
 * Resolve a phone number to a neutral WhatsApp JID (`91XXXXXXXXXX@c.us`).
 * The input is normalized to E.164 first — spaces, dashes, brackets and
 * national prefixes are stripped, Indian numbers become `91XXXXXXXXXX`.
 * Returns "" for numbers that fail validation.
 */
export function normalizePhoneToJid(phone: string): string {
  return phoneToJid(phone);
}

export type OpenWaSendResult = {
  ok: boolean
  phone: string
  jid?: string
  messageId?: string
  error?: string
  errorCode?: string
  retryable?: boolean
  httpStatus?: number
  classified?: ClassifiedWaError
}

export type OpenWaBulkResult = {
  ok: boolean
  sent: number
  failed: number
  results: OpenWaSendResult[]
  error?: string
}

/**
 * Registration-check cache: positive answers are trusted for 6h, negative for
 * 15 min (numbers can register at any time, so a "no" must not stick forever).
 * In-memory only — a cold start simply re-checks, which is safe.
 */
const registrationCache = new Map<string, { exists: boolean; at: number }>();
const REGISTERED_TTL_MS = 6 * 60 * 60 * 1000;
const UNREGISTERED_TTL_MS = 15 * 60 * 1000;

function cachedRegistration(phone: string): boolean | null {
  const hit = registrationCache.get(phone);
  if (!hit) return null;
  const ttl = hit.exists ? REGISTERED_TTL_MS : UNREGISTERED_TTL_MS;
  if (Date.now() - hit.at > ttl) {
    registrationCache.delete(phone);
    return null;
  }
  return hit.exists;
}

function rememberRegistration(phone: string, exists: boolean) {
  registrationCache.set(phone, { exists, at: Date.now() });
  if (registrationCache.size > 20_000) {
    const oldest = [...registrationCache.entries()].sort((a, b) => a[1].at - b[1].at);
    for (const [key] of oldest.slice(0, oldest.length - 20_000)) registrationCache.delete(key);
  }
}

/**
 * Check whether a phone number is registered on WhatsApp through the bot's
 * contact probe (GET /api/sessions/:id/contacts/check/:number). Cached per
 * number. A probe failure returns `null` (unknown) rather than a verdict.
 */
export async function checkOpenWaNumberRegistered(phone: string): Promise<boolean | null> {
  const normalized = normalizePhoneToE164(phone);
  if (!normalized.ok) return false;
  const key = normalized.e164;

  const cached = cachedRegistration(key);
  if (cached !== null) return cached;

  if (!isOpenWaConfigured()) return null;
  try {
    const res = await fetch(
      `${getOpenWaBaseUrl()}/api/sessions/${getOpenWaSessionId()}/contacts/check/${normalized.e164}`,
      {
        headers: { "X-API-Key": getOpenWaApiKey() },
        signal: AbortSignal.timeout(12_000),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    const exists = json?.exists === true;
    rememberRegistration(key, exists);
    return exists;
  } catch {
    return null;
  }
}

export async function sendOpenWaText(phone: string, message: string): Promise<OpenWaSendResult> {
  if (!isOpenWaConfigured()) {
    return { ok: false, phone, error: "WhatsApp bot is not configured", errorCode: "BOT_NOT_CONFIGURED", retryable: false };
  }

  const normalized = normalizePhoneToE164(phone);
  if (!normalized.ok) {
    return {
      ok: false,
      phone,
      error: `Invalid phone number (${phone})`,
      errorCode: "INVALID_PHONE",
      retryable: false,
    };
  }

  const chatId = `${normalized.e164}@c.us`;
  if (!chatId) return { ok: false, phone, error: "Invalid phone number", errorCode: "INVALID_PHONE", retryable: false };

  // Resolve the latest chat object by confirming the recipient is registered on
  // WhatsApp *before* delivery. Unregistered numbers never enter the wire path
  // (Baileys accepts the send silently and the message vanishes).
  const registered = await checkOpenWaNumberRegistered(normalized.e164);
  if (registered === false) {
    return {
      ok: false,
      phone,
      jid: chatId,
      error: `Number ${normalized.e164} is not on WhatsApp. Delivery failed.`,
      errorCode: "NUMBER_NOT_ON_WHATSAPP",
      retryable: false,
    };
  }

  try {
    const res = await fetch(`${getOpenWaBaseUrl()}/api/sessions/${getOpenWaSessionId()}/messages/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": getOpenWaApiKey(),
      },
      body: JSON.stringify({ chatId, text: message }),
      signal: AbortSignal.timeout(30_000),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const classified = classifySendFailure({ httpStatus: res.status, body: json });
      return {
        ok: false,
        phone,
        jid: chatId,
        error: classified.reason,
        errorCode: classified.code,
        retryable: classified.retryable,
        httpStatus: res.status,
        classified,
      };
    }
    return { ok: true, phone, jid: chatId, messageId: json?.messageId }
  } catch (e: unknown) {
    const classified = classifySendFailure({ thrown: e });
    return {
      ok: false,
      phone,
      jid: chatId,
      error: classified.reason,
      errorCode: classified.code,
      retryable: classified.retryable,
      classified,
    };
  }
}

export async function sendOpenWaBulk(inputs: { phone: string; message: string }[]): Promise<OpenWaBulkResult> {
  const results: OpenWaSendResult[] = []
  for (const { phone, message } of inputs) {
    await waitSendGap()
    results.push(await sendOpenWaText(phone, message))
  }
  const sent = results.filter((r) => r.ok).length
  const failed = results.length - sent
  return { ok: true, sent, failed, results }
}

export type OpenWaSession = {
  id: string;
  name: string;
  status: string;
  phone?: string | null;
  pushName?: string | null;
  connectedAt?: string | null;
  lastActive?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastError?: string | null;
}

export type OpenWaHealth = {
  status: string;
  version?: string;
  timestamp?: string;
  process?: {
    uptimeSec: number;
    memoryRssMb: number;
    memoryHeapUsedMb: number;
    pid: number;
  };
}

export async function getOpenWaSessions(): Promise<{ ok: boolean; sessions?: OpenWaSession[]; error?: string }> {
  try {
    const res = await fetch(`${getOpenWaBaseUrl()}/api/sessions`, {
      headers: { "X-API-Key": getOpenWaApiKey() },
      signal: AbortSignal.timeout(10_000),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: json?.message || `${res.status} ${res.statusText}` }
    return { ok: true, sessions: Array.isArray(json) ? json : [] }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function getOpenWaSessionStatus(): Promise<{ ok: boolean; status?: string; phone?: string; pushName?: string; error?: string }> {
  try {
    const res = await fetch(`${getOpenWaBaseUrl()}/api/sessions/${getOpenWaSessionId()}`, {
      headers: { "X-API-Key": getOpenWaApiKey() },
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: json?.message || `${res.status} ${res.statusText}` }
    return { ok: true, status: json.status, phone: json.phone, pushName: json.pushName }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Bot process health — memory usage + uptime, used by the admin dashboard. */
export async function getOpenWaHealth(): Promise<{ ok: boolean; health?: OpenWaHealth; error?: string }> {
  try {
    const res = await fetch(`${getOpenWaBaseUrl()}/health`, { signal: AbortSignal.timeout(8_000) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.message || `${res.status} ${res.statusText}` };
    return { ok: true, health: json };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getOpenWaQrCode(): Promise<{ ok: boolean; qrCode?: string; status?: string; error?: string }> {
  try {
    const res = await fetch(`${getOpenWaBaseUrl()}/api/sessions/${getOpenWaSessionId()}/qr`, {
      headers: { "X-API-Key": getOpenWaApiKey() },
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: json?.message || `${res.status} ${res.statusText}` }
    return { ok: true, qrCode: json.qrCode, status: json.status }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function startOpenWaSession(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${getOpenWaBaseUrl()}/api/sessions/${getOpenWaSessionId()}/start`, {
      method: "POST",
      headers: { "X-API-Key": getOpenWaApiKey() },
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      return { ok: false, error: json?.message || `${res.status} ${res.statusText}` }
    }
    return { ok: true }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function stopOpenWaSession(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${getOpenWaBaseUrl()}/api/sessions/${getOpenWaSessionId()}/stop`, {
      method: "POST",
      headers: { "X-API-Key": getOpenWaApiKey() },
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      return { ok: false, error: json?.message || `${res.status} ${res.statusText}` }
    }
    return { ok: true }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
