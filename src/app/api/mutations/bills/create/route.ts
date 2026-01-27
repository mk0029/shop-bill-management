import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { notificationService } from '@/lib/notification-service'

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
      // Split notifications:
      // - Admins: store as audience=admins (admins list depends on audience)
      // - Customer: store as audience=users (direct)
      const billId = String((created as any)?._id || '')
      const adminRoute = `/admin/billing/history?open=${encodeURIComponent(String(billId || ''))}`
      const title = 'Bill created'
      const bodyText = `Bill ${(created as any)?.billNumber || ''} created`

      await notificationService.emit({
        type: 'bill_created',
        actorUserId,
        data: {
          billId,
          route: adminRoute,
          extra: {
            title,
            body: bodyText,
          },
        },
      })

      if (customerId) {
        await notificationService.emit({
          type: 'user_direct',
          actorUserId,
          data: {
            customerId: String(customerId),
            route: '/customer',
            message: bodyText,
            extra: {
              targetUserId: String(customerId),
              title,
              body: bodyText,
            },
          },
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
