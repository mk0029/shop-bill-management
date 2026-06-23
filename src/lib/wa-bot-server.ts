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

function normalizeWaBotBaseUrl(raw?: string): string {
  return String(raw || '').replace(/\/+$/, '')
}

// In-memory idempotency cache for duplicate protection
let idempotencyCache = new Map<string, number>()
const IDEMPOTENCY_TTL = 86_400_000 // 24h
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

function makeIdempotencyKey(phone: string, message: string): string {
  return `send:${phone}:${hashString(message)}`
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

export async function sendViaWaBotServer(input: { phones?: string[]; phone?: string; message: string; eventType?: string }): Promise<SendBulkResult> {
  try {
    const enabled = String(process.env.AUTO_WA_BILL_EVENTS || '').trim()
    if (enabled && enabled !== '1' && enabled.toLowerCase() !== 'true') {
      return { ok: false, sent: 0, failed: input.phones?.length || (input.phone ? 1 : 0) || 0, results: [], error: 'AUTO_WA_BILL_EVENTS disabled' }
    }

    const WA_BOT_URL = normalizeWaBotBaseUrl(process.env.WA_BOT_URL)
    const WA_BOT_TOKEN = String(process.env.WA_BOT_TOKEN || '').trim()

    if (!WA_BOT_URL || !WA_BOT_TOKEN) {
      return { ok: false, sent: 0, failed: input.phones?.length || (input.phone ? 1 : 0) || 0, results: [], error: 'Missing WA_BOT_URL/WA_BOT_TOKEN' }
    }

    const phones = Array.isArray(input.phones) ? input.phones.map(String).filter(Boolean) : (input.phone ? [String(input.phone)] : [])
    const message = String(input.message || '').trim()

    if (!phones.length) {
      return { ok: false, sent: 0, failed: 0, results: [], error: 'phone or phones is required' }
    }
    if (!message) {
      return { ok: false, sent: 0, failed: phones.length, results: [], error: 'message is required' }
    }

    const results: SendResult[] = []

    for (const phone of phones) {
      try {
        // Idempotency check
        const idKey = makeIdempotencyKey(phone, message)
        if (checkIdempotency(idKey)) {
          results.push({ ok: true, phone, skipped: true })
          continue
        }

        // Use the new /send-notification endpoint for proper event handling
        const res = await fetch(`${WA_BOT_URL}/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': WA_BOT_TOKEN,
          },
          body: JSON.stringify({
            eventType: input.eventType || 'api_send',
            phone,
            message,
            metadata: { source: 'wa-bot-server' },
          }),
        })

        const json = await res.json().catch(() => ({} as any))
        if (!res.ok || !json?.ok) {
          results.push({ ok: false, phone, error: json?.error || `${res.status} ${res.statusText}` })
          continue
        }

        results.push({ ok: true, phone, jid: json?.jid, messageId: json?.messageId, skipped: json?.skipped })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        results.push({ ok: false, phone, error: msg })
      }
    }

    const sent = results.filter(r => r.ok).length
    const failed = results.length - sent

    return { ok: true, sent, failed, results }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, sent: 0, failed: input.phones?.length || (input.phone ? 1 : 0) || 0, results: [], error: msg }
  }
}
