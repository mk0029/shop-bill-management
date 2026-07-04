import { NextRequest, NextResponse } from 'next/server'
import { getActiveOfferForProduct } from '@/lib/offer-service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const offer = await getActiveOfferForProduct(id)
    return NextResponse.json({ success: true, data: offer })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch product offers'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
