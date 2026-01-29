import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notification-service'

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id, x-notify-secret, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) })
}

function getActorUserIdFromAuthCookie(req: NextRequest): string {
  try {
    const raw = req.cookies.get('auth-storage')?.value
    if (!raw) return ''

    // Stored cookie is typically URI-encoded JSON
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
    const body = await req.json().catch(() => null)
    if (!body?.title || !body?.body) {
      return NextResponse.json({ success: false, error: 'Missing title/body' }, { status: 400, headers: corsHeaders(req) })
    }

    const actorUserId = (
      String(body?.actorUserId || req.headers.get('x-user-id') || getActorUserIdFromAuthCookie(req) || '')
    ).trim()
    if (!actorUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing actorUserId (x-user-id header)' },
        { status: 400, headers: corsHeaders(req) }
      )
    }


    const dataObj = (body?.data && typeof body.data === 'object') ? body.data : undefined
    const route = (dataObj?.route || dataObj?.link || undefined) as string | undefined

    // Admin broadcast / direct user(s)
    if (body.audience === 'admins' || body.audience === 'all') {
      const target = body.audience === 'admins' ? 'all_admins' : 'all_users'
      const result = await notificationService.emit({
        type: 'admin_broadcast',
        actorUserId,
        data: {
          route,
          message: String(body.body),
          extra: {
            target,
            title: String(body.title),
            body: String(body.body),
            ...(dataObj?.expiresAt ? { expiresAt: String(dataObj.expiresAt) } : {}),
          },
        },
      })
      return NextResponse.json({ success: result.ok, ...result }, { status: 200, headers: corsHeaders(req) })
    }

    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds.map(String).filter(Boolean) : []
    if (!userIds.length) {
      return NextResponse.json(
        { success: false, error: 'Provide userIds for direct notifications' },
        { status: 400, headers: corsHeaders(req) }
      )
    }

    const baseEventId = body?.eventId && typeof body.eventId === 'string' ? body.eventId : undefined
    const results = await Promise.all(
      userIds.map((uid) =>
        notificationService.emit({
          eventId: baseEventId ? `${baseEventId}.${uid}` : undefined,
          type: 'user_direct',
          actorUserId,
          data: {
            route,
            customerId: uid,
            message: String(body.body),
            extra: {
              targetUserId: uid,
              title: String(body.title),
              body: String(body.body),
              ...(dataObj?.expiresAt ? { expiresAt: String(dataObj.expiresAt) } : {}),
            },
          },
        })
      )
    )

    const ok = results.every(r => r.ok)
    return NextResponse.json({ success: ok, results }, { status: 200, headers: corsHeaders(req) })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: corsHeaders(req) })
  }
}
