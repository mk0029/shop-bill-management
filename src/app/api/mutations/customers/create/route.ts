import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'
import { notificationService } from '@/lib/notification-service'

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
    try {
      await notificationService.emit({
        type: 'customer_created',
        actorUserId,
        data: {
          customerId: String((created as any)?._id || ''),
          route: '/admin/customers',
          extra: {
            title: 'New customer added',
            body: `${name} (${phone})`,
          },
        },
      })
    } catch (e) {
      // Do not fail creation if notification fails
      console.error('[Notify] customer_created emit failed', e)
    }

    return NextResponse.json({ success: true, data: { ...(created as any), customerId, secretKey } }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
