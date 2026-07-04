import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/server-auth'
import { getAdminOfferClaims, cancelClaim } from '@/lib/offer-service'
import { isAdminLike } from '@/lib/rbac'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated || !isAdminLike(auth.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const claims = await getAdminOfferClaims(id)
    return NextResponse.json({ success: true, data: claims })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch claims'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

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
    const { action, reason } = body

    if (action === 'cancel') {
      const result = await cancelClaim(id, auth.userId!, reason || 'Cancelled by admin')
      return NextResponse.json({ success: result.success })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process claim'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
