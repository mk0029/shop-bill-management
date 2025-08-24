import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

export async function POST(req: NextRequest) {
  try {
    const { token, userId } = await req.json().catch(() => ({ token: null, userId: null }))
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 })
    }
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    // Fetch current tokens
    const doc = await sanityClient.fetch(`*[_type=="user" && (_id==$id || id==$id)][0]{ _id, fcmTokens }`, { id: userId })
    if (!doc?._id) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const tokens: string[] = Array.isArray(doc.fcmTokens) ? doc.fcmTokens.filter(Boolean) : []
    if (tokens.includes(token)) {
      return NextResponse.json({ success: true, data: { _id: doc._id, alreadyRegistered: true } })
    }

    const updated = await sanityClient
      .patch(doc._id)
      .setIfMissing({ fcmTokens: [] })
      .append('fcmTokens', [token])
      .commit({ autoGenerateArrayKeys: true })

    return NextResponse.json({ success: true, data: { _id: updated._id, tokens: (updated as any).fcmTokens || [] } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
