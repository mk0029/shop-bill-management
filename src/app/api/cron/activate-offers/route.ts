import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { processOfferLiveNotification } from '@/services/notifications/offer-notification.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || ''
  if (!secret && process.env.NODE_ENV !== 'production') return true

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  const header = req.headers.get('x-cron-secret')?.trim()
  const query = req.nextUrl.searchParams.get('secret')?.trim()

  const hasSecret = Boolean(secret)
  const authMethod = bearer && bearer === secret
    ? 'bearer'
    : header && header === secret
      ? 'x-cron-secret'
      : query && query === secret
        ? 'query'
        : 'none'

  if (hasSecret && authMethod === 'none') {
    console.warn(JSON.stringify({
      job: 'activate-offers',
      event: 'unauthorized',
      hasSecret,
      authMethod,
      authHeaderPresent: Boolean(bearer || header || query),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent')?.slice(0, 100) || 'unknown',
    }))
  }

  return Boolean(secret && authMethod !== 'none')
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()
  const results: Array<{ offerId: string; title: string; status: string; notified?: number; error?: string }> = []

  const offersToActivate = await sanityClient.fetch<Array<{ _id: string; title: string }>>(
    `*[_type=="offer" && status=="inactive" && startAt <= $now && endAt >= $now]`,
    { now },
  )

  for (const offer of offersToActivate) {
    try {
      await sanityClient.patch(offer._id).set({ status: 'active', updatedAt: now }).commit()
      const r = await processOfferLiveNotification(offer._id)
      results.push({ offerId: offer._id, title: offer.title, status: 'activated', notified: r.notified })
    } catch (err) {
      results.push({ offerId: offer._id, title: offer.title, status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({ success: true, activated: results.length, results })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
