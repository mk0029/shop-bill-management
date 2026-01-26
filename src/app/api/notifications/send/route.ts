import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, sendToAdmins, sendToAll } from '@/lib/notification-service'
import { sanityClient } from '@/lib/sanity'

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
      try {
        const audience = body?.audience === 'admins' || body?.audience === 'all' ? body.audience : 'users'
        const data = (body?.data && typeof body.data === 'object') ? body.data : undefined
        const doc: Record<string, unknown> = {
          _type: 'notification',
          title: String(body.title),
          body: String(body.body),
          audience,
          targetUserIds: Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : [],
          targetPhones: Array.isArray(body.phoneNumbers) ? body.phoneNumbers.filter(Boolean) : [],
          data: data ? data : undefined,
          billId: data?.billId ? String(data.billId) : undefined,
          billNumber: data?.billNumber ? String(data.billNumber) : undefined,
          event: data?.event ? String(data.event) : undefined,
          customerId: data?.customerId ? String(data.customerId) : undefined,
          createdAt: new Date().toISOString(),
        }
        void sanityClient.create(doc as any).catch(() => {})
      } catch {}
      const partial = failed > 0
      return NextResponse.json({ ...result, partial }, { status: 200 })
    }
    // Nothing delivered; return 200 with success:false so clients can fire-and-forget without red network errors
    return NextResponse.json({ success: false, sent, failed }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
