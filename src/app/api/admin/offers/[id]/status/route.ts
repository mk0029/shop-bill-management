import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/server-auth'
import { updateOffer } from '@/lib/offer-service'
import { processOfferLiveNotification } from '@/services/notifications/offer-notification.server'
import { sanityClient } from '@/lib/sanity'
import { isAdminLike } from '@/lib/rbac'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated || !isAdminLike(auth.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { status } = body

    if (!status || !['active', 'inactive'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be "active" or "inactive"' },
        { status: 400 },
      )
    }

    const result = await updateOffer(id, { status })

    if (status === 'active') {
      const offer = await sanityClient.fetch<{ startAt: string; endAt: string }>(
        `*[_type == "offer" && _id == $offerId][0]{startAt, endAt}`,
        { offerId: id },
      )
      if (offer) {
        const now = Date.now()
        const start = new Date(offer.startAt).getTime()
        const end = new Date(offer.endAt).getTime()
        if (!Number.isNaN(start) && !Number.isNaN(end) && now >= start && now <= end) {
          processOfferLiveNotification(id).catch(
            (err) => console.error('[OfferNotify] Background notification failed:', err),
          )
        }
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update offer status'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
