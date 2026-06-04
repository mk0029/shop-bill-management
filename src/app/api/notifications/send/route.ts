import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notification-service'
import { sendNotificationEvent, getActiveAdminUserIds } from '@/services/notifications/notification-events.server'
import type { NotificationEventType } from '@/types/notifications'

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
    const resolvedActorUserId = actorUserId || 'system'


    const dataObj = (body?.data && typeof body.data === 'object') ? body.data : undefined
    const route = (dataObj?.route || dataObj?.link || undefined) as string | undefined
    const eventType = String(body.eventType || '') as NotificationEventType
    const eventId =
      body?.eventId && typeof body.eventId === 'string'
        ? body.eventId
        : undefined
    const directUserIds: string[] = Array.isArray(body.userIds) ? body.userIds.map(String).filter(Boolean) : []

    if (eventType.includes('.') && directUserIds.length) {
      const result = await sendNotificationEvent({
        eventId,
        type: eventType,
        actorUserId: resolvedActorUserId,
        userIds: directUserIds,
        title: String(body.title),
        body: String(body.body),
        data: dataObj,
        skipActor: true,
      })
      return NextResponse.json({ success: result.ok, ...result }, { status: 200, headers: corsHeaders(req) })
    }

    // Admin broadcast / direct user(s)
    if (body.audience === 'admins' || body.audience === 'all') {
      if (eventType.includes('.')) {
        const userIds = body.audience === 'admins'
          ? await getActiveAdminUserIds()
          : []
        const result = await sendNotificationEvent({
          eventId,
          type: eventType,
          actorUserId: resolvedActorUserId,
          userIds,
          title: String(body.title),
          body: String(body.body),
          data: dataObj,
          skipActor: true,
        })
        return NextResponse.json({ success: result.ok, ...result }, { status: 200, headers: corsHeaders(req) })
      }
      const target = body.audience === 'admins' ? 'all_admins' : 'all_users'
      const result = await notificationService.emit({
        type: 'admin_broadcast',
        actorUserId: resolvedActorUserId,
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

    const userIds: string[] = directUserIds
    if (!userIds.length) {
      return NextResponse.json(
        { success: false, error: 'Provide userIds for direct notifications' },
        { status: 400, headers: corsHeaders(req) }
      )
    }

    const baseEventId =
      body?.eventId && typeof body.eventId === 'string'
        ? body.eventId
        : `manual.${Date.now()}`
    const results = await Promise.all(
      userIds.map((uid) =>
        notificationService.emit({
          eventId: baseEventId ? `${baseEventId}.${uid}` : undefined,
          type: 'user_direct',
          actorUserId: resolvedActorUserId,
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
