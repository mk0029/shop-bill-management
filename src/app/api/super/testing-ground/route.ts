import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/server-auth'
import { sanityClient } from '@/lib/sanity'
import { sendFcmToTokens } from '@/services/notifications/fcm-sender.server'

const FCM_EVENTS = [
  { key: 'custom', label: 'Custom Message' },
  { key: 'billing.created', label: 'Bill Created' },
  { key: 'billing.updated', label: 'Bill Updated' },
  { key: 'billing.payment.paid', label: 'Payment Received' },
  { key: 'billing.payment.partial', label: 'Partial Payment' },
  { key: 'toolRent.created', label: 'Tool Rental Created' },
  { key: 'toolRent.overdue', label: 'Tool Rental Overdue' },
  { key: 'workTask.created', label: 'Work Task Created' },
  { key: 'workTask.completed', label: 'Work Task Completed' },
  { key: 'scheduled.goodMorning', label: 'Good Morning' },
  { key: 'scheduled.festivalGreeting', label: 'Festival Greeting' },
  { key: 'system.general', label: 'System General' },
]

async function handleFCMEvent(eventType: string, payload: Record<string, any>) {
  const trace: any[] = []
  const t = (step: string, data: any) => trace.push({ step, ...data, ts: new Date().toISOString() })

  const title = payload.title || 'Test Notification'
  const body = payload.body || 'This is a test notification'
  const targetToken = payload.targetToken || null
  const targetUserId = payload.targetUserId || null

  t('params', { title, body, hasTargetToken: !!targetToken, targetUserId })

  let tokens: string[] = []
  if (targetToken) {
    tokens = [targetToken]
  } else if (targetUserId) {
    const found = await sanityClient.fetch<any[]>(
      `*[_type == "userFcmToken" && isActive == true && defined(token) && token != "" && (userId == $id || user._ref == $id)]{ token }`,
      { id: targetUserId }
    )
    tokens = (found || []).map((t: any) => t.token).filter(Boolean)
  }

  t('tokens', { count: tokens.length })
  if (!tokens.length) {
    t('abort', { reason: 'No FCM tokens found for target' })
    return { ok: false, error: 'No FCM tokens found for target user', trace }
  }

  const data: Record<string, string> = { test: 'true', timestamp: new Date().toISOString() }
  if (payload.data && typeof payload.data === 'object') {
    for (const [k, v] of Object.entries(payload.data)) {
      data[k] = typeof v === 'string' ? v : JSON.stringify(v)
    }
  }

  try {
    const result = await sendFcmToTokens({ tokens, title, body, data })
    t('result', result)
    return { ok: result.success, response: result, trace }
  } catch (err: any) {
    t('error', { message: err.message })
    return { ok: false, error: err.message, trace }
  }
}

async function handleHealthCheck(service: string) {
  const trace: any[] = []
  const t = (step: string, data: any) => trace.push({ step, ...data, ts: new Date().toISOString() })

  if (service === 'fcm') {
    const hasFirebase = !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.PROJECT_ID || process.env.FIREBASE_PROJECT_ID)
    const projectId = process.env.PROJECT_ID || process.env.FIREBASE_PROJECT_ID || null
    const hasChatBackend = !!(process.env.SHOP_CHAT_URL || process.env.NEXT_PUBLIC_SHOP_CHAT_URL)
    t('config', { hasFirebase, projectId: projectId || 'MISSING', hasChatBackend })

    if (!hasFirebase) return { ok: false, error: 'Firebase not configured', trace }

    try {
      const { GoogleAuth } = await import('google-auth-library')
      const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      const auth = new GoogleAuth({ ...(json ? { credentials: JSON.parse(json) } : {}), scopes: ['https://www.googleapis.com/auth/firebase.messaging'] })
      const client = await auth.getClient()
      const token = await client.getAccessToken()
      const accessToken = typeof token === 'string' ? token : (token as any)?.token
      t('auth', { ok: !!accessToken, tokenLength: accessToken?.length || 0 })
      return { ok: !!accessToken, projectId, trace }
    } catch (err: any) {
      t('error', { message: err.message })
      return { ok: false, error: err.message, trace }
    }
  }

  return { ok: false, error: `Unknown service: ${service}`, trace }
}

export async function GET(req: NextRequest) {
  const auth = await getServerAuth()
  if (!auth.isAuthenticated || auth.role !== 'super_admin') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
  }

  const service = req.nextUrl.searchParams.get('service')
  if (service) {
    const result = await handleHealthCheck(service)
    return NextResponse.json(result)
  }

  const listUsers = req.nextUrl.searchParams.get('users')
  if (listUsers === 'true') {
    const role = req.nextUrl.searchParams.get('role') || 'all'
    const roleFilter = role === 'all'
      ? 'role in ["customer","admin","super_admin","technician"]'
      : `role == "${role}"`
    const q = `*[_type == "user" && isActive != false && ${roleFilter}] | order(name asc) [0...100]{
      _id, name, email, phone, role, customerId
    }`
    const users = await sanityClient.fetch<any[]>(q)
    return NextResponse.json({
      ok: true,
      users: (users || []).map(u => ({
        id: u._id,
        name: u.name || u.email || u.customerId || 'Unnamed',
        email: u.email || null,
        phone: u.phone || null,
        role: u.role || 'customer',
      })),
    })
  }

  const fetchTokens = req.nextUrl.searchParams.get('tokens')
  if (fetchTokens === 'true') {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 })

    const tokens = await sanityClient.fetch<any[]>(
      `*[_type == "userFcmToken" && isActive == true && defined(token) && token != "" && (userId == $id || user._ref == $id)] | order(updatedAt desc){
        _id, token, deviceName, deviceId, updatedAt
      }`,
      { id: userId }
    )

    return NextResponse.json({
      ok: true,
      tokens: (tokens || []).map(t => ({
        id: t._id,
        token: t.token,
        device: t.deviceName || t.deviceId || 'Unknown',
        lastActive: t.updatedAt || null,
      })),
    })
  }

  const fcmEvents = FCM_EVENTS

  return NextResponse.json({
    ok: true,
    fcm: {
      hasFirebase: !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.PROJECT_ID || process.env.FIREBASE_PROJECT_ID),
      projectId: process.env.PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'NOT SET',
      hasChatBackend: !!(process.env.SHOP_CHAT_URL || process.env.NEXT_PUBLIC_SHOP_CHAT_URL),
    },
    fcmEvents,
  })
}

export async function POST(req: NextRequest) {
  const auth = await getServerAuth()
  if (!auth.isAuthenticated || auth.role !== 'super_admin') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { channel, eventType, payload } = body

  if (!channel || !eventType) {
    return NextResponse.json({ ok: false, error: 'channel (fcm) and eventType required' }, { status: 400 })
  }

  if (channel === 'fcm') {
    const result = await handleFCMEvent(eventType, payload || {})
    return NextResponse.json(result)
  }

  return NextResponse.json({ ok: false, error: `Unknown channel: ${channel}` }, { status: 400 })
}
