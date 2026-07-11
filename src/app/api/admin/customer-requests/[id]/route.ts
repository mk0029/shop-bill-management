import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { getServerAuth } from '@/lib/server-auth'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (auth.role !== 'admin' && auth.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const requestData = await sanityClient.fetch(
      `*[_type == "customerRequest" && (_id == $id || requestId == $id)][0] {
        _id,
        requestId,
        name,
        phone,
        email,
        location,
        company,
        requestType,
        status,
        deviceFingerprint,
        ipAddress,
        adminNotes,
        submittedAt,
        expiresAt,
        resolvedAt,
        rejectionReason,
        customerId,
        createdAt,
        auditTrail,
        cancelledReason,
        cancelledAt,
        cancelledBy,
        "resolvedBy": resolvedBy->{_id, name},
        "rejectedBy": rejectedBy->{_id, name},
        "customerRef": customerRef->{_id, name, customerId, phone, email, location},
      }`,
      { id },
    )

    if (!requestData) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: requestData })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
