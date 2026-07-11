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
  return Boolean(secret && (bearer === secret || header === secret || query === secret))
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
