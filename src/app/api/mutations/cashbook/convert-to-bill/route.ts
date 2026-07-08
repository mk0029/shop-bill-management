import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { notificationService } from '@/lib/notification-service'
import { getServerAuth } from '@/lib/server-auth'
import { isAdminLike } from '@/lib/rbac'

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

    const { cashbookId } = body as { cashbookId?: string }
    if (!cashbookId) {
      return NextResponse.json({ success: false, error: 'Missing cashbookId' }, { status: 400 })
    }

    const cashbook = await sanityClient.fetch(
      `*[_type == "cashBookEntry" && _id == $id][0]`,
      { id: cashbookId }
    )
    if (!cashbook) {
      return NextResponse.json({ success: false, error: 'Cashbook entry not found' }, { status: 404 })
    }

    const totalAmount = Number(cashbook.amount || 0)
    const customerRef = cashbook.user?._ref || cashbook.user || ''
    const customerName = String(cashbook.userName || 'Customer')

    const billData: any = {
      _type: 'bill',
      customer: { _type: 'reference', _ref: customerRef },
      customerName,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      paymentStatus: 'pending',
      source: 'cashbook',
      cashbookEntry: { _type: 'reference', _ref: cashbookId },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (cashbook.billNumber) billData.billNumber = String(cashbook.billNumber)
    if (cashbook.serviceDate) billData.serviceDate = cashbook.serviceDate
    if (cashbook.dueDate) billData.dueDate = cashbook.dueDate
    if (cashbook.notes) billData.notes = String(cashbook.notes)

    const created = await sanityClient.create(billData)

    try {
      await sanityClient.patch(cashbookId).set({ bill: { _type: 'reference', _ref: String((created as any)._id) }, updatedAt: new Date().toISOString() }).commit()
    } catch {}

    try {
      await notificationService.emit({
        type: 'bill_created',
        actorUserId,
        data: {
          billId: String((created as any)._id),
          customerId: customerRef,
          route: '/admin/billing',
          extra: {
            title: 'Bill created from cashbook',
            body: `${customerName} — ₹${totalAmount}`,
          },
        },
      })
    } catch (e) {
      console.error('[Notify] bill_created emit failed (convert-to-bill)', e)
    }

    return NextResponse.json({ success: true, data: created }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
