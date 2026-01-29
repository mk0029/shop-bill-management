type SendResult = {
  ok: boolean
  phone: string
  jid?: string | null
  messageId?: string | null
  error?: string
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

export async function sendViaWaBotServer(input: { phones: string[]; message: string }): Promise<SendBulkResult> {
  try {
    const enabled = String(process.env.AUTO_WA_BILL_EVENTS || '').trim()
    if (enabled && enabled !== '1' && enabled.toLowerCase() !== 'true') {
      return { ok: false, sent: 0, failed: input.phones?.length || 0, results: [], error: 'AUTO_WA_BILL_EVENTS disabled' }
    }

    const WA_BOT_URL = normalizeWaBotBaseUrl(process.env.WA_BOT_URL)
    const WA_BOT_TOKEN = String(process.env.WA_BOT_TOKEN || '').trim()

    if (!WA_BOT_URL || !WA_BOT_TOKEN) {
      return { ok: false, sent: 0, failed: input.phones?.length || 0, results: [], error: 'Missing WA_BOT_URL/WA_BOT_TOKEN' }
    }

    const phones = Array.isArray(input.phones) ? input.phones.map(String).filter(Boolean) : []
    const message = String(input.message || '').trim()

    if (!phones.length) {
      return { ok: false, sent: 0, failed: 0, results: [], error: 'phones is required' }
    }
    if (!message) {
      return { ok: false, sent: 0, failed: phones.length, results: [], error: 'message is required' }
    }

    const results: SendResult[] = []

    for (const phone of phones) {
      try {
        const res = await fetch(`${WA_BOT_URL}/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': WA_BOT_TOKEN,
          },
          body: JSON.stringify({ phone, message }),
        })

        const json = await res.json().catch(() => ({} as any))
        if (!res.ok || !json?.ok) {
          results.push({ ok: false, phone, error: json?.error || `${res.status} ${res.statusText}` })
          continue
        }

        results.push({ ok: true, phone, jid: json?.jid, messageId: json?.messageId })
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
    return { ok: false, sent: 0, failed: input.phones?.length || 0, results: [], error: msg }
  }
}
