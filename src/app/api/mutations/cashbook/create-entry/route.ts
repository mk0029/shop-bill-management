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

    const entryData = body?.entry
    if (!entryData || typeof entryData !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing entry payload' }, { status: 400 })
    }

    const type = String((entryData as any).type || '').trim()
    const source = String((entryData as any).source || '').trim()
    const purpose = String((entryData as any).notes || '').trim()
    const customerName = String((entryData as any).customerName || '').trim()

    if (type !== 'credit' && type !== 'debit') {
      return NextResponse.json({ success: false, error: 'Invalid type: must be credit or debit' }, { status: 400 })
    }
    if (!source) {
      return NextResponse.json({ success: false, error: 'Missing source' }, { status: 400 })
    }
    if (!customerName) {
      return NextResponse.json({ success: false, error: 'Customer name is required' }, { status: 400 })
    }
    if (!purpose) {
      return NextResponse.json({ success: false, error: 'Purpose is required' }, { status: 400 })
    }

    const rawTotal = Number((entryData as any).totalAmount || 0)
    const rawPending = Number((entryData as any).pendingAmount || 0)

    if (!Number.isFinite(rawTotal) || rawTotal < 0) {
      return NextResponse.json({ success: false, error: 'Invalid total amount' }, { status: 400 })
    }
    if (rawTotal === 0) {
      return NextResponse.json({ success: false, error: 'Total amount cannot be zero' }, { status: 400 })
    }

    const totalAmount = roundCurrency(rawTotal)
    let pendingAmount = 0
    let receivedAmount = totalAmount

    if (type === 'credit') {
      if (!Number.isFinite(rawPending) || rawPending < 0) {
        return NextResponse.json({ success: false, error: 'Invalid pending amount' }, { status: 400 })
      }
      pendingAmount = roundCurrency(rawPending)
      if (pendingAmount > totalAmount) {
        return NextResponse.json({ success: false, error: 'Pending amount cannot be greater than total amount' }, { status: 400 })
      }
      receivedAmount = roundCurrency(totalAmount - pendingAmount)
    }

    const status = pendingAmount > 0 ? 'partial' : 'completed'
    const amount = receivedAmount

    const createdAtRaw = (entryData as any).createdAt ? String((entryData as any).createdAt) : new Date().toISOString()
    const createdAt = ensureUTC(createdAtRaw)

    const isCustomName = !!(entryData as any).isCustomName
    let customerId = String((entryData as any).customerId || '').trim()

    if (isCustomName && customerName) {
      try {
        const normalizedName = customerName.trim().replace(/\s+/g, ' ').toLowerCase()
        const existingName = await sanityClient.fetch(
          `*[_type == "manualCashbookName" && normalizedName == $nn][0]`,
          { nn: normalizedName }
        )
        if (existingName) {
          await sanityClient.patch(existingName._id).set({
            usageCount: (existingName.usageCount || 0) + 1,
            lastUsedAt: new Date().toISOString(),
          }).commit()
          customerId = existingName._id
        } else {
          const created = await sanityClient.create({
            _type: 'manualCashbookName',
            name: customerName.trim(),
            normalizedName,
            usageCount: 1,
            lastUsedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          })
          customerId = created._id
        }
      } catch (e) {
        console.error('[CreateEntry] Failed to upsert manual name:', e)
      }
    } else if ((entryData as any).user && typeof (entryData as any).user === 'object') {
      const ref = (entryData as any).user
      if (ref._ref) customerId = String(ref._ref)
    }

    if ((entryData as any).bill && typeof (entryData as any).bill === 'object' && (entryData as any).bill._ref) {
      const billRef = String((entryData as any).bill._ref)
      const existingBillEntry = await sanityClient.fetch(
        `*[_type == "cashBookEntry" && bill._ref == $billRef][0]._id`,
        { billRef }
      )
      if (existingBillEntry) {
        return NextResponse.json({ success: true, data: { _id: existingBillEntry }, message: 'Duplicate: entry already exists for this bill' }, { status: 200 })
      }
    }

    const newEntry: any = {
      _type: 'cashBookEntry',
      userName: customerName,
      amount,
      totalAmount,
      pendingAmount,
      receivedAmount,
      type,
      source,
      notes: purpose,
      customerName,
      customerId: customerId || undefined,
      isCustomName,
      status,
      createdBy: actorUserId,
      createdAt,
      updatedAt: new Date().toISOString(),
    }

    if ((entryData as any).user && typeof (entryData as any).user === 'object') {
      newEntry.user = (entryData as any).user
    }
    if ((entryData as any).category) {
      newEntry.category = (entryData as any).category
    }
    if ((entryData as any).bill) {
      newEntry.bill = (entryData as any).bill
    }

    const created = await sanityClient.create(newEntry)

    try {
      const userRef = (created as any)?.user
      const notifCustomerId = userRef && typeof userRef === 'object' && typeof userRef._ref === 'string' ? String(userRef._ref) : undefined
      const createdType = String((created as any)?.type || type).trim()
      const createdSource = String((created as any)?.source || source).trim()
      const createdCategory = String((created as any)?.category || '').trim()
      const createdId = String((created as any)?._id || '').trim()

      const title = createdType === 'debit' ? 'Debit recorded' : 'Credit recorded'
      const parts: string[] = []
      parts.push(createdType === 'debit' ? 'Debit' : 'Credit')
      parts.push(`₹${amount}`)
      if (customerName) parts.push(customerName)
      if (createdSource) parts.push(createdSource)
      if (createdCategory) parts.push(createdCategory)
      if (purpose) parts.push(purpose)
      const bodyText = parts.join(' • ')

      notificationService.emit({
        eventId: createdId ? `cashbook_entry.${createdId}` : undefined,
        type: 'cashbook_entry',
        actorUserId,
        data: {
          ...(notifCustomerId ? { customerId: notifCustomerId } : {}),
          route: '/admin/cash-book/history',
          extra: { title, body: bodyText },
        },
      }).catch(() => {})
    } catch {}

    return NextResponse.json({ success: true, data: created }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
