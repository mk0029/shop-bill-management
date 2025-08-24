import { NextRequest, NextResponse } from 'next/server'
import { sendNotification } from '@/lib/notification-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || (!body.tokens && !body.userIds)) {
      return NextResponse.json({ success: false, error: 'Provide tokens or userIds' }, { status: 400 })
    }
    if (!body.title || !body.body) {
      return NextResponse.json({ success: false, error: 'Missing title/body' }, { status: 400 })
    }

    const result = await sendNotification({
      title: body.title,
      body: body.body,
      data: body.data,
      tokens: body.tokens,
      userIds: body.userIds,
      sound: body.sound || undefined,
    })
    if ((result as any).success === false) {
      return NextResponse.json(result, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
