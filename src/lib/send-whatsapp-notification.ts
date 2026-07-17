type NotificationInput = {
  eventType: string
  phone?: string
  customerId?: string
  message: string
  metadata?: Record<string, unknown>
}

type NotificationResult = {
  ok: boolean
  skipped?: boolean
  reason?: string
  error?: string
  code?: string
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

function generateIdempotencyKey(input: NotificationInput): string {
  const entityId = input.metadata?.entityId || input.customerId || 'none'
  return `${input.eventType}:${entityId}:${input.phone || 'none'}`
}

export async function sendWhatsAppNotification(input: NotificationInput): Promise<NotificationResult> {
  const sendStartMs = Date.now();
  try {
    if (!input.eventType) return { ok: false, error: 'eventType is required' }
    if (!input.message) return { ok: false, error: 'message is required' }
    if (!input.phone && !input.customerId) return { ok: false, error: 'phone or customerId is required' }

    const backendUrl = normalizeBackendBaseUrl(process.env.WA_BACKEND_URL || process.env.WA_BOT_URL || process.env.WHATSAPP_BACKEND_URL || process.env.NOTIFICATION_API_URL)
    const secret = String(process.env.WA_BOT_TOKEN || process.env.API_KEY || process.env.WA_EVENT_SECRET || process.env.NOTIFY_API_SECRET || '').trim()
    if (!backendUrl || !secret) return { ok: false, error: 'Missing central WhatsApp backend config' }

    const idempotencyKey = generateIdempotencyKey(input)
    if (checkIdempotency(idempotencyKey)) {
      trackWhatsApp({ eventType: input.eventType, phone: input.phone, ok: true, skipped: true, durationMs: Date.now() - sendStartMs, idempotencyKey });
      return { ok: true, skipped: true, reason: 'duplicate' }
    }

    const res = await fetch(`${backendUrl}/api/wa/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        to: input.phone || '',
        message: input.message,
        eventType: input.eventType,
        eventId: idempotencyKey,
        idempotencyKey,
        metadata: input.metadata || {},
      }),
    })
    const json = await res.json().catch(() => ({} as any))
    const durationMs = Date.now() - sendStartMs;
    if (!res.ok || !(json?.success || json?.ok || json?.queued)) {
      idempotencyCache.delete(idempotencyKey)
      trackWhatsApp({ eventType: input.eventType, phone: input.phone, ok: false, error: json?.error || json?.message || `${res.status} ${res.statusText}`, durationMs, idempotencyKey });
      return { ok: false, error: json?.error || json?.message || `${res.status} ${res.statusText}` }
    }
    trackWhatsApp({ eventType: input.eventType, phone: input.phone, ok: true, skipped: json.skipped, durationMs, idempotencyKey });
    return { ok: true, skipped: json.skipped, reason: json.reason }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    trackWhatsApp({ eventType: input.eventType, phone: input.phone, ok: false, error: msg, durationMs: Date.now() - sendStartMs });
    return { ok: false, error: msg }
  }
}

export async function sendBulkWhatsAppNotification(inputs: NotificationInput[]): Promise<{ ok: boolean; sent: number; failed: number; results: NotificationResult[] }> {
  const results: NotificationResult[] = []
  for (const input of inputs) results.push(await sendWhatsAppNotification(input))
  const sent = results.filter((r) => r.ok).length
  const failed = results.length - sent
  return { ok: true, sent, failed, results }
}

