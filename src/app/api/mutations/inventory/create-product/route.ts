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

    const productData = body?.product
    if (!productData || typeof productData !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing product payload' }, { status: 400 })
    }

    const name = String((productData as any).name || '').trim()
    const brandId = String((productData as any).brandId || '').trim()
    const brandName = String((productData as any).brandName || '').trim()
    const categoryId = String((productData as any).categoryId || '').trim()

    if (!name || !brandId || !categoryId) {
      return NextResponse.json({ success: false, error: 'Missing name/brandId/categoryId' }, { status: 400 })
    }

    const productId = Buffer.from(Date.now().toString() + Math.random().toString())
      .toString('base64')
      .substring(0, 12)

    const newProduct = {
      _type: 'product',
      productId,
      name: brandName ? `${name} - ${brandName}` : name,
      slug: {
        _type: 'slug',
        current: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      },
      description: (productData as any).description,
      brand: { _type: 'reference', _ref: brandId },
      category: { _type: 'reference', _ref: categoryId },
      specifications: (productData as any).specifications,
      pricing: { ...(productData as any).pricing },
      inventory: (productData as any).inventory,
      images: (productData as any).images || [],
      isActive: true,
      isFeatured: false,
      tags: Array.isArray((productData as any).tags) ? (productData as any).tags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const created = await sanityClient.create(newProduct as any)

    const initial = (productData as any).initialStockTransaction
    if (initial && typeof initial === 'object') {
      const stockTransactionId = Buffer.from(Date.now().toString() + Math.random().toString())
        .toString('base64')
        .substring(0, 12)

      const qty = Number(initial.quantity || 0)
      const unitPrice = Number(initial.unitPrice || 0)

      const stockTransaction = {
        _type: 'stockTransaction',
        transactionId: stockTransactionId,
        type: String(initial.type || 'purchase'),
        product: { _type: 'reference', _ref: (created as any)._id },
        quantity: qty,
        unitPrice,
        totalAmount: qty * unitPrice,
        notes: String(initial.notes || `New item created: ${name} - initial stock added`),
        status: 'completed',
        transactionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdById: actorUserId,
      }
      try {
        await sanityClient.create(stockTransaction as any)
      } catch (e) {
        // best-effort
      }
    }

    try {
      await notificationService.emit({
        type: 'inventory_added',
        actorUserId,
        data: {
          inventoryId: String((created as any)?._id || ''),
          route: '/admin/inventory',
          extra: {
            title: 'Inventory updated',
            body: `New item added: ${(created as any)?.name || name}`,
          },
        },
      })
    } catch (e) {
      console.error('[Notify] inventory_added emit failed', e)
    }

    return NextResponse.json({ success: true, data: created }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
