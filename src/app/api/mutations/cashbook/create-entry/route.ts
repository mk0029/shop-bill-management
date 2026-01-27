import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { notificationService } from '@/lib/notification-service'

function getActorUserIdFromAuthCookie(req: NextRequest): string {
  try {
    const raw = req.cookies.get('auth-storage')?.value
    if (!raw) return ''

    let decoded = raw
    try {
      decoded = decodeURIComponent(raw)
    } catch {
      decoded = raw
    }

    const parsedUnknown: unknown = (() => {
      try {
        return JSON.parse(decoded)
      } catch {
        return null
      }
    })()

    const parsed =
      typeof parsedUnknown === 'object' && parsedUnknown !== null
        ? (parsedUnknown as { state?: { user?: any } })
        : undefined

    const user = parsed?.state?.user as any
    return String((user?.id as string) || (user?._id as string) || '').trim()
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const actorUserId = (
      String(body?.actorUserId || req.headers.get('x-user-id') || getActorUserIdFromAuthCookie(req) || '')
    ).trim()
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Missing actorUserId (x-user-id header)' }, { status: 400 })
    }

    const entryData = body?.entry
    if (!entryData || typeof entryData !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing entry payload' }, { status: 400 })
    }

    const amount = Number((entryData as any).amount || 0)
    const type = String((entryData as any).type || '').trim()
    const source = String((entryData as any).source || '').trim()

    if (!(amount > 0) || (type !== 'credit' && type !== 'debit') || !source) {
      return NextResponse.json({ success: false, error: 'Invalid amount/type/source' }, { status: 400 })
    }

    const createdAt = (entryData as any).createdAt ? String((entryData as any).createdAt) : new Date().toISOString()

    const newEntry: any = {
      _type: 'cashBookEntry',
      ...(entryData as any),
      createdAt,
      updatedAt: new Date().toISOString(),
    }

    const created = await sanityClient.create(newEntry)

    let notifyResult: any = null
    try {
      const userRef = (created as any)?.user
      const customerId = userRef && typeof userRef === 'object' && typeof userRef._ref === 'string' ? String(userRef._ref) : undefined
      const userName = String((created as any)?.userName || '').trim()
      const notes = String((created as any)?.notes || '').trim()
      const createdType = String((created as any)?.type || type).trim()
      const createdSource = String((created as any)?.source || source).trim()
      const createdCategory = String((created as any)?.category || '').trim()
      const createdId = String((created as any)?._id || '').trim()

      const title = createdType === 'debit' ? 'Debit recorded' : 'Credit recorded'
      const parts: string[] = []
      parts.push(createdType === 'debit' ? 'Debit' : 'Credit')
      parts.push(`₹${amount}`)
      if (userName) parts.push(userName)
      if (createdSource) parts.push(createdSource)
      if (createdCategory) parts.push(createdCategory)
      if (notes) parts.push(notes)
      const bodyText = parts.join(' • ')

      notifyResult = await notificationService.emit({
        eventId: createdId ? `cashbook_entry.${createdId}` : undefined,
        type: 'cashbook_entry',
        actorUserId,
        data: {
          ...(customerId ? { customerId } : {}),
          route: '/admin/cash-book/history',
          extra: {
            title,
            body: bodyText,
          },
        },
      })
    } catch (e) {
      console.error('[Notify] cashbook_entry emit failed (create-entry)', e)
    }

    return NextResponse.json({ success: true, data: created, notify: notifyResult }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
