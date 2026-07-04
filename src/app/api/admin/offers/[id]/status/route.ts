import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/server-auth'
import { updateOffer } from '@/lib/offer-service'
import { sendNewOfferNotification } from '@/lib/offer-notifications'
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
      const offer = await sanityClient.fetch<{ title: string; products?: Array<{ _ref?: string }> }>(
        `*[_type == "offer" && _id == $offerId][0]{title, products}`,
        { offerId: id },
      )
      if (offer) {
        const productIds: string[] = (offer.products || [])
          .map((p: { _ref?: string }) => p._ref || '')
          .filter(Boolean)
        const productNames: string[] = []
        if (productIds.length) {
          const products = await sanityClient.fetch<Array<{ name: string }>>(
            `*[_type == "shopProduct" && _id in $productIds]{name}`,
            { productIds },
          )
          for (const p of products) productNames.push(p.name)
        }
        sendNewOfferNotification(id, offer.title, productNames).catch(
          (err) => console.error('[OfferFCM] Background notification failed:', err),
        )
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update offer status'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
