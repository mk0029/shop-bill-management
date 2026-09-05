import { NextRequest, NextResponse } from 'next/server'
import { createDocument, updateDocument, deleteDocument } from '@/lib/sanity/write-router'
import { getServerAuth } from '@/lib/server-auth'
import { isAdminLike } from '@/lib/rbac'

const STOCK_TX_PURPOSE = 'stock'

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

    const transaction = body?.transaction
    if (!transaction || typeof transaction !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing transaction payload' }, { status: 400 })
    }

    const txDoc = { ...(transaction as Record<string, unknown>), _type: 'stockTransaction' }
    const result = await createDocument(txDoc, STOCK_TX_PURPOSE)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to create stock transaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { _id: result.documentId, ...txDoc } }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
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

    const id = String(body?.id || '').trim()
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const patch = body?.patch
    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing patch payload' }, { status: 400 })
    }

    const result = await updateDocument(id, patch as Record<string, unknown>, STOCK_TX_PURPOSE)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to update stock transaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { _id: id, ...(patch as Record<string, unknown>) } }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
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

    const id = String(body?.id || '').trim()
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const result = await deleteDocument(id, STOCK_TX_PURPOSE)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to delete stock transaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}