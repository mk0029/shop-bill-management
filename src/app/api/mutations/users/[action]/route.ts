import { NextRequest, NextResponse } from 'next/server'
import { createDocument, updateDocument, deleteDocument } from '@/lib/sanity/write-router'
import { getServerAuth } from '@/lib/server-auth'
import { isAdminLike } from '@/lib/rbac'

export async function POST(
  req: NextRequest,
  ctx: { params: { action: string } }
) {
  try {
    const action = ctx.params.action
    const body = await req.json().catch(() => ({}))

    // Self-registration (customer account creation) is public.
    // All other user mutations require an admin.
    const isSelfRegister = action === 'create' && body?.register === true
    if (!isSelfRegister) {
      const auth = await getServerAuth()
      if (!auth.isAuthenticated || !isAdminLike(auth.role)) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    if (action === 'create') {
      const userData = body?.user || body
      if (!userData || typeof userData !== 'object' || !userData.name) {
        return NextResponse.json({ success: false, error: 'Missing name' }, { status: 400 })
      }

      const doc = {
        _type: 'user',
        ...userData,
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: userData.updatedAt || new Date().toISOString(),
      }

      const result = await createDocument(doc, 'users')
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || 'Failed to create user' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: { ...doc, _id: result.documentId },
        databaseKey: result.databaseKey,
      })
    }

    if (action === 'update') {
      const userId = String(body?.userId || body?.id || '')
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
      }
      const updates = { ...(body?.updates || body?.patch || {}) }
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ success: false, error: 'Missing updates' }, { status: 400 })
      }
      updates.updatedAt = updates.updatedAt || new Date().toISOString()

      const result = await updateDocument(userId, updates, 'users')
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || 'Failed to update user' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: { _id: userId, ...updates },
        databaseKey: result.databaseKey,
      })
    }

    if (action === 'delete') {
      const userId = String(body?.userId || body?.id || '')
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
      }
      const result = await deleteDocument(userId, 'users')
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || 'Failed to delete user' }, { status: 500 })
      }
      return NextResponse.json({ success: true, databaseKey: result.databaseKey })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error in user mutation:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process user mutation' },
      { status: 500 }
    )
  }
}
