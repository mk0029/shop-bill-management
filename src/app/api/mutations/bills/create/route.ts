import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { emitWaEventServer } from '@/lib/wa-bot-server'
import { getActiveAdminUserIds, createAndDispatchNotification } from '@/services/notifications/notification-events.server'
import { safeUserName } from '@/lib/display-text'
import {
  billCreatedAdminNotification,
  billCreatedCustomerNotification,
} from '@/lib/notifications/templates'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const actorUserId = (String(body?.actorUserId || '')).trim()
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Missing actorUserId' }, { status: 400 })
    }

    const bill = body?.bill
    if (!bill || typeof bill !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing bill payload' }, { status: 400 })
    }

    // bill is expected to already contain proper Sanity references
    const created = await sanityClient.create({
      ...(bill as any),
      _type: 'bill',
      createdAt: (bill as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(actorUserId ? { technician: { _type: 'reference', _ref: actorUserId } } : {}),
    } as any)

    console.log('[BillCreate] Bill created in Sanity:', (created as any)?._id, (created as any)?.billNumber)

    const customerId = (() => {
      const c = (created as any)?.customer
      if (c && typeof c === 'object' && typeof c._ref === 'string') return c._ref
      return ''
    })()

    // Fire-and-forget WhatsApp event (non-blocking)
    void (async () => {
      try {
        const user = customerId
          ? await sanityClient.fetch<{ phone?: string | null; name?: string | null } | null>(`*[_type=="user" && _id==$id][0]{ phone, name }`, { id: String(customerId) })
          : null
        await emitWaEventServer('billing.created', {
          billId: String((created as any)?._id || ''),
          billNumber: String((created as any)?.billNumber || ''),
          customerId,
          customerName: safeUserName(user?.name, 'Customer'),
          customerPhone: String(user?.phone || ''),
          totalAmount: Number((created as any)?.totalAmount || 0),
          paidAmount: Number((created as any)?.paidAmount || 0),
          balanceAmount: Number((created as any)?.balanceAmount || 0),
          paymentStatus: String((created as any)?.paymentStatus || 'pending'),
          dueDate: (created as any)?.dueDate,
          updatedAt: (created as any)?.updatedAt || new Date().toISOString(),
          idempotencyKey: `billing.created:${String((created as any)?._id || '')}`,
        })
      } catch (e) {
        console.error('[WA] billing.created event failed', e)
      }
    })()
    // Emit realtime event through Sanity's listen system
    try {
      await sanityClient.patch(String((created as any)._id)).set({ updatedAt: new Date().toISOString() }).commit()
      console.log('[BillCreate] Triggered realtime sync for bill:', (created as any)._id)
    } catch {}

    try {
      // Split notifications:
      // - Admins: store as audience=admins (admins list depends on audience)
      // - Customer: store as audience=users (direct)
      const billId = String((created as any)?.billNumber || (created as any)?._id || '')
      const adminRoute = `/admin/billing?open=${encodeURIComponent(String(billId || ''))}`
      const customerName = await (async () => {
        try {
          if (!customerId) return ''
          const doc = await sanityClient.fetch<{ name?: string } | null>(
            `*[_type=="user" && _id==$id][0]{name}`,
            { id: String(customerId) }
          )
          return safeUserName(doc?.name, 'Customer')
        } catch {
          return ''
        }
      })()
      const amount = Number((created as any)?.totalAmount || 0)
      const adminNotification = billCreatedAdminNotification({ amount, customerName })
      const customerNotification = billCreatedCustomerNotification({ amount, customerName })

      const adminIds = await getActiveAdminUserIds()
      await createAndDispatchNotification({
        eventId: `billing.created.${String((created as any)?._id || billId)}.admins`,
        type: adminNotification.type,
        actorUserId,
        userIds: adminIds,
        title: adminNotification.title,
        body: adminNotification.body,
        data: {
          billId,
          billNumber: String((created as any)?.billNumber || ''),
          customerId,
          targetRole: adminNotification.targetRole,
          route: adminRoute,
          route_path: adminRoute,
        },
        skipActor: true,
      })

      if (customerId) {
        const customerRoute = `/customer/bills?open=${encodeURIComponent(String((created as any)?._id || billId))}`
        await createAndDispatchNotification({
          eventId: `billing.created.${String((created as any)?._id || billId)}.customer.${String(customerId)}`,
          type: customerNotification.type,
          actorUserId,
          userId: String(customerId),
          title: customerNotification.title,
          body: customerNotification.body,
          data: {
            billId: String((created as any)?._id || billId),
            billNumber: String((created as any)?.billNumber || ''),
            customerId: String(customerId),
            targetRole: customerNotification.targetRole,
            route: customerRoute,
            route_path: customerRoute,
          },
          skipActor: true,
        })
      }
    } catch (e) {
      console.error('[Notify] bill_created emit failed', e)
    }

    return NextResponse.json({ success: true, data: created }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
