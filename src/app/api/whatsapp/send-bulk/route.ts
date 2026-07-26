import { NextRequest, NextResponse } from 'next/server'
import { sendOpenWaBulk } from '@/lib/openwa-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const phones: string[] = Array.isArray(body?.phones) ? body.phones.map(String).filter(Boolean) : []
    const message = String(body?.message || '').trim()

    if (!phones.length) {
      return NextResponse.json({ ok: false, error: 'phones is required' }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ ok: false, error: 'message is required' }, { status: 400 })
    }

    const result = await sendOpenWaBulk(phones.map(phone => ({ phone, message })))

    return NextResponse.json(result, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
