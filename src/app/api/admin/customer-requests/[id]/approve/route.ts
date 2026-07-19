import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { getServerAuth } from '@/lib/server-auth'
import { notificationService } from '@/lib/notification-service'
import { sendAppEmail } from '@/lib/email/server'
import { emitWaEventServer } from '@/lib/wa-bot-server'
import { normalizeAndValidate } from '@/lib/phone-utils'
import { validateIdentity } from '@/lib/identity-validator'
import { sendNotificationToAdmins } from '@/services/notifications/notification-events.server'
import { buildWelcomeText, buildWelcomeEmailHtml } from '@/lib/welcome-templates'

export const runtime = 'nodejs'

function siteUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://jambh-ell.vercel.app'
}

async function addAuditEntry(
  requestId: string,
  entry: { action: string; adminId: string; adminName: string; details: string },
) {
  await sanityClient.patch(requestId).setIfMissing({ auditTrail: [] }).commit()
  await sanityClient
    .patch(requestId)
    .insert('after', 'auditTrail[-1]', [
      {
        _key: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        action: entry.action,
        adminId: entry.adminId,
        adminName: entry.adminName,
        timestamp: new Date().toISOString(),
        details: entry.details,
      },
    ])
    .commit()
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getServerAuth()
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (auth.role !== 'admin' && auth.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const requestData: Record<string, any> | null = await sanityClient.fetch(
      `*[_type == "customerRequest" && _id == $id][0]`,
      { id },
    )

    if (!requestData) {
      return NextResponse.json({ success: false, error: 'Registration request not found' }, { status: 404 })
    }

    if (requestData.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `This request is already ${requestData.status}. Only pending requests can be approved.` },
        { status: 409 },
      )
    }

    const expired = requestData.expiresAt && new Date(requestData.expiresAt).getTime() < Date.now()
    if (expired) {
      await sanityClient.patch(id).set({ status: 'expired', resolvedAt: new Date().toISOString() }).commit()
      return NextResponse.json(
        { success: false, error: 'This request has expired and can no longer be approved.' },
        { status: 410 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const { name, nickname, phone, email, location, requirement, contactPreference } = body

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Name and phone are required' }, { status: 400 })
    }

    const canonicalPhone = normalizeAndValidate(phone)
    if (!canonicalPhone) {
      return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 })
    }

    const identityResult = await validateIdentity(
      { email: email || undefined, phone: canonicalPhone },
      { checkRequests: false },
    )
    if (!identityResult.allowed) {
      await addAuditEntry(id, {
        action: 'DUPLICATE_DETECTED',
        adminId: auth.userId!,
        adminName: (auth.user?.name as string) || 'Unknown',
        details: `Duplicate identity detected (${identityResult.conflict?.field}): email=${email || 'N/A'} phone=${canonicalPhone}`,
      })
      await sanityClient.patch(id).set({
        status: 'cancelled',
        cancelledReason: 'This registration request could not proceed because one or more identity fields already belong to an existing customer.',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'system',
        resolvedAt: new Date().toISOString(),
        resolvedBy: { _ref: auth.userId!, _type: 'reference' },
      }).commit()
      return NextResponse.json(
        { success: false, error: 'A customer with these identity details already exists. Request has been cancelled.', code: 'DUPLICATE_IDENTITY' },
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

    const notes = [requirement, contactPreference ? `Preferred: ${contactPreference}` : ''].filter(Boolean).join('\n') || undefined

    const newCustomer: Record<string, unknown> = {
      _id: docId,
      _type: 'user',
      clerkId: `customer_${Date.now()}`,
      customerId,
      secretKey,
      name,
      email: email || undefined,
      phone,
      normalizedPhone: canonicalPhone,
      location: location || undefined,
      role: 'customer',
      isActive: true,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    let created: any
    try {
      created = await sanityClient.create(newCustomer as any)
    } catch (err: any) {
      if (err?.statusCode === 409) {
        return NextResponse.json(
          { success: false, error: 'Account already exists with this phone number', code: 'DUPLICATE_CUSTOMER' },
          { status: 409 },
        )
      }
      throw err
    }

    const now = new Date().toISOString()
    const adminName = (auth.user?.name as string) || 'Unknown'

    await sanityClient.patch(id).set({
      status: 'approved',
      resolvedAt: now,
      resolvedBy: { _ref: auth.userId!, _type: 'reference' },
      customerRef: { _ref: created._id, _type: 'reference' },
      customerId,
    }).commit()

    await addAuditEntry(id, {
      action: 'APPROVED',
      adminId: auth.userId!,
      adminName,
      details: `Customer created: ${name} (${customerId})`,
    })

    // Fire welcome delivery
    const loginUrl = `${siteUrl()}/login?phone=${encodeURIComponent(phone)}&passKey=${encodeURIComponent(secretKey)}`
    const safeName = name || 'Customer'
    const templateData = {
      customerName: name,
      displayName: safeName,
      loginUrl,
      supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.SUPPORT_EMAIL || undefined,
      supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || process.env.SUPPORT_PHONE || undefined,
    }

    Promise.allSettled([
      sendNotificationToAdmins({
        type: "customer.request.approved",
        eventId: `customer.request.approved.${id}`,
        title: "Registration Request Approved",
        body: `${safeName}'s registration request has been approved and customer account created.`,
        data: {
          route: "/admin/customers",
          requestId: id,
          entityId: id,
          customerName: safeName,
        },
      }),
      notificationService.emit({
        eventId: `customer.created.${created._id}.admins`,
        type: 'customer_created',
        actorUserId: auth.userId!,
        data: {
          customerId: created._id,
          route: '/admin/customers',
          extra: { title: 'New customer created', body: `${safeName} has been created from registration request.` },
        },
      }),
      email ? sendAppEmail({
        to: email,
        subject: 'Welcome to Jambh Electricals',
        text: buildWelcomeText(templateData),
        html: buildWelcomeEmailHtml(templateData),
      }) : Promise.resolve(),
      emitWaEventServer('customer.created', {
        customerId: created._id,
        customerName: name,
        customerPhone: phone,
        phone,
        secretKey,
        loginUrl,
        shopName: 'Jambh Electricals',
        eventId: `customer.created.${created._id}`,
        idempotencyKey: `customer.created.${created._id}`,
      }).then((result) => {
        if (!result.ok) console.error('[WA_CUSTOMER_CREATED_FAILED]', { customerId: created._id, phone, error: result.error })
      }),
    ]).catch((e) => console.error('[Approve] delivery tasks failed', e))

    return NextResponse.json({
      success: true,
      message: 'Customer created and request approved successfully',
      data: { customerId: created._id, customerCode: customerId },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
