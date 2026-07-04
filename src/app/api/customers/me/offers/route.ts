import { NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/server-auth'
import { getCustomerOffers } from '@/lib/offer-service'

export async function GET() {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated || !auth.customerId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    const offers = await getCustomerOffers(auth.customerId)
    return NextResponse.json({ success: true, data: offers })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch customer offers'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
