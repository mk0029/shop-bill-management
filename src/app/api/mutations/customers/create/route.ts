import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { notificationService } from '@/lib/notification-service'
import { sanitizeUserText } from '@/constants/defaults'
import { sendAppEmail } from '@/lib/email/server'
import { getServerAuth } from '@/lib/server-auth'
import { isAdminLike } from '@/lib/rbac'
import { normalizeAndValidate } from '@/lib/phone-utils'
import { validateIdentity } from '@/lib/identity-validator'
import { buildWelcomeText, buildWelcomeEmailHtml } from '@/lib/welcome-templates'

export const runtime = 'nodejs'

function siteUrl() {
  return 'https://jambh-ell.vercel.app'
}

function supportInfo() {
  return {
    phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || process.env.SUPPORT_PHONE || undefined,
    email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.SUPPORT_EMAIL || undefined,
  }
}

async function claimDelivery(key: string, channel: 'email' | 'whatsapp') {
  try { await sanityClient.delete(key) } catch { /* ignore */ }
  try {
    await sanityClient.create({
      _id: key,
      _type: 'deliveryLog',
      channel,
      status: 'sending',
      idempotencyKey: key,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })
  } catch {
    return false
  }
  return true
}

async function finishDelivery(key: string, status: 'sent' | 'failed', detail?: string) {
  await sanityClient
    .patch(key)
    .set({
      status,
      updatedAt: new Date().toISOString(),
      ...(detail ? { detail: detail.slice(0, 1000) } : {}),
    })
    .commit()
    .catch((error) => {
      console.error('[WelcomeDelivery] failed to update delivery log', key, error)
    })
}

async function sendWelcomeEmail(input: {
  userId: string
  email?: string
  customerName: string
  displayName?: string
  loginUrl: string
}) {
  const email = String(input.email || '').trim()
  if (!email) return
  const key = `welcome.email.user.${input.userId}`
  if (!(await claimDelivery(key, 'email'))) return
  const support = supportInfo()
  const templateData = {
    customerName: input.customerName,
    displayName: input.displayName,
    loginUrl: input.loginUrl,
    supportEmail: support.email,
    supportPhone: support.phone,
  }
  const result = await sendAppEmail({
    to: email,
    subject: `Welcome to Jambh Electricals`,
    text: buildWelcomeText(templateData),
    html: buildWelcomeEmailHtml(templateData),
  })
  if (result.sent) {
    await finishDelivery(key, 'sent')
    return
  }
  const reason = result.reason || 'Email send failed'
  console.error('[WelcomeDelivery] email failed', { userId: input.userId, reason })
  await finishDelivery(key, 'failed', reason)
}

async function runPostCreateDelivery(input: {
  actorUserId: string
  created: any
  name: string
  nickname?: string
  phone: string
  email?: string
  customerId: string
  secretKey: string
}) {
  const userId = String(input.created?._id || '').trim()
  const safeName = sanitizeUserText(input.nickname || input.name || 'Customer') || 'Customer'
  const loginUrl = `${siteUrl()}/login?phone=${encodeURIComponent(input.phone)}&passKey=${encodeURIComponent(input.secretKey)}`

  await Promise.allSettled([
    notificationService.emit({
      eventId: `customer.created.${userId}.admins`,
      type: 'customer_created',
      actorUserId: input.actorUserId,
      data: {
        customerId: userId,
        route: '/admin/customers',
        extra: {
          title: 'New customer created',
          body: `${safeName} has joined/created an account.`,
        },
      },
    }),
    sendWelcomeEmail({
      userId,
      email: input.email,
      customerName: input.name,
      displayName: safeName,
      loginUrl,
    }),
  ]).then((results) => {
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error('[WelcomeDelivery] post-create task failed', { index, reason: result.reason })
      }
    })
  })
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated || !isAdminLike(auth.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const actorUserId = (String(body?.actorUserId || auth.userId || '')).trim()
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Missing actorUserId' }, { status: 400 })
    }

    const name = String(body?.name || '').trim()
    const phone = String(body?.phone || '').trim()
    const location = String(body?.location || '').trim()
    const nickname = String(body?.nickname || '').trim()
    const email = body?.email ? String(body.email) : undefined

    if (!name || !phone || !location) {
      return NextResponse.json({ success: false, error: 'Missing name/phone/location' }, { status: 400 })
    }

    const canonicalPhone = normalizeAndValidate(phone)
    if (!canonicalPhone) {
      return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 })
    }

    const identityResult = await validateIdentity(
      { email, phone: canonicalPhone },
      { checkRequests: false },
    )
    if (!identityResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'A customer with these identity details already exists.', code: 'DUPLICATE_IDENTITY', conflict: identityResult.conflict },
        { status: 409 },
      )
    }

    const docId = `user_c_${canonicalPhone}`

    const customerId = Buffer.from(Date.now().toString() + Math.random().toString())
      .toString('base64')
      .substring(0, 12)
    const secretKey = Buffer.from(Date.now().toString() + Math.random().toString())
      .toString('base64')
      .substring(0, 16)

    const newCustomer = {
      _id: docId,
      _type: 'user',
      clerkId: `customer_${Date.now()}`,
      customerId,
      secretKey,
      name,
      nickname: nickname || undefined,
      email,
      phone,
      normalizedPhone: canonicalPhone,
      location,
      role: 'customer',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    let created: any
    try {
      created = await sanityClient.create(newCustomer as any)
    } catch (err: any) {
      if (err?.statusCode === 409) {
        return NextResponse.json({ success: false, error: 'Account already exists with this phone number' }, { status: 409 })
      }
      throw err
    }

    runPostCreateDelivery({
      actorUserId,
      created,
      name,
      nickname,
      phone,
      email,
      customerId,
      secretKey,
    }).catch((e) => {
      console.error('[WelcomeDelivery] post-create delivery failed', e)
    })

    return NextResponse.json({ success: true, data: { ...(created as any), customerId, secretKey } }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
