import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { getSanityClient } from '@/lib/sanity/client-factory'
import { getServerAuth } from '@/lib/server-auth'

export const runtime = 'nodejs'

const opsProjection = `{
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
        "resolvedBy": resolvedByUserId == "" ? null : {"_id": resolvedByUserId, "name": null},
        "rejectedBy": rejectedByUserId == "" ? null : {"_id": rejectedByUserId, "name": null},
        "customerRef": customerRefId == "" ? null : {"_id": customerRefId, "name": null, "customerId": customerId},
      }`

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

    const query = `*[_type == "customerRequest" && (_id == $id || requestId == $id)][0] `
    const legacyProjection = `{
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
      }`

    const requestData =
      (await getSanityClient('operations')
        .fetch(query + opsProjection, { id })
        .catch(() => null)) ||
      (await sanityClient
        .fetch(query + legacyProjection, { id })
        .catch(() => null))

    if (!requestData) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: requestData })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
