import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { getServerAuth } from '@/lib/server-auth'
import { sendNotificationToAdmins } from '@/services/notifications/notification-events.server'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
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

    const requestData: Record<string, any> | null = await sanityClient.fetch(
      `*[_type == "customerRequest" && _id == $id][0]{_id, status, name, requestId}`,
      { id },
    )

    if (!requestData) {
      return NextResponse.json({ success: false, error: 'Registration request not found' }, { status: 404 })
    }

    const allowedStatuses = ['pending']
    if (!allowedStatuses.includes(requestData.status)) {
      return NextResponse.json(
        { success: false, error: `This request is already ${requestData.status}. Only pending requests can be rejected.` },
        { status: 409 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const reason: string = body?.reason || ''
    const isDuplicateCancel = body?.duplicate === true

    const requestName = String(requestData?.name || 'A customer')

    if (isDuplicateCancel) {
      await sanityClient.patch(id).set({
        status: 'cancelled',
        cancelledReason: reason || 'Duplicate identity detected.',
        cancelledAt: new Date().toISOString(),
        cancelledBy: auth.userId || 'system',
        resolvedAt: new Date().toISOString(),
      }).commit()

      sendNotificationToAdmins({
        type: "customer.request.cancelled",
        eventId: `customer.request.cancelled.${id}`,
        title: "Registration Request Cancelled",
        body: `${requestName}'s registration request has been cancelled due to duplicate identity.`,
        data: { route: "/admin/customers", requestId: id, entityId: id, customerName: requestName },
      }).catch((e) => console.error("[Reject] FCM notification failed:", e))
    } else {
      await sanityClient.delete(id)

      sendNotificationToAdmins({
        type: "customer.request.rejected",
        eventId: `customer.request.rejected.${id}`,
        title: "Registration Request Rejected",
        body: `${requestName}'s registration request has been rejected.`,
        data: { route: "/admin/customers", requestId: id, entityId: id, customerName: requestName },
      }).catch((e) => console.error("[Reject] FCM notification failed:", e))
    }

    return NextResponse.json({
      success: true,
      message: isDuplicateCancel ? 'Registration request cancelled as duplicate' : 'Registration request deleted',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
