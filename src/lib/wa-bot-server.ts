type SendResult = {
  ok: boolean
  phone: string
  jid?: string | null
  messageId?: string | null
  error?: string
  skipped?: boolean
}

type SendBulkResult = {
  ok: boolean
  sent: number
  failed: number
  results: SendResult[]
  error?: string
}

function normalizeBackendBaseUrl(raw?: string): string {
  return String(raw || '').replace(/\/+$/, '')
}

let idempotencyCache = new Map<string, number>()
const IDEMPOTENCY_TTL = 86_400_000
const MAX_CACHE_SIZE = 10_000

function checkIdempotency(key: string): boolean {
  const now = Date.now()
  if (idempotencyCache.has(key)) {
    const ts = idempotencyCache.get(key)!
    if (now - ts < IDEMPOTENCY_TTL) return true
    idempotencyCache.delete(key)
  }
  if (idempotencyCache.size >= MAX_CACHE_SIZE) {
    const entries = [...idempotencyCache.entries()]
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE)
    for (const [k] of toDelete) idempotencyCache.delete(k)
  }
  idempotencyCache.set(key, now)
  return false
}

function hashString(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function makeIdempotencyKey(phone: string, message: string, eventType?: string): string {
  return `${eventType || 'api_send'}:${phone}:${hashString(message)}`
}

export async function sendViaWaBotServer(input: { phones?: string[]; phone?: string; message: string; eventType?: string }): Promise<SendBulkResult> {
  try {
    const enabled = String(process.env.AUTO_WA_BILL_EVENTS || '').trim()
    if (enabled && enabled !== '1' && enabled.toLowerCase() !== 'true') {
      return { ok: false, sent: 0, failed: input.phones?.length || (input.phone ? 1 : 0) || 0, results: [], error: 'AUTO_WA_BILL_EVENTS disabled' }
    }

    const backendUrl = normalizeBackendBaseUrl(process.env.WA_BACKEND_URL || process.env.WA_BOT_URL || process.env.WHATSAPP_BACKEND_URL || process.env.NOTIFICATION_API_URL)
    const secret = String(process.env.WA_BOT_TOKEN || process.env.API_KEY || process.env.WA_EVENT_SECRET || process.env.NOTIFY_API_SECRET || '').trim()
    if (!backendUrl || !secret) {
      return { ok: false, sent: 0, failed: input.phones?.length || (input.phone ? 1 : 0) || 0, results: [], error: 'Missing central WhatsApp backend config' }
    }

    const phones = Array.isArray(input.phones) ? input.phones.map(String).filter(Boolean) : (input.phone ? [String(input.phone)] : [])
    const message = String(input.message || '').trim()
    if (!phones.length) return { ok: false, sent: 0, failed: 0, results: [], error: 'phone or phones is required' }
    if (!message) return { ok: false, sent: 0, failed: phones.length, results: [], error: 'message is required' }

    const results: SendResult[] = []
    for (const phone of phones) {
      const idempotencyKey = makeIdempotencyKey(phone, message, input.eventType)
      if (checkIdempotency(idempotencyKey)) {
        results.push({ ok: true, phone, skipped: true })
        continue
      }
      const res = await fetch(`${backendUrl}/api/wa/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          to: phone,
          message,
          eventType: input.eventType || 'api_send',
          eventId: idempotencyKey,
          idempotencyKey,
          metadata: { source: 'frontend-wa-bot-server-proxy' },
        }),
      })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok || !(json?.success || json?.ok || json?.queued)) {
        idempotencyCache.delete(idempotencyKey)
        results.push({ ok: false, phone, error: json?.error || json?.message || `${res.status} ${res.statusText}` })
        continue
      }
      results.push({ ok: true, phone, jid: json?.results?.[0]?.jid, messageId: json?.results?.[0]?.messageId, skipped: json?.skipped })
    }

    const sent = results.filter(r => r.ok).length
    const failed = results.length - sent
    return { ok: true, sent, failed, results }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, sent: 0, failed: input.phones?.length || (input.phone ? 1 : 0) || 0, results: [], error: msg }
  }
}
export async function emitWaEventServer(eventName: string, payload: Record<string, unknown>): Promise<{ ok: boolean; queued?: boolean; skipped?: boolean; error?: string }> {
  try {
    const backendUrl = normalizeBackendBaseUrl(process.env.WA_BACKEND_URL || process.env.WA_BOT_URL || process.env.WHATSAPP_BACKEND_URL || process.env.NOTIFICATION_API_URL)
    const secret = String(process.env.WA_BOT_TOKEN || process.env.API_KEY || process.env.WA_EVENT_SECRET || process.env.NOTIFY_API_SECRET || '').trim()
    if (!backendUrl || !secret) return { ok: false, error: 'Missing central WhatsApp backend config' }
    const res = await fetch(`${backendUrl}/api/wa/events/${eventName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${secret}`,
        'x-api-key': secret,
      },
      body: JSON.stringify(payload || {}),
    })
    const json = await res.json().catch(() => ({} as any))
    if (!res.ok || json?.ok === false || json?.success === false) {
      return { ok: false, error: json?.error || json?.message || `${res.status} ${res.statusText}` }
    }
    return { ok: true, queued: Boolean(json?.queued), skipped: Boolean(json?.skipped) }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
