import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/server-auth'
import { claimOffer, getActiveOfferForProduct } from '@/lib/offer-service'
import { sendClaimSuccessNotification } from '@/lib/offer-notifications'
import { sanityClient } from '@/lib/sanity'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> },
) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated || !auth.userId || !auth.customerId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }
    if (auth.role !== 'customer') {
      return NextResponse.json(
        { success: false, error: 'Only customers can claim offers' },
        { status: 403 },
      )
    }

    const { offerId } = await params
    const result = await claimOffer(auth.customerId, auth.userId, offerId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.reason || 'Failed to claim offer' },
        { status: 400 },
      )
    }

    const productNames: string[] = []
    if (result.claim?.productIds?.length) {
      const products = await sanityClient.fetch<Array<{ name: string }>>(
        `*[_type == "shopProduct" && _id in $productIds]{name}`,
        { productIds: result.claim.productIds },
      )
      for (const p of products) productNames.push(p.name)
    }

    sendClaimSuccessNotification(
      auth.customerId,
      offerId,
      productNames,
    ).catch((err) => console.error('[OfferFCM] Background claim notification failed:', err))

    return NextResponse.json({ success: true, data: result.claim })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to claim offer'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
