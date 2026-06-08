import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/server-auth'
import { sanityClient } from '@/lib/sanity'

export const runtime = 'nodejs'

const defaultPreferences = {
  enabled: true,
  types: [] as string[],
  dailyGreetingEnabled: true,
  festivalGreetingEnabled: true,
  adminGreetingsEnabled: true,
  customerGreetingsEnabled: true,
  pushEnabled: true,
  paused: false,
  notificationLanguage: 'en',
  notificationTimezone: 'Asia/Kolkata',
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
}

function cleanBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function cleanTime(value: unknown, fallback: string) {
  const text = String(value || '').trim()
  return /^\d{1,2}:\d{2}$/.test(text) ? text : fallback
}

function cleanPrefs(body: any) {
  return {
    dailyGreetingEnabled: cleanBoolean(body?.dailyGreetingEnabled, defaultPreferences.dailyGreetingEnabled),
    festivalGreetingEnabled: cleanBoolean(body?.festivalGreetingEnabled, defaultPreferences.festivalGreetingEnabled),
    adminGreetingsEnabled: cleanBoolean(body?.adminGreetingsEnabled, defaultPreferences.adminGreetingsEnabled),
    customerGreetingsEnabled: cleanBoolean(body?.customerGreetingsEnabled, defaultPreferences.customerGreetingsEnabled),
    pushEnabled: cleanBoolean(body?.pushEnabled, defaultPreferences.pushEnabled),
    paused: cleanBoolean(body?.paused, defaultPreferences.paused),
    quietHours: {
      enabled: cleanBoolean(body?.quietHours?.enabled, defaultPreferences.quietHours.enabled),
      start: cleanTime(body?.quietHours?.start, defaultPreferences.quietHours.start),
      end: cleanTime(body?.quietHours?.end, defaultPreferences.quietHours.end),
    },
  }
}

export async function GET(_req: NextRequest) {
  try {
    const auth = await getServerAuth().catch(() => null)
    if (!auth?.isAuthenticated || !auth.userId) {
      return NextResponse.json(defaultPreferences, { status: 200 })
    }
    const user = await sanityClient.fetch<{
      notificationPreferences?: Record<string, any>
      notificationLanguage?: string
      notificationTimezone?: string
    } | null>(
      `*[_type=="user" && _id==$userId][0]{
        notificationPreferences,
        notificationLanguage,
        notificationTimezone
      }`,
      { userId: auth.userId },
    )
    const prefs = {
      ...defaultPreferences,
      ...(user?.notificationPreferences || {}),
      notificationLanguage: user?.notificationLanguage || defaultPreferences.notificationLanguage,
      notificationTimezone: user?.notificationTimezone || defaultPreferences.notificationTimezone,
      enabled: user?.notificationPreferences?.pushEnabled !== false && user?.notificationPreferences?.paused !== true,
      types: [] as string[],
    }
    return NextResponse.json(prefs, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err?.message || 'Unexpected error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const notificationPreferences = cleanPrefs(body)
    const notificationLanguage = String(body?.notificationLanguage || defaultPreferences.notificationLanguage).trim().slice(0, 8)
    const notificationTimezone = String(body?.notificationTimezone || defaultPreferences.notificationTimezone).trim().slice(0, 80)

    await sanityClient
      .patch(auth.userId)
      .set({
        notificationPreferences,
        notificationLanguage,
        notificationTimezone,
        updatedAt: new Date().toISOString(),
      })
      .commit()

    return NextResponse.json({
      success: true,
      ...defaultPreferences,
      ...notificationPreferences,
      notificationLanguage,
      notificationTimezone,
      enabled: notificationPreferences.pushEnabled !== false && notificationPreferences.paused !== true,
      types: [] as string[],
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
