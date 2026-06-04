import { NextRequest, NextResponse } from 'next/server'
import { unregisterFcmToken } from '@/lib/fcm/tokens.server'

export async function POST(req: NextRequest) {
  try {
    const { token, userId } = await req.json().catch(() => ({ token: null, userId: null }))
    try { console.log('[API] unregister-token request') } catch {}
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 })
    }
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const data = await unregisterFcmToken(userId, token)
    return NextResponse.json({ success: true, data })
  } catch (e: unknown) {
    const message = (e as Error)?.message || 'Server error'
    try { console.error('[API] unregister-token error', message) } catch {}
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
