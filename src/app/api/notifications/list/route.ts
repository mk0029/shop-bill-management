import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

/**
 * GET /api/notifications/list?userId=...&role=...&phone=...&limit=...
 * Returns notifications visible to the given user (or phone) that are not cleared by that user.
 * Audience rules:
 * - all: visible to everyone
 * - admins: visible only when role=admin
 * - user/custom: visible if userId/phone matches any target id/phone
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = (url.searchParams.get('userId') || '').trim()
    const clerkId = (url.searchParams.get('clerkId') || '').trim()
    const customerId = (url.searchParams.get('customerId') || '').trim()
    const phone = (url.searchParams.get('phone') || '').trim()
    const role = (url.searchParams.get('role') || '').trim()
    const limitRaw = url.searchParams.get('limit')
    const limit = Math.max(1, Math.min(200, Number(limitRaw || 50) || 50))

    const ids = [userId, clerkId, customerId].filter(Boolean)
    const phones = phone ? [phone] : []
    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'technician'

    const query = `*[_type=="notification" && (
      audience == "all" ||
      (audience == "admins" && $isAdmin) ||
      (audience in ["users", "custom"] && (
        (defined(targetUserIds) && count(targetUserIds[@ in $ids]) > 0) ||
        (defined(targetPhones) && count(targetPhones[@ in $phones]) > 0)
      ))
    ) &&
    !($includeCleared != true && (
      (defined(clearedByUserIds) && count(clearedByUserIds[@ in $ids]) > 0) ||
      (defined(clearedByPhones) && count(clearedByPhones[@ in $phones]) > 0)
    ))
    ] | order(coalesce(createdAt, _createdAt) desc)[0...$limit]{
      _id,
      title,
      body,
      type,
      audience,
      createdAt,
      _createdAt,
      data,
      billId,
      billNumber,
      event,
      customerId
    }`

    const includeCleared = url.searchParams.get('includeCleared') === 'true'
    const items = await sanityClient.fetch<any[]>(query, { ids, phones, isAdmin, limit, includeCleared })
    return NextResponse.json({ items: items || [] }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
