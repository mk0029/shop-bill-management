import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, sendToAdmins, sendToAll } from '@/lib/notification-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body?.title || !body?.body) {
      return NextResponse.json({ success: false, error: 'Missing title/body' }, { status: 400 })
    }

    type ApiSendResult = { sent?: number; failed?: number }
    let result: ApiSendResult
    if (body.audience === 'admins') {
      result = await sendToAdmins(
        body.title,
        body.body,
        body.data,
        Array.isArray(body.excludeUserIds) ? body.excludeUserIds : undefined,
        Array.isArray(body.excludeTokens) ? body.excludeTokens : undefined,
      )
    } else if (body.audience === 'all') {
      result = await sendToAll(body.title, body.body, body.data)
    } else {
      if (!body.tokens && !body.userIds && !body.phoneNumbers) {
        return NextResponse.json({ success: false, error: 'Provide tokens, userIds or phoneNumbers' }, { status: 400 })
      }
      result = await sendNotification({
        title: body.title,
        body: body.body,
        data: body.data,
        tokens: body.tokens,
        userIds: body.userIds,
        phoneNumbers: body.phoneNumbers,
        sound: body.sound || undefined,
        excludeTokens: Array.isArray(body.excludeTokens) ? body.excludeTokens : undefined,
      })
    }
    const sent = Number(result?.sent || 0)
    const failed = Number(result?.failed || 0)
    // If at least one message was delivered, treat as success (partial if some failed)
    if (sent > 0) {
      const partial = failed > 0
      return NextResponse.json({ ...result, partial }, { status: 200 })
    }
    // Nothing delivered; keep 400 to indicate an actionable error
    return NextResponse.json(result, { status: 400 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
