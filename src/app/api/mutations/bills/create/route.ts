import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { sendViaWaBotServer } from '@/lib/wa-bot-server'
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

    // Fire-and-forget WhatsApp + notifications (non-blocking)
    void (async () => {
      try {
        if (customerId) {
          const user = await sanityClient.fetch<{ phone?: string | null; name?: string | null } | null>(
            `*[_type=="user" && _id==$id][0]{ phone, name }`,
            { id: String(customerId) }
          )
          const rawPhone = String(user?.phone || '').trim()
          const phones = (() => {
            const p = rawPhone
            if (!p) return [] as string[]
            const digits = p.replace(/[^0-9+]/g, '')
            if (!digits) return [] as string[]
            if (digits.startsWith('+')) return [digits]
            if (digits.startsWith('0')) return [`+91${digits.substring(1)}`]
            return [`+91${digits}`]
          })()

          const billNo = String((created as any)?.billNumber || '').trim()
          const amount = Number((created as any)?.totalAmount || 0)
          const payStatus = String((created as any)?.paymentStatus || (created as any)?.status || 'pending')
          const message = `Bill ${billNo || String((created as any)?._id || '')} created. Amount: ₹${amount}. Status: ${payStatus}`

          if (phones.length) {
            console.log('[WA] Sending bill WhatsApp (API route) to phones:', phones)
            const waResult = await sendViaWaBotServer({ phones, message })
            console.log('[WA] Bill WhatsApp result:', waResult.ok ? 'OK' : 'FAILED', `sent=${waResult.sent} failed=${waResult.failed}`, waResult.error || '')
          } else {
            console.warn('[WA] No phones resolved for customer:', customerId, 'raw phone:', rawPhone)
          }
        }
      } catch (e) {
        console.error('[WA] bill_created send failed', e)
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
