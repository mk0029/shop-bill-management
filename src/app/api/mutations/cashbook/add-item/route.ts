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

    const item = body?.item
    if (!item || typeof item !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing item payload' }, { status: 400 })
    }

    const cashbookId = String((item as any).cashbookId || '').trim()
    const customerId = (item as any).customerId ? String((item as any).customerId).trim() : undefined
    const productId = (item as any).productId ? String((item as any).productId).trim() : undefined
    const itemName = String((item as any).itemName || '').trim()

    const quantity = Number((item as any).quantity || 0)
    const unitPrice = Number((item as any).unitPrice || 0)

    if (!cashbookId || !itemName || !(quantity > 0)) {
      return NextResponse.json({ success: false, error: 'Missing cashbookId/itemName/quantity' }, { status: 400 })
    }

    const totalPrice = Math.max(0, quantity * unitPrice)
    const doc: any = {
      _type: 'cashbookItem',
      cashbook: { _type: 'reference', _ref: cashbookId },
      ...(customerId ? { customer: { _type: 'reference', _ref: customerId } } : {}),
      ...(productId ? { product: { _type: 'reference', _ref: productId } } : {}),
      itemName,
      specifications: String((item as any).specifications || ''),
      category: String((item as any).category || ''),
      brand: String((item as any).brand || ''),
      unit: String((item as any).unit || ''),
      quantity,
      unitPrice,
      totalPrice,
      notes: String((item as any).notes || ''),
      createdAt: (item as any).createdAt ? String((item as any).createdAt) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      locked: false,
    }

    const created = await sanityClient.create(doc)
    try {
      await sanityClient.patch(cashbookId).set({ updatedAt: new Date().toISOString() }).commit()
    } catch {}

    try {
      await notificationService.emit({
        type: 'cashbook_entry',
        actorUserId,
        data: {
          ...(customerId ? { customerId } : {}),
          route: '/admin/cash-book/history',
          extra: {
            title: 'Cashbook entry',
            body: `${itemName} • ₹${totalPrice}`,
          },
        },
      })
    } catch (e) {
      console.error('[Notify] cashbook_entry emit failed', e)
    }

    return NextResponse.json({ success: true, data: created }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
