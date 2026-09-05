import { NextRequest, NextResponse } from 'next/server'
import { createDocument, updateDocument } from '@/lib/sanity/write-router'
import { querySingleDocument } from '@/lib/sanity/read-router'
import { denormalizeBill } from '@/lib/sanity/denormalize'
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

    const cashbookRes = await querySingleDocument<{
      _id: string;
      amount?: number;
      user?: { _ref?: string } | string;
      userName?: string;
      billNumber?: string;
      serviceDate?: string;
      dueDate?: string;
      notes?: string;
    }>(
      `*[_type == "cashBookEntry" && _id == $id][0]`,
      { id: cashbookId },
      'cashbook'
    )
    const cashbook = cashbookRes.data
    if (!cashbook) {
      return NextResponse.json({ success: false, error: 'Cashbook entry not found' }, { status: 404 })
    }

    const totalAmount = Number(cashbook.amount || 0)
    const customerRef = (typeof cashbook.user === 'object' && cashbook.user !== null && '._ref' in cashbook.user ? cashbook.user._ref : undefined) || (typeof cashbook.user === 'string' ? cashbook.user : '') || ''
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

    const created = await createDocument(denormalizeBill(billData), 'bills')
    if (!created.success) {
      return NextResponse.json({ success: false, error: created.error || 'Failed to create bill' }, { status: 500 })
    }
    const createdBill = { _id: created.documentId, ...billData }

    try {
      await updateDocument(cashbookId, { bill: { _type: 'reference', _ref: String(createdBill._id) }, updatedAt: new Date().toISOString() }, 'cashbook')
    } catch {}

    try {
      await notificationService.emit({
        type: 'bill_created',
        actorUserId,
        data: {
          billId: String(createdBill._id),
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

    return NextResponse.json({ success: true, data: createdBill }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
