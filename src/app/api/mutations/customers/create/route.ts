import { after, NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { notificationService } from '@/lib/notification-service'
import { sanitizeUserText } from '@/constants/defaults'
import { sendAppEmail } from '@/lib/email/server'

export const runtime = 'nodejs'

function siteUrl(_req: NextRequest) {
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

function normalizeIndianPhone(phone: string) {
  const digits = String(phone || '').replace(/[^0-9+]/g, '')
  if (!digits) return ''
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('0')) return `+91${digits.slice(1)}`
  if (digits.startsWith('91') && digits.length >= 12) return `+${digits}`
  return `+91${digits}`
}

function welcomeMessage(input: {
  customerName: string
  loginUrl: string
  contact: string
}) {
  const safeName = sanitizeUserText(input.customerName || 'Customer') || 'Customer'
  return [
    `🎉 Welcome, ${safeName}!`,
    'Your account is ready. Explore products, request services, track updates, and connect with our team—all in one place.',
    '',
    `🎉 स्वागत है, ${safeName}!`,
    'आपका अकाउंट तैयार है। अब आप उत्पाद देख सकते हैं, सेवाओं का अनुरोध कर सकते हैं, अपडेट ट्रैक कर सकते हैं और हमारी टीम से जुड़ सकते हैं — सब कुछ एक ही जगह पर।',
    '',
    '🔐 Your Secure Account:',
    'Click the link below to log in and view your bills, service requests, and account info safely:',
    input.loginUrl,
    '',
    'Your account is password-protected and private. Only you can access it.',
    '',
    `Need help? Contact us: ${input.contact}`,
    '',
    'Thank you for choosing Jambh Electrical Services ⚡',
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
  const existing = await sanityClient.fetch<{ _id: string; status?: string; updatedAt?: string } | null>(
    `*[_id==$id][0]{_id,status,updatedAt}`,
    { id: key },
  )
  const updatedAt = existing?.updatedAt ? Date.parse(existing.updatedAt) : 0
  const sendingIsFresh =
    existing?.status === 'sending' &&
    Number.isFinite(updatedAt) &&
    Date.now() - updatedAt < DELIVERY_SENDING_STALE_MS

  if (existing?.status === 'sent' || sendingIsFresh) {
    return false
  }
  await sanityClient.createOrReplace({
    _id: key,
    _type: 'deliveryLog',
    channel,
    status: 'sending',
    idempotencyKey: key,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  })
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
  message: string
}) {
  const phone = normalizeIndianPhone(String(input.phone || ''))
  if (!phone) {
    console.warn('[WelcomeDelivery] whatsapp skipped: missing phone', { userId: input.userId })
    return
  }
  const key = `welcome.whatsapp.user.${input.userId}`
  if (!(await claimDelivery(key, 'whatsapp'))) {
    console.log('[WelcomeDelivery] whatsapp skipped: already sent or sending', { userId: input.userId })
    return
  }

  try {
    const base = 'https://jambh-ell.vercel.app'
    const res = await fetch(new URL('/api/whatsapp/send-bulk', base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phones: [phone], message: input.message }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json?.ok === false || Number(json?.failed || 0) > 0) {
      const reason = json?.error || json?.results?.[0]?.error || `WhatsApp send failed (${res.status})`
      console.error('[WelcomeDelivery] whatsapp failed', { userId: input.userId, reason })
      await finishDelivery(key, 'failed', reason)
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
  phone: string
  email?: string
  customerId: string
  secretKey: string
}) {
  const userId = String(input.created?._id || '').trim()
  const safeName = sanitizeUserText(input.name || 'Customer') || 'Customer'
  const loginUrl = `${siteUrl(req)}/login?phone=${encodeURIComponent(input.phone)}&passKey=${encodeURIComponent(input.secretKey)}`
  const contact = supportInfo()
  const message = welcomeMessage({ customerName: safeName, loginUrl, contact })

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
      customerName: safeName,
      message,
    }),
    sendWelcomeWhatsApp({
      userId,
      phone: input.phone,
      message,
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
    const email = body?.email ? String(body.email) : undefined

    if (!name || !phone || !location) {
      return NextResponse.json({ success: false, error: 'Missing name/phone/location' }, { status: 400 })
    }

    const userExists = await sanityClient.fetch(
      `*[_type=="user" && phone==$phone][0]{ _id }`,
      { phone }
    )
    if (userExists?._id) {
      return NextResponse.json({ success: false, error: 'Account already exists with this phone number' }, { status: 409 })
    }

    const customerId = Buffer.from(Date.now().toString() + Math.random().toString())
      .toString('base64')
      .substring(0, 12)
    const secretKey = Buffer.from(Date.now().toString() + Math.random().toString())
      .toString('base64')
      .substring(0, 16)

    const newCustomer = {
      _type: 'user',
      clerkId: `customer_${Date.now()}`,
      customerId,
      secretKey,
      name,
      email,
      phone,
      location,
      role: 'customer',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const created = await sanityClient.create(newCustomer as any)
    after(() => {
      void runPostCreateDelivery({
        actorUserId,
        created,
        name,
        phone,
        email,
        customerId,
        secretKey,
      }).catch((e) => {
        console.error('[WelcomeDelivery] post-create delivery failed', e)
      })
    })

    return NextResponse.json({ success: true, data: { ...(created as any), customerId, secretKey } }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
