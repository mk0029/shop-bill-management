import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { sendViaWaBotServer } from '@/lib/wa-bot-server'
import { getActiveAdminUserIds, sendNotificationEvent } from '@/services/notifications/notification-events.server'

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

    const customerId = (() => {
      const c = (created as any)?.customer
      if (c && typeof c === 'object' && typeof c._ref === 'string') return c._ref
      return ''
    })()

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
          if (p.startsWith('+')) return [p]
          if (p.startsWith('0')) return [`+91${p.substring(1)}`]
          return [`+91${p}`]
        })()

        const billNo = String((created as any)?.billNumber || '').trim()
        const amount = Number((created as any)?.totalAmount || 0)
        const payStatus = String((created as any)?.paymentStatus || (created as any)?.status || 'pending')
        const message = `Bill ${billNo || String((created as any)?._id || '')} created. Amount: ₹${amount}. Status: ${payStatus}`

        if (phones.length) {
          await sendViaWaBotServer({ phones, message })
        }
      }
    } catch (e) {
      console.error('[WA] bill_created send failed', e)
    }

    try {
      // Split notifications:
      // - Admins: store as audience=admins (admins list depends on audience)
      // - Customer: store as audience=users (direct)
      const billId = String((created as any)?.billNumber || (created as any)?._id || '')
      const adminRoute = `/admin/billing?open=${encodeURIComponent(String(billId || ''))}`
      const title = 'Bill Created'
      const customerName = await (async () => {
        try {
          if (!customerId) return ''
          const doc = await sanityClient.fetch<{ name?: string } | null>(
            `*[_type=="user" && _id==$id][0]{name}`,
            { id: String(customerId) }
          )
          return String(doc?.name || '').trim()
        } catch {
          return ''
        }
      })()
      const amount = Number((created as any)?.totalAmount || 0)
      const payStatus = String((created as any)?.paymentStatus || (created as any)?.status || 'pending')
      const bodyText = `${customerName || 'Customer'} | ₹${amount} | ${payStatus}`

      const adminIds = await getActiveAdminUserIds()
      await sendNotificationEvent({
        eventId: `billing.created.${String((created as any)?._id || billId)}.admins`,
        type: 'billing.created',
        actorUserId,
        userIds: adminIds,
        title,
        body: bodyText,
        data: {
          billId,
          billNumber: String((created as any)?.billNumber || ''),
          customerId,
          route: adminRoute,
          route_path: adminRoute,
        },
        skipActor: true,
      })

      if (customerId) {
        const customerRoute = `/customer/bills?open=${encodeURIComponent(String((created as any)?._id || billId))}`
        await sendNotificationEvent({
          eventId: `billing.created.${String((created as any)?._id || billId)}.customer.${String(customerId)}`,
          type: 'billing.created',
          actorUserId,
          userId: String(customerId),
          title,
          body: `Your bill ${String((created as any)?.billNumber || billId)} has been created. Amount: Rs ${amount}.`,
          data: {
            billId: String((created as any)?._id || billId),
            billNumber: String((created as any)?.billNumber || ''),
            customerId: String(customerId),
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
