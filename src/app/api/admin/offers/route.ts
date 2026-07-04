import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/server-auth'
import { getAdminOffers, createOffer, getOfferStats } from '@/lib/offer-service'
import { sendNewOfferNotification } from '@/lib/offer-notifications'
import { sanityClient } from '@/lib/sanity'
import { isAdminLike } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated || !isAdminLike(auth.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const stats = searchParams.get('stats') === 'true'

    if (stats) {
      const offerStats = await getOfferStats()
      return NextResponse.json({ success: true, data: offerStats })
    }

    const offers = await getAdminOffers({ status, search })
    return NextResponse.json({ success: true, data: offers })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch offers'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated || !isAdminLike(auth.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const result = await createOffer(body, auth.userId!)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    const productNames: string[] = []
    if (body.productIds?.length) {
      const products = await sanityClient.fetch<Array<{ name: string }>>(
        `*[_type == "shopProduct" && _id in $productIds]{name}`,
        { productIds: body.productIds },
      )
      for (const p of products) productNames.push(p.name)
    }

    if (result.offer?.status === 'active') {
      sendNewOfferNotification(result.offer._id, result.offer.title, productNames).catch(
        (err) => console.error('[OfferFCM] Background notification failed:', err),
      )
    }

    return NextResponse.json({ success: true, data: result.offer }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create offer'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
