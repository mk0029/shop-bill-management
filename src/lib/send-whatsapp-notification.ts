import { sendOpenWaText } from "@/lib/openwa-client"

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

function trackWhatsApp(data: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    try {
      const key = "wa-notification-tracker"
      const existing = JSON.parse(localStorage.getItem(key) || "[]")
      existing.unshift({ ...data, ts: new Date().toISOString() })
      if (existing.length > 100) existing.length = 100
      localStorage.setItem(key, JSON.stringify(existing))
    } catch { /* ignore */ }
  }
}

export async function sendWhatsAppNotification(input: NotificationInput): Promise<NotificationResult> {
  const sendStartMs = Date.now();
  try {
    if (!input.eventType) return { ok: false, error: 'eventType is required' }
    if (!input.message) return { ok: false, error: 'message is required' }
    if (!input.phone && !input.customerId) return { ok: false, error: 'phone or customerId is required' }

    const phone = String(input.phone || "").replace(/\D/g, "")
    if (!phone) return { ok: false, error: 'phone is required' }

    const idempotencyKey = generateIdempotencyKey(input)
    if (checkIdempotency(idempotencyKey)) {
      trackWhatsApp({ eventType: input.eventType, phone: input.phone, ok: true, skipped: true, durationMs: Date.now() - sendStartMs, idempotencyKey });
      return { ok: true, skipped: true, reason: 'duplicate' }
    }

    const result = await sendOpenWaText(phone, input.message)
    const durationMs = Date.now() - sendStartMs;

    if (!result.ok) {
      idempotencyCache.delete(idempotencyKey)
      trackWhatsApp({ eventType: input.eventType, phone: input.phone, ok: false, error: result.error, durationMs, idempotencyKey });
      return { ok: false, error: result.error }
    }

    trackWhatsApp({ eventType: input.eventType, phone: input.phone, ok: true, durationMs, idempotencyKey });
    return { ok: true }
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
