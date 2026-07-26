import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { notificationService } from '@/lib/notification-service'
import { getServerAuth } from '@/lib/server-auth'
import { isAdminLike } from '@/lib/rbac'

function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

function ensureUTC(dateStr: string | undefined | null): string {
  if (!dateStr) return new Date().toISOString()
  const s = String(dateStr).trim()
  if (/Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) return s
  return s + "Z"
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated || !isAdminLike(auth.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))

    const actorUserId = (
      String(body?.actorUserId || auth.userId || '')
    ).trim()
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Missing actorUserId' }, { status: 400 })
    }

    const entryId = String(body?.entryId || '').trim()
    const paymentAmount = Number(body?.paymentAmount || 0)
    const paymentDate = ensureUTC(body?.paymentDate ? String(body.paymentDate) : undefined)
    const paymentMethod = String(body?.paymentMethod || 'cash').trim()
    const note = String(body?.note || '').trim()

    if (!entryId) {
      return NextResponse.json({ success: false, error: 'Missing entryId' }, { status: 400 })
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid payment amount' }, { status: 400 })
    }

    const safePaymentAmount = roundCurrency(paymentAmount)

    const existingEntry = await sanityClient.fetch(
      `*[_type == "cashBookEntry" && _id == $id][0]`,
      { id: entryId }
    )

    if (!existingEntry) {
      return NextResponse.json({ success: false, error: 'Cashbook entry not found' }, { status: 404 })
    }

    const currentPending = Number(existingEntry.pendingAmount || 0)
    const currentReceived = Number(existingEntry.receivedAmount || existingEntry.amount || 0)
    const totalAmount = Number(existingEntry.totalAmount || existingEntry.amount || 0)
    const customerName = String(existingEntry.customerName || '').trim()
    const userRef = existingEntry.user

    if (currentPending <= 0) {
      return NextResponse.json({ success: false, error: 'This entry has no pending amount' }, { status: 400 })
    }

    const actualPayment = Math.min(safePaymentAmount, currentPending)
    const newPendingAmount = roundCurrency(currentPending - actualPayment)
    const newReceivedAmount = roundCurrency(currentReceived + actualPayment)
    const newStatus = newPendingAmount > 0 ? 'partial' : 'completed'

    await sanityClient
      .patch(entryId)
      .set({
        pendingAmount: newPendingAmount,
        receivedAmount: newReceivedAmount,
        amount: newReceivedAmount,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })
      .commit()

    const linkedEntryData: any = {
      _type: 'cashBookEntry',
      userName: customerName || 'Pending Payment',
      amount: actualPayment,
      totalAmount: actualPayment,
      pendingAmount: 0,
      receivedAmount: actualPayment,
      type: 'credit',
      source: 'manual',
      status: 'completed',
      notes: note || `Pending payment received for: ${existingEntry.notes || customerName}`,
      customerName,
      customerId: existingEntry.customerId || undefined,
      isCustomName: existingEntry.isCustomName || false,
      createdBy: actorUserId,
      paymentMethod,
      paymentDate,
      linkedEntry: { _type: 'reference', _ref: entryId },
      createdAt: paymentDate,
      updatedAt: new Date().toISOString(),
    }

    if (userRef) {
      linkedEntryData.user = userRef
    }

    const linkedEntry = await sanityClient.create(linkedEntryData)

    try {
      const title = 'Pending payment received'
      const bodyText = `₹${actualPayment} received from ${customerName}${note ? ` • ${note}` : ''}`
      notificationService.emit({
        eventId: `cashbook_pending.${linkedEntry._id}`,
        type: 'cashbook_entry',
        actorUserId,
        data: {
          route: '/admin/cash-book/history',
          extra: { title, body: bodyText },
        },
      }).catch(() => {})
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        updatedEntry: {
          _id: entryId,
          pendingAmount: newPendingAmount,
          receivedAmount: newReceivedAmount,
          status: newStatus,
        },
        linkedEntry: {
          _id: linkedEntry._id,
          amount: actualPayment,
        },
        paymentReceived: actualPayment,
      },
    }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
