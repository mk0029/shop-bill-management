import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { createDocument, updateDocument } from '@/lib/sanity/write-router'
import { denormalizeBill } from '@/lib/sanity/denormalize'
import { getActiveAdminUserIds, createAndDispatchNotification } from '@/services/notifications/notification-events.server'
import { safeUserName } from '@/lib/display-text'
import {
  billCreatedAdminNotification,
  billCreatedCustomerNotification,
} from '@/lib/notifications/templates'
import { getServerAuth } from '@/lib/server-auth'
import { isAdminLike } from '@/lib/rbac'
import { createCashBookEntryFromBill, type BillPaymentData } from '@/lib/bill-payment-sync'

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
      if (c && typeof c === 'string') return c
      return ''
    })()
    let customerName = ''
    let customerPhone = ''
    if (customerId) {
      const customerDoc = await sanityClient.fetch<{ role?: string; name?: string; phone?: string | null } | null>(
        `*[_type == "user" && _id == $id][0]{ role, name, phone }`,
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
      customerName = String(customerDoc?.name || '')
      customerPhone = String(customerDoc?.phone || '')
    }

    const rawBill: Record<string, unknown> = {
      ...(bill as any),
      _type: 'bill',
      createdAt: (bill as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(actorUserId ? { technician: { _type: 'reference', _ref: actorUserId } } : {}),
    }
    if (customerName && !rawBill.customerName) rawBill.customerName = customerName
    if (customerPhone && !rawBill.customerPhone) rawBill.customerPhone = customerPhone

    const billData = denormalizeBill(rawBill) as Record<string, unknown>
    const createdResult = await createDocument(billData, 'bills')
    if (!createdResult.success) {
      return NextResponse.json(
        { success: false, error: createdResult.error || 'Failed to create bill' },
        { status: 500 },
      )
    }
    const created = { _id: createdResult.documentId, ...billData } as any

    // Draft bills skip admin/customer notifications.
    const isDraft = (body as any)?.draft === true || String((bill as any)?.status || (created as any)?.status || '') === 'draft'

    if (!isDraft) {
      try {
        await updateDocument(String((created as any)._id), { updatedAt: new Date().toISOString() }, 'bills')
      } catch {}
    }

    if (!isDraft) {
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
    }

    // When a bill is created as already paid/partially paid, the received
    // amount must be recorded in the cash book. This runs server-side so every
    // creation path (form, offline queue, store, etc.) is covered. It is
    // idempotent — createCashBookEntryFromBill skips if an entry already exists
    // for this bill — so the client-side sync in form-service.ts cannot double it.
    try {
      const status = String((created as any)?.paymentStatus || '').toLowerCase()
      if (status === 'paid' || status === 'partial') {
        const paidAmount = Number((created as any)?.paidAmount || 0)
        const totalAmount = Number((created as any)?.totalAmount || 0)
        if (paidAmount > 0 && customerId && totalAmount > 0) {
          const entryData: BillPaymentData = {
            billId: String((created as any)?._id),
            billNumber: String((created as any)?.billNumber || ''),
            customerId: customerId,
            customerName: customerName || 'Customer',
            customerPhone: customerPhone || undefined,
            amount: paidAmount,
            paymentStatus: status as 'paid' | 'partial',
            paymentDate: new Date().toISOString(),
            totalAmount,
            paidAmount,
            balanceAmount: Math.max(0, totalAmount - paidAmount),
          }
          void (async () => {
            try {
              const result = await createCashBookEntryFromBill(entryData)
              if (!result.success && !/already exists/i.test(result.message)) {
                console.warn('[BillCreate] cashbook sync:', result.message)
              }
            } catch (err) {
              console.error('[BillCreate] cashbook sync error:', err)
            }
          })()
        }
      }
    } catch {}

    return NextResponse.json({ success: true, data: created }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
