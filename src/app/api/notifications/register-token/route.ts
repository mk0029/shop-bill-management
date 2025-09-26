/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

export async function POST(req: NextRequest) {
  try {
    const { token, userId } = await req.json().catch(() => ({ token: null, userId: null }))
    try {
       console.log('[API] register-token request') } catch {}
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

    // Fetch current tokens with revision for optimistic concurrency
    const doc = await sanityClient.fetch(
      `*[_type=="user" && (_id==$id || clerkId==$id)][0]{ _id, _rev, fcmTokens, fcmTokensProd, fcmTokensDev }`,
      { id: userId }
    )
    if (!doc?._id) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const tokens: string[] = Array.isArray(doc.fcmTokens) ? doc.fcmTokens.filter(Boolean) : []
    const tokensProd: string[] = Array.isArray((doc as any).fcmTokensProd) ? (doc as any).fcmTokensProd.filter(Boolean) : []
    const tokensDev: string[] = Array.isArray((doc as any).fcmTokensDev) ? (doc as any).fcmTokensDev.filter(Boolean) : []
    if (tokens.includes(token)) {
      // Ensure env-specific arrays also contain it
      const alreadyInEnv = env === 'prod' ? tokensProd.includes(token) : tokensDev.includes(token)
      if (alreadyInEnv) {
        return NextResponse.json({ success: true, data: { _id: doc._id, alreadyRegistered: true } })
      }
    }

    // Compute unique array and commit with optimistic concurrency control
    const makeUnique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)))
    let attempt = 0
    while (attempt < 2) {
      attempt++
      const current = attempt === 1 ? tokens : (await sanityClient.fetch(
        `*[_type=="user" && _id==$id][0]{ _rev, fcmTokens }`,
        { id: doc._id }
      ))?.fcmTokens ?? []

      const nextTokens = makeUnique([...(Array.isArray(current) ? current : []), token])
      // Prepare env-specific arrays
      const currentProd = attempt === 1 ? tokensProd : (await sanityClient.fetch(`*[_type=="user" && _id==$id][0].fcmTokensProd`, { id: doc._id })) || []
      const currentDev = attempt === 1 ? tokensDev : (await sanityClient.fetch(`*[_type=="user" && _id==$id][0].fcmTokensDev`, { id: doc._id })) || []
      const nextProd = env === 'prod' ? makeUnique([...(Array.isArray(currentProd) ? currentProd : []), token]) : makeUnique([...(Array.isArray(currentProd) ? currentProd : [])].filter(t => t !== token))
      const nextDev = env === 'dev' ? makeUnique([...(Array.isArray(currentDev) ? currentDev : []), token]) : makeUnique([...(Array.isArray(currentDev) ? currentDev : [])].filter(t => t !== token))

      try {
        const updated = await sanityClient
          .patch(doc._id)
          .ifRevisionId(attempt === 1 ? doc._rev : (await sanityClient.fetch(`*[_type=="user" && _id==$id][0]._rev`, { id: doc._id })) as string)
          .setIfMissing({ fcmTokens: [], fcmTokensProd: [], fcmTokensDev: [] })
          .set({ fcmTokens: nextTokens, fcmTokensProd: nextProd, fcmTokensDev: nextDev, updatedAt: new Date().toISOString() })
          .commit({ autoGenerateArrayKeys: true })
        try { console.log('[API] register-token success') } catch {}
        return NextResponse.json({ success: true, data: { _id: (updated as any)._id, tokens: (updated as any).fcmTokens || [] } })
      } catch (err: any) {
        const code = err?.statusCode || err?.status
        const isConflict = code === 409
        if (!isConflict) {
          throw err
        }
        // Retry once on revision conflict
      }
    }
    // If still failing, fall back to success since another request most likely registered it
    return NextResponse.json({ success: true, data: { _id: doc._id, alreadyRegistered: true } })
  } catch (e: any) {
    try { console.error('[API] register-token error', e?.message || e) } catch {}
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
