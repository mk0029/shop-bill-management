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

function normalizeWaBotBaseUrl(raw?: string): string {
  return String(raw || '').replace(/\/+$/, '')
}

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

function generateIdempotencyKey(input: NotificationInput): string {
  const entityId = input.metadata?.entityId || input.customerId || 'none'
  return `${input.eventType}:${entityId}:${input.phone || 'none'}`
}

/**
 * Unified function that all backend events use to send WhatsApp messages.
 *
 * Supported event types:
 * - bill_created
 * - customer_created
 * - work_request_created
 * - work_request_updated
 * - repair_request
 * - tool_rent
 * - admin_broadcast
 * - welcome_message
 * - customer_due_reminder
 * - bill_overdue_reminder
 * - tool_rental_overdue
 * - work_task_reminder
 * - test_send
 */
export async function sendWhatsAppNotification(
  input: NotificationInput,
): Promise<NotificationResult> {
  try {
    // 1. Validate input
    if (!input.eventType) {
      return { ok: false, error: 'eventType is required' }
    }
    if (!input.message) {
      return { ok: false, error: 'message is required' }
    }
    if (!input.phone && !input.customerId) {
      return { ok: false, error: 'phone or customerId is required' }
    }

    // 2. Check if WA bot is enabled
    const enabled = String(process.env.AUTO_WA_BILL_EVENTS || '').trim()
    if (enabled && enabled !== '1' && enabled.toLowerCase() !== 'true') {
      return { ok: false, error: 'AUTO_WA_BILL_EVENTS disabled' }
    }

    // 3. Resolve URL/token
    const WA_BOT_URL = normalizeWaBotBaseUrl(process.env.WA_BOT_URL)
    const WA_BOT_TOKEN = String(process.env.WA_BOT_TOKEN || '').trim()
    if (!WA_BOT_URL || !WA_BOT_TOKEN) {
      return { ok: false, error: 'Missing WA_BOT_URL/WA_BOT_TOKEN' }
    }

    // 4. Duplicate protection
    const idempotencyKey = generateIdempotencyKey(input)
    if (checkIdempotency(idempotencyKey)) {
      return { ok: true, skipped: true, reason: 'duplicate' }
    }

    // 5. Send via WA bot
    const res = await fetch(`${WA_BOT_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WA_BOT_TOKEN,
      },
      body: JSON.stringify({
        eventType: input.eventType,
        phone: input.phone || '',
        customerId: input.customerId || '',
        message: input.message,
        metadata: input.metadata || {},
      }),
    })

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok || !json?.ok) {
      // Clear idempotency so retry can happen
      idempotencyCache.delete(idempotencyKey)
      return { ok: false, error: json?.error || `${res.status} ${res.statusText}` }
    }

    return { ok: true, skipped: json.skipped, reason: json.reason }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

/**
 * Sends to multiple phones using the unified notification function.
 */
export async function sendBulkWhatsAppNotification(
  inputs: NotificationInput[],
): Promise<{ ok: boolean; sent: number; failed: number; results: NotificationResult[] }> {
  const results: NotificationResult[] = []

  for (const input of inputs) {
    const r = await sendWhatsAppNotification(input)
    results.push(r)
  }

  const sent = results.filter((r) => r.ok).length
  const failed = results.length - sent

  return { ok: true, sent, failed, results }
}
