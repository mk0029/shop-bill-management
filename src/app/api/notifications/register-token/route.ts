import { NextRequest, NextResponse } from 'next/server'
import { registerFcmToken } from '@/lib/fcm/tokens.server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { token, userId, deviceInfo } = body
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 })
    }
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const data = await registerFcmToken({ userId, token, deviceInfo })
    console.log('[FCM_TRACE] register_token_saved', JSON.stringify({
      userId: data.userId,
      tokenId: data.tokenId,
      deviceId: deviceInfo?.deviceId || '',
    }))
    return NextResponse.json({ success: true, data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    console.error('[FCM_TRACE] register_token_error', message)
    return NextResponse.json({ success: false, error: message }, { status: message === 'User not found' ? 404 : 500 })
  }
}
