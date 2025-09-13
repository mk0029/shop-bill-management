import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/notifications/list?userId=...&role=...&phone=...&limit=...
 * Returns notifications visible to the given user (or phone) that are not cleared by that user.
 * Audience rules:
 * - all: visible to everyone
 * - admins: visible only when role=admin
 * - user/custom: visible if userId/phone matches any target id/phone
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ error: 'Notifications listing is disabled' }, { status: 410 })
}
