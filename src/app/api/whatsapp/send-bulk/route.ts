import { NextRequest, NextResponse } from 'next/server'

type SendResult = {
  ok: boolean
  phone: string
  messageId?: string | null
  jid?: string | null
  error?: string
}

export async function POST(req: NextRequest) {
  try {
    const WA_BOT_URL = process.env.WA_BOT_URL
    const WA_BOT_TOKEN = process.env.WA_BOT_TOKEN

    const waBotBaseUrl = (WA_BOT_URL || '').replace(/\/+$/, '')

    if (!waBotBaseUrl || !WA_BOT_TOKEN) {
      return NextResponse.json(
        { ok: false, error: 'WhatsApp bot config missing (WA_BOT_URL/WA_BOT_TOKEN)' },
        { status: 500 }
      )
    }

    const body = await req.json().catch(() => null)
    const phones: string[] = Array.isArray(body?.phones) ? body.phones.map(String).filter(Boolean) : []
    const message = String(body?.message || '').trim()

    if (!phones.length) {
      return NextResponse.json({ ok: false, error: 'phones is required' }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ ok: false, error: 'message is required' }, { status: 400 })
    }

    const results: SendResult[] = []

    for (const phone of phones) {
      try {
        const res = await fetch(`${waBotBaseUrl}/send-message`, {
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

    return NextResponse.json({ ok: true, sent, failed, results }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
