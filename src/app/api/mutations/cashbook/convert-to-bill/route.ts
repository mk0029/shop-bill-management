import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { sendViaWaBotServer } from '@/lib/wa-bot-server'
import { safeUserName } from '@/lib/display-text'
import { getActiveAdminUserIds, sendNotificationEvent } from '@/services/notifications/notification-events.server'
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

    const params = body?.params
    if (!params || typeof params !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing params payload' }, { status: 400 })
    }

    const cashbookId = String((params as any).cashbookId || '').trim()
    const customerId = String((params as any).customerId || '').trim()

    if (!cashbookId || !customerId) {
      return NextResponse.json({ success: false, error: 'Missing cashbookId/customerId' }, { status: 400 })
    }

    const itemsQuery = `*[_type == "cashbookItem" && cashbook._ref == $cashbookId && !defined(bill)]`
    const pendingItems: any[] = await sanityClient.fetch(itemsQuery, { cashbookId })
    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No pending items to bill' }, { status: 400 })
    }

    const billItems = pendingItems.map((ci) => ({
      _type: 'billItem',
      product: ci.product ? { _type: 'reference', _ref: (ci.product as any)._ref || ci.product } : undefined,
      productName: ci.itemName,
      category: ci.category || undefined,
      brand: ci.brand || undefined,
      specifications: ci.specifications || undefined,
      unit: ci.unit || '',
      quantity: Number(ci.quantity) || 0,
      unitPrice: Number(ci.unitPrice) || 0,
      totalPrice: Math.max(0, Number(((ci as any).totalPrice ?? (ci.quantity * ci.unitPrice)) || 0)),
    }))

    const subtotal = billItems.reduce((sum: number, it: any) => sum + (Number(it.totalPrice) || 0), 0)
    const homeVisitFee = Number((params as any).homeVisitFee || 0)
    const repairFee = Number((params as any).repairFee || 0)
    const totalAmount = Math.max(0, subtotal + homeVisitFee + repairFee)
    const paidAmount = Number((params as any).paidAmount || 0)
    const balanceAmount = Math.max(0, totalAmount - paidAmount)

    const billDoc: any = {
      _type: 'bill',
      billNumber: `BILL_${Date.now()}`,
      customer: { _type: 'reference', _ref: customerId },
      serviceType: String((params as any).serviceType || ''),
      locationType: String((params as any).locationType || ''),
      items: billItems,
      serviceDate: new Date().toISOString(),
      homeVisitFee,
      repairFee,
      subtotal,
      discount: 0,
      totalAmount,
      paymentStatus: String((params as any).paymentStatus || 'pending'),
      paidAmount,
      balanceAmount,
      status: 'draft',
      priority: 'medium',
      notes: String((params as any).notes || ''),
      technician: { _type: 'reference', _ref: actorUserId },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const tx = sanityClient.transaction()
    tx.create(billDoc)
    const result = await tx.commit()
    const createdBillId = (result as any)?.results?.[0]?.id || (result as any)?._id

    const patchTx = sanityClient.transaction()
    for (const it of pendingItems) {
      patchTx.patch(it._id, (p: any) => p.set({ bill: { _type: 'reference', _ref: createdBillId }, locked: true, updatedAt: new Date().toISOString() }))
    }
    patchTx.patch(cashbookId, (p: any) => p.set({ updatedAt: new Date().toISOString() }))
    await patchTx.commit()

    try {
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

      const billNo = String((billDoc as any)?.billNumber || '').trim()
      const payStatus = String((billDoc as any)?.paymentStatus || 'pending')
      const message = `Bill ${billNo || String(createdBillId)} created. Amount: ₹${Number(totalAmount || 0)}. Status: ${payStatus}`

      if (phones.length) {
        await sendViaWaBotServer({ phones, message })
      }
    } catch (e) {
      console.error('[WA] bill_created(convert) send failed', e)
    }

    try {
      const billId = String(createdBillId)
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
      const adminNotification = billCreatedAdminNotification({ amount: totalAmount, customerName })
      const customerNotification = billCreatedCustomerNotification({ amount: totalAmount, customerName })
      const adminRoute = `/admin/billing?open=${encodeURIComponent(String(billId))}`
      const customerRoute = `/customer/bills?open=${encodeURIComponent(String(billId))}`

      await sendNotificationEvent({
        eventId: `billing.created.${billId}.admins`,
        type: adminNotification.type,
        actorUserId,
        userIds: await getActiveAdminUserIds(),
        title: adminNotification.title,
        body: adminNotification.body,
        data: {
          billId,
          billNumber: String((billDoc as any)?.billNumber || ''),
          customerId,
          targetRole: adminNotification.targetRole,
          route: adminRoute,
          route_path: adminRoute,
        },
        skipActor: true,
      })

      if (customerId) {
        await sendNotificationEvent({
          eventId: `billing.created.${billId}.customer.${String(customerId)}`,
          type: customerNotification.type,
          actorUserId,
          userId: String(customerId),
          title: customerNotification.title,
          body: customerNotification.body,
          data: {
            billId,
            billNumber: String((billDoc as any)?.billNumber || ''),
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

    return NextResponse.json({ success: true, data: { bill: { _id: String(createdBillId) }, count: pendingItems.length } }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
