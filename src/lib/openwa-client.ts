const COUNTRY_CODE = "91"

function getOpenWaBaseUrl(): string {
  return (process.env.OPENWA_URL || "http://localhost:2785").replace(/\/+$/, "")
}

function getOpenWaApiKey(): string {
  return process.env.OPENWA_API_KEY || ""
}

function getOpenWaSessionId(): string {
  return process.env.OPENWA_SESSION_ID || ""
}

function normalizePhoneToJid(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 10) return ""
  const national = digits.length > 10 ? digits.slice(-10) : digits
  return `${COUNTRY_CODE}${national}@c.us`
}

export type OpenWaSendResult = {
  ok: boolean
  phone: string
  jid?: string
  messageId?: string
  error?: string
}

export type OpenWaBulkResult = {
  ok: boolean
  sent: number
  failed: number
  results: OpenWaSendResult[]
  error?: string
}

export async function sendOpenWaText(phone: string, message: string): Promise<OpenWaSendResult> {
  if (!getOpenWaApiKey() || !getOpenWaSessionId()) {
    return { ok: false, phone, error: "WhatsApp bot is not configured" }
  }
  const chatId = normalizePhoneToJid(phone)
  if (!chatId) return { ok: false, phone, error: "Invalid phone number" }

  try {
    const res = await fetch(`${getOpenWaBaseUrl()}/api/sessions/${getOpenWaSessionId()}/messages/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": getOpenWaApiKey(),
      },
      body: JSON.stringify({ chatId, text: message }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, phone, error: json?.message || json?.error || `${res.status} ${res.statusText}` }
    }
    return { ok: true, phone, jid: chatId, messageId: json?.messageId }
  } catch (e: unknown) {
    return { ok: false, phone, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function sendOpenWaBulk(inputs: { phone: string; message: string }[]): Promise<OpenWaBulkResult> {
  const results: OpenWaSendResult[] = []
  for (const { phone, message } of inputs) {
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
