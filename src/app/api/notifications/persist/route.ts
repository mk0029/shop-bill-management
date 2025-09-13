import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/notifications/persist
 * Forwards a notification to the Sanity backend notifications API AFTER a successful push.
 * Body: { audience: 'admins'|'all'|'users', title: string, body: string, link?: string, userIds?: string[] }
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: 'Notifications persistence is disabled' }, { status: 410 })
}
