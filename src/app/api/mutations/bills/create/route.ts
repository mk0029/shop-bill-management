import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { emitWaEventServer } from '@/lib/wa-bot-server'
import { getActiveAdminUserIds, createAndDispatchNotification } from '@/services/notifications/notification-events.server'
import { safeUserName } from '@/lib/display-text'
import {
  billCreatedAdminNotification,
  billCreatedCustomerNotification,
} from '@/lib/notifications/templates'
import { getServerAuth } from '@/lib/server-auth'
import { isAdminLike } from '@/lib/rbac'
import { calculateBillPaymentSummary } from '@/lib/bill-utils'

function siteUrl() {
  return 'https://jambh-ell.vercel.app'
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated || !isAdminLike(auth.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const actorUserId = (String(body?.actorUserId || auth.userId || '')).trim()
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Missing actorUserId' }, { status: 400 })
    }

    const bill = body?.bill
    if (!bill || typeof bill !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing bill payload' }, { status: 400 })
    }

    const customerId = (() => {
      const c = (bill as any)?.customer
      if (c && typeof c === 'object' && typeof c._ref === 'string') return c._ref
      return ''
    })()
    if (customerId) {
      const customerDoc = await sanityClient.fetch<{ role?: string } | null>(
        `*[_type == "user" && _id == $id][0]{ role }`,
        { id: customerId },
      )
      const role = String(
        customerDoc?.role || (customerDoc as any)?.userRole || '',
      ).toLowerCase()
      if (role && role !== 'customer') {
        return NextResponse.json(
          { success: false, error: 'Bills can only be created for customer accounts.' },
          { status: 403 },
        )
      }
    }

    const created = await sanityClient.create({
      ...(bill as any),
      _type: 'bill',
      createdAt: (bill as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(actorUserId ? { technician: { _type: 'reference', _ref: actorUserId } } : {}),
    } as any)

    const createdCustomerId = (() => {
      const c = (created as any)?.customer
      if (c && typeof c === 'object' && typeof c._ref === 'string') return c._ref
      return ''
    })()

    void (async () => {
      try {
        const user = customerId
          ? await sanityClient.fetch<{ phone?: string | null; name?: string | null; secretKey?: string | null } | null>(`*[_type=="user" && _id==$id][0]{ phone, name, secretKey }`, { id: String(customerId) })
          : null

        const loginUrl = user?.phone
          ? `${siteUrl()}/login?phone=${encodeURIComponent(user.phone)}&passKey=${encodeURIComponent(user.secretKey || '')}`
          : ''

        const summary = calculateBillPaymentSummary({
          totalAmount: Number((created as any)?.totalAmount || 0),
          paidAmount: Number((created as any)?.paidAmount || 0),
          discount: Number((created as any)?.discount || 0),
        })

        let eventType = 'billing.created.unpaid'
        if (summary.finalTotal === 0) {
          eventType = 'billing.created.zero_balance'
        } else if (summary.isFullyPaid) {
          eventType = 'billing.created.paid'
        } else if (summary.paymentStatus === 'partial') {
          eventType = 'billing.created.partial'
        }

        const billId = String((created as any)?._id || '')
        await emitWaEventServer(eventType, {
          billId,
          billNumber: String((created as any)?.billNumber || ''),
          customerId,
          customerName: safeUserName(user?.name, 'Customer'),
          customerPhone: String(user?.phone || ''),
          phone: String(user?.phone || ''),
          loginUrl,
          totalAmount: summary.subtotal,
          discount: summary.discount,
          paidAmount: summary.amountPaid,
          balanceAmount: summary.remainingBalance,
          paymentStatus: summary.paymentStatus,
          isFullyPaid: summary.isFullyPaid,
          finalTotal: summary.finalTotal,
          dueDate: (created as any)?.dueDate,
          serviceName: (created as any)?.serviceType || (created as any)?.serviceName || '',
          technicianName: (created as any)?.technicianName || '',
          updatedAt: (created as any)?.updatedAt || new Date().toISOString(),
          idempotencyKey: `${eventType}:${billId}:${(created as any)?.updatedAt || Date.now()}`,
        })

      } catch (e) {
        console.error('[WA] billing.created event failed', e)
      }
    })()

    try {
      await sanityClient.patch(String((created as any)._id)).set({ updatedAt: new Date().toISOString() }).commit()
    } catch {}

    try {
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
