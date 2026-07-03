import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { notificationService } from '@/lib/notification-service'
import { sanitizeUserText } from '@/constants/defaults'
import { sendAppEmail } from '@/lib/email/server'
import { sendWhatsAppNotification } from '@/lib/send-whatsapp-notification'

export const runtime = 'nodejs'

function siteUrl() {
  return 'https://jambh-ell.vercel.app'
}

function supportInfo() {
  return (
    process.env.NEXT_PUBLIC_SUPPORT_PHONE ||
    process.env.SUPPORT_PHONE ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    'Contact the shop/admin from the app chat'
  )
}

function welcomeMessage(input: {
  customerName: string
  displayName?: string
  loginUrl: string
  contact: string
}) {
  const safeName = sanitizeUserText(input.displayName || input.customerName || 'Customer') || 'Customer'
  return [
    `Welcome to Jambh Electricals, ${safeName}.`,
    '',
    'Your customer account has been created successfully.',
    '',
    'Account Access',
    input.loginUrl,
    '',
    'You can use this link to view your bills, service requests, payments, and account information securely.',
    '',
    `For assistance, please contact us at ${input.contact}.`,
    '',
    'Thank you for choosing Jambh Electricals.',
    '',
    'Regards,',
    'Jambh Electricals',
  ].join('\n')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const DELIVERY_SENDING_STALE_MS = 10 * 60 * 1000

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
  message: string
}) {
  const email = String(input.email || '').trim()
  if (!email) return
  const key = `welcome.email.user.${input.userId}`
  if (!(await claimDelivery(key, 'email'))) return
  const result = await sendAppEmail({
    to: email,
    subject: 'Welcome to Jambh Electrics',
    text: input.message,
    html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.55">${escapeHtml(input.message)}</pre>`,
  })
  if (result.sent) {
    await finishDelivery(key, 'sent')
    return
  }
  const reason = result.reason || 'Email send failed'
  console.error('[WelcomeDelivery] email failed', { userId: input.userId, reason })
  await finishDelivery(key, 'failed', reason)
}

async function sendWelcomeWhatsApp(input: {
  userId: string
  phone?: string
  customerName: string
  displayName?: string
  loginUrl: string
  secretKey: string
}) {
  const phone = String(input.phone || '').trim()
  if (!phone) {
    console.warn('[WelcomeDelivery] whatsapp skipped: missing phone', { userId: input.userId })
    return
  }
  const key = `welcome.whatsapp.user.${input.userId}`
  if (!(await claimDelivery(key, 'whatsapp'))) {
    console.log('[WelcomeDelivery] whatsapp skipped: already sent', { userId: input.userId })
    return
  }

  const msg = `🔐 Your Account Login\n\nClick the link below to securely access your account:\n${input.loginUrl}`

  try {
    const result = await sendWhatsAppNotification({
      eventType: 'customer.welcome',
      phone,
      message: msg,
      metadata: { entityId: input.userId },
    })
    if (!result.ok) {
      console.error('[WelcomeDelivery] whatsapp failed', { userId: input.userId, reason: result.error })
      await finishDelivery(key, 'failed', result.error)
      return
    }
    console.log('[WelcomeDelivery] whatsapp sent', { userId: input.userId, phone })
    await finishDelivery(key, 'sent')
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'WhatsApp send failed'
    console.error('[WelcomeDelivery] whatsapp failed', { userId: input.userId, reason })
    await finishDelivery(key, 'failed', reason)
  }
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
  const contact = supportInfo()
  const message = welcomeMessage({ customerName: input.name, displayName: safeName, loginUrl, contact })

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
      message,
    }),
    sendWelcomeWhatsApp({
      userId,
      phone: input.phone,
      customerName: input.name,
      displayName: safeName,
      loginUrl,
      secretKey: input.secretKey,
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
    const body = await req.json().catch(() => ({}))
    const actorUserId = (String(body?.actorUserId || '')).trim()
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

    const normalizedPhone = phone.replace(/[^0-9]/g, '')
    if (normalizedPhone.length < 10) {
      return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 })
    }

    // Use phone-based _id for atomic duplicate prevention
    const docId = `user_c_${normalizedPhone}`

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
// Fire delivery tasks — no after() to avoid Next.js 16 reliability issues
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
