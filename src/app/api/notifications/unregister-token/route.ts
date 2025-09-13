import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

export async function POST(req: NextRequest) {
  try {
    const { token, userId } = await req.json().catch(() => ({ token: null, userId: null }))
    try { console.log('[API] unregister-token request', { userId, hasToken: typeof token === 'string' && token.length > 10 }) } catch {}
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 })
    }
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    // Determine environment (dev vs prod) by host
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
    const isDevHost = /localhost|127\.0\.0\.1/i.test(host)
    const env: 'dev' | 'prod' = isDevHost ? 'dev' : 'prod'

    const doc = await sanityClient.fetch(
      `*[_type=="user" && (_id==$id || clerkId==$id)][0]{ _id, _rev, fcmTokens, fcmTokensProd, fcmTokensDev }`,
      { id: userId }
    )
    if (!doc?._id) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const makeUnique = (arr: string[]) => Array.from(new Set((Array.isArray(arr) ? arr : []).filter(Boolean)))

    let attempt = 0
    while (attempt < 2) {
      attempt++
      const current = attempt === 1 ? (doc.fcmTokens || []) : (await sanityClient.fetch(
        `*[_type=="user" && _id==$id][0]{ _rev, fcmTokens }`,
        { id: doc._id }
      ))?.fcmTokens || []

      const nextTokens = makeUnique(current).filter((t) => t !== token)
      const currentProd = attempt === 1 ? (doc.fcmTokensProd || []) : (await sanityClient.fetch(`*[_type=="user" && _id==$id][0].fcmTokensProd`, { id: doc._id })) || []
      const currentDev = attempt === 1 ? (doc.fcmTokensDev || []) : (await sanityClient.fetch(`*[_type=="user" && _id==$id][0].fcmTokensDev`, { id: doc._id })) || []
      const nextProd = env === 'prod' ? makeUnique(currentProd).filter((t) => t !== token) : makeUnique(currentProd)
      const nextDev = env === 'dev' ? makeUnique(currentDev).filter((t) => t !== token) : makeUnique(currentDev)

      try {
        const rev = attempt === 1
          ? (doc._rev as string)
          : (await sanityClient.fetch(`*[_type=="user" && _id==$id][0]._rev`, { id: doc._id })) as string
        const updated = await sanityClient
          .patch(doc._id)
          .ifRevisionId(rev)
          .setIfMissing({ fcmTokens: [], fcmTokensProd: [], fcmTokensDev: [] })
          .set({ fcmTokens: nextTokens, fcmTokensProd: nextProd, fcmTokensDev: nextDev, updatedAt: new Date().toISOString() })
          .commit({ autoGenerateArrayKeys: true }) as { _id?: string; fcmTokens?: string[] }
        try {
          console.log('[API] unregister-token success', {
            _id: updated?._id,
            tokensCount: Array.isArray(updated?.fcmTokens) ? updated!.fcmTokens!.length : 0,
          })
        } catch {}
        return NextResponse.json({ success: true, data: { _id: updated?._id, tokens: updated?.fcmTokens || [] } })
      } catch (err: unknown) {
        const e = err as { statusCode?: number; status?: number }
        const code = e?.statusCode || e?.status
        const isConflict = code === 409
        if (!isConflict) {
          throw err
        }
        // retry once on conflict
      }
    }

    return NextResponse.json({ success: true, data: { _id: doc._id, alreadyUnregistered: true } })
  } catch (e: unknown) {
    const message = (e as Error)?.message || 'Server error'
    try { console.error('[API] unregister-token error', message) } catch {}
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
