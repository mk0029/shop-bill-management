import { NextResponse } from 'next/server'
import { getAllActiveOffers } from '@/lib/offer-service'

export async function GET() {
  try {
    const offers = await getAllActiveOffers()
    return NextResponse.json({ success: true, data: offers })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch active offers'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
