import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/notifications/clear
 * Disabled: notifications storage removed.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: 'Notifications clear is disabled' }, { status: 410 })
}
