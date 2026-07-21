import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/server-auth'
import { sendFcmToTokens } from '@/services/notifications/fcm-sender.server'

const SIM_ID = () => `sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

type SimEvent = {
  label: string
  category: string
  channels: ('wa' | 'fcm')[]
  buildPayload: (ctx: { phone: string; name: string }) => Record<string, any>
  fcmTitle?: string
  fcmBody?: string
}

function billNum() {
  return `INV-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 100)}`
}

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randAmt(min = 500, max = 5000) {
  return Math.floor(Math.random() * (max - min)) + min
}

const EVENTS: Record<string, SimEvent> = {
  // ─── Customer ───────────────────────────────────────────
  'customer.request.created': {
    label: 'Customer Request (WA to Admins)',
    category: 'Customer',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      customerNickname: name.split(' ')[0], customerLocation: 'Delhi',
      requestType: 'self_registration',
      requestId: `REQ-${Date.now().toString(36).toUpperCase()}`,
      submittedAt: new Date().toISOString(),
    }),
    fcmTitle: 'New Customer Request',
    fcmBody: 'A new customer registration request has arrived.',
  },
  'customer.created': {
    label: 'Customer Created',
    category: 'Customer',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      customerNickname: name.split(' ')[0], customerLocation: 'Delhi',
      createdAt: new Date().toISOString(),
    }),
    fcmTitle: 'Customer Created',
    fcmBody: 'A new customer has been added to the system.',
  },

  // ─── Billing ────────────────────────────────────────────
  'billing.created': {
    label: 'Bill Created',
    category: 'Billing',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => {
      const amt = randAmt()
      return {
        phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
        customerNickname: name.split(' ')[0], billId: SIM_ID(), billNumber: billNum(),
        totalAmount: amt, paidAmount: 0, balanceAmount: amt,
        grandTotal: amt, paymentStatus: 'pending',
        serviceType: randItem(['repair', 'fitting', 'wiring']),
        items: [{ name: 'LED Bulb 9W', quantity: 2, price: 180 }, { name: 'Wire 1.5sqmm', quantity: 10, price: 25 }],
      }
    },
    fcmTitle: 'New Bill Created',
    fcmBody: 'A new bill has been created and is pending payment.',
  },
  'billing.payment.paid': {
    label: 'Payment Received (Full)',
    category: 'Billing',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => {
      const amt = randAmt()
      return {
        phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
        customerNickname: name.split(' ')[0], billId: SIM_ID(), billNumber: billNum(),
        totalAmount: amt, paidAmount: amt, balanceAmount: 0,
        grandTotal: amt, paymentStatus: 'paid',
        paymentMethod: randItem(['cash', 'upi', 'card']),
      }
    },
    fcmTitle: 'Payment Received',
    fcmBody: 'Full payment has been received. Bill is now paid.',
  },
  'billing.payment.partial': {
    label: 'Partial Payment',
    category: 'Billing',
    channels: ['wa'],
    buildPayload: ({ phone, name }) => {
      const total = randAmt(1000, 5000)
      const paid = Math.floor(total * (0.2 + Math.random() * 0.5))
      return {
        phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
        customerNickname: name.split(' ')[0], billId: SIM_ID(), billNumber: billNum(),
        totalAmount: total, paidAmount: paid, balanceAmount: total - paid,
        grandTotal: total, paymentStatus: 'partial',
      }
    },
  },
  'billing.updated': {
    label: 'Bill Updated',
    category: 'Billing',
    channels: ['wa'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      customerNickname: name.split(' ')[0], billId: SIM_ID(), billNumber: billNum(),
      totalAmount: 2500, paidAmount: 0, balanceAmount: 2500,
      grandTotal: 2500, paymentStatus: 'pending',
    }),
  },
  'billing.deleted': {
    label: 'Bill Deleted',
    category: 'Billing',
    channels: ['wa'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      customerNickname: name.split(' ')[0], billId: SIM_ID(), billNumber: billNum(),
      totalAmount: 1500, deletedBy: 'admin',
    }),
  },
  'billing.multiPaid': {
    label: 'Multi Bill Pay (Pay Multiple at Once)',
    category: 'Billing',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => {
      const billCount = Math.floor(Math.random() * 3) + 2
      const extraPendingCount = Math.floor(Math.random() * 2) + 1
      const bills: any[] = []
      let totalPending = 0
      for (let i = 0; i < billCount; i++) {
        const total = randAmt(800, 4000)
        const alreadyPaid = Math.floor(total * Math.random() * 0.3)
        const due = total - alreadyPaid
        totalPending += due
        bills.push({
          _id: SIM_ID(),
          billId: SIM_ID(),
          billNumber: billNum(),
          totalAmount: total,
          paidAmount: alreadyPaid,
          balanceAmount: due,
          paymentStatus: 'pending',
        })
      }
      let extraPendingTotal = 0
      for (let i = 0; i < extraPendingCount; i++) {
        extraPendingTotal += randAmt(500, 3000)
      }
      const totalOutstandingBefore = totalPending + extraPendingTotal
      const receivedAmount = Math.min(totalPending, randAmt(Math.floor(totalPending * 0.5), totalPending))
      let remaining = receivedAmount
      let fullyPaidCount = 0
      let partialBillNumber: string | null = null
      const billsPaid = bills.map((b: any) => {
        if (remaining <= 0) return { ...b }
        const due = b.balanceAmount
        const applied = Math.min(remaining, due)
        const newPaid = b.paidAmount + applied
        const newDue = due - applied
        const isFullyPaid = newDue <= 0.01
        remaining -= applied
        if (isFullyPaid) fullyPaidCount++
        else partialBillNumber = b.billNumber
        return {
          _id: b._id, billId: b.billId, billNumber: b.billNumber,
          totalAmount: b.totalAmount,
          paidAmount: applied,
          balanceAmount: Math.round(newDue * 100) / 100,
          paymentStatus: isFullyPaid ? 'paid' : 'partial',
        }
      })
      const remainingOutstanding = Math.max(0, totalOutstandingBefore - receivedAmount)
      return {
        phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
        customerNickname: name.split(' ')[0],
        bills: billsPaid,
        totalPaid: receivedAmount,
        remainingBalance: remainingOutstanding,
        totalOutstandingBefore,
        fullyPaidCount,
        partialCount: partialBillNumber ? 1 : 0,
        paymentMode: randItem(['cash', 'upi', 'card']),
        paymentDate: new Date().toISOString(),
      }
    },
    fcmTitle: 'Multiple Bills Paid',
    fcmBody: 'Payment applied across multiple bills.',
  },
  'billing.bulkPaid': {
    label: 'Bulk Bill Pay (Pay All Bills)',
    category: 'Billing',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => {
      const billCount = Math.floor(Math.random() * 4) + 3
      const extraPendingCount = Math.floor(Math.random() * 2) + 1
      const bills: any[] = []
      let totalPaid = 0
      for (let i = 0; i < billCount; i++) {
        const total = randAmt(500, 3500)
        const discount = Math.random() > 0.7 ? Math.floor(total * 0.1) : 0
        const grandTotal = Math.max(0, total - discount)
        totalPaid += grandTotal
        bills.push({
          _id: SIM_ID(),
          billId: SIM_ID(),
          billNumber: billNum(),
          totalAmount: total,
          paidAmount: grandTotal,
          balanceAmount: 0,
          paymentStatus: 'paid',
          discount,
        })
      }
      let extraPendingTotal = 0
      for (let i = 0; i < extraPendingCount; i++) {
        extraPendingTotal += randAmt(500, 3000)
      }
      const totalOutstandingBefore = totalPaid + extraPendingTotal
      const bulkDiscount = Math.random() > 0.6 ? Math.floor(totalPaid * 0.05) : 0
      const netPaid = totalPaid - bulkDiscount
      return {
        phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
        customerNickname: name.split(' ')[0],
        bills,
        totalPaid: netPaid,
        remainingBalance: extraPendingTotal,
        totalOutstandingBefore,
        fullyPaidCount: bills.length,
        partialCount: 0,
        discountApplied: bulkDiscount,
        discountReason: bulkDiscount > 0 ? randItem(['Early payment', 'Loyalty discount', 'Bulk payment offer', 'Seasonal offer']) : '',
        paymentMode: randItem(['cash', 'upi', 'card']),
        paymentDate: new Date().toISOString(),
      }
    },
    fcmTitle: 'All Bills Paid',
    fcmBody: 'All pending bills have been paid in bulk.',
  },

  // ─── Tool Rental ────────────────────────────────────────
  'toolRent.created': {
    label: 'Tool Rental Created',
    category: 'Tool Rental',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      customerNickname: name.split(' ')[0], toolId: SIM_ID(),
      toolName: randItem(['Drill Machine', 'Cutter', 'Measuring Tape', 'Soldering Iron']),
      rentalDays: Math.floor(Math.random() * 7) + 1,
      totalAmount: randAmt(100, 500),
      rentalDate: new Date().toISOString(),
    }),
    fcmTitle: 'Tool Rental Created',
    fcmBody: 'A new tool rental has been created.',
  },
  'toolRent.overdue': {
    label: 'Tool Rental Overdue',
    category: 'Tool Rental',
    channels: ['wa'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      customerNickname: name.split(' ')[0], toolId: SIM_ID(),
      toolName: 'Drill Machine', overdueDays: Math.floor(Math.random() * 5) + 1,
      totalAmount: 500, penaltyAmount: randAmt(50, 200),
    }),
  },
  'toolRent.returned': {
    label: 'Tool Rental Returned',
    category: 'Tool Rental',
    channels: ['wa'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      customerNickname: name.split(' ')[0], toolId: SIM_ID(),
      toolName: 'Cutter', returnedDate: new Date().toISOString(),
      totalAmount: 300, paidAmount: 300,
    }),
  },

  // ─── Work Tasks ─────────────────────────────────────────
  'workTask.created': {
    label: 'Work Task Created',
    category: 'Work Task',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      customerNickname: name.split(' ')[0], taskId: SIM_ID(),
      taskTitle: randItem(['LED light installation', 'Fan fitting', 'Wire routing', 'Switch board repair', 'MCB replacement']),
      technicianName: name.split(' ')[0] + ' Tech', technicianPhone: phone,
      priority: randItem(['low', 'medium', 'high', 'urgent']),
      dueAt: new Date(Date.now() + 86400000 * (Math.floor(Math.random() * 3) + 1)).toISOString(),
    }),
    fcmTitle: 'New Work Task',
    fcmBody: 'A new work task has been assigned.',
  },
  'workTask.completed': {
    label: 'Work Task Completed',
    category: 'Work Task',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      customerNickname: name.split(' ')[0], taskId: SIM_ID(),
      taskTitle: 'LED light installation', completionNotes: 'All lights installed and tested.',
      technicianName: name.split(' ')[0] + ' Tech',
    }),
    fcmTitle: 'Task Completed',
    fcmBody: 'The work task has been completed.',
  },
  'workTask.cancelled': {
    label: 'Work Task Cancelled',
    category: 'Work Task',
    channels: ['wa'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      customerNickname: name.split(' ')[0], taskId: SIM_ID(),
      taskTitle: 'Fan fitting', cancelReason: 'Customer rescheduled',
    }),
  },

  // ─── Technician Reminders ───────────────────────────────
  'workTask.reminder.overdue': {
    label: 'Technician: Overdue Task Reminder',
    category: 'Technician',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => ({
      technicianPhone: phone, technicianName: name,
      technicianId: SIM_ID(), customerId: SIM_ID(),
      customerName: randomName(), customerPhone: '9' + String(Math.floor(Math.random() * 999999999)).padStart(9, '0'),
      customerLocation: 'Delhi',
      taskId: SIM_ID(), taskTitle: randItem(['LED light installation', 'Fan fitting', 'Wire routing', 'Switch board repair']),
      priority: 'high',
      dueAt: new Date(Date.now() - 86400000 * (Math.floor(Math.random() * 3) + 1)).toISOString(),
      reminderType: 'overdue',
      overdueDays: Math.floor(Math.random() * 5) + 1,
    }),
    fcmTitle: 'Overdue Task Reminder',
    fcmBody: 'You have an overdue work task. Please complete it at the earliest.',
  },
  'workTask.reminder.due': {
    label: 'Technician: Due Task Reminder',
    category: 'Technician',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => ({
      technicianPhone: phone, technicianName: name,
      technicianId: SIM_ID(), customerId: SIM_ID(),
      customerName: randomName(), customerPhone: '9' + String(Math.floor(Math.random() * 999999999)).padStart(9, '0'),
      customerLocation: 'Delhi',
      taskId: SIM_ID(), taskTitle: randItem(['MCB replacement', 'Wiring repair', 'Fan installation']),
      priority: 'medium',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      reminderType: 'due',
    }),
    fcmTitle: 'Task Due Tomorrow',
    fcmBody: 'You have a work task due tomorrow. Please plan accordingly.',
  },
  'workTask.reminder.pending': {
    label: 'Technician: Pending Task Follow-up',
    category: 'Technician',
    channels: ['wa'],
    buildPayload: ({ phone, name }) => ({
      technicianPhone: phone, technicianName: name,
      technicianId: SIM_ID(), customerId: SIM_ID(),
      customerName: randomName(), customerPhone: '9' + String(Math.floor(Math.random() * 999999999)).padStart(9, '0'),
      customerLocation: 'Delhi',
      taskId: SIM_ID(), taskTitle: 'Switch board repair',
      priority: 'medium',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      dueAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      reminderType: 'pending',
      pendingDays: 3,
    }),
  },
  'bill.reminder.technician': {
    label: 'Technician: Bill Assigned Reminder',
    category: 'Technician',
    channels: ['wa'],
    buildPayload: ({ phone, name }) => {
      const amt = randAmt()
      return {
        technicianPhone: phone, technicianName: name,
        technicianId: SIM_ID(), customerId: SIM_ID(),
        customerName: randomName(), customerPhone: '9' + String(Math.floor(Math.random() * 999999999)).padStart(9, '0'),
        billId: SIM_ID(), billNumber: billNum(),
        totalAmount: amt, balanceAmount: Math.floor(amt * 0.4),
        grandTotal: amt, paymentStatus: 'partial',
        serviceType: randItem(['repair', 'fitting', 'wiring']),
        items: [{ name: 'LED Bulb 9W', quantity: 3, price: 180 }, { name: 'MCB 20A', quantity: 1, price: 250 }],
        reminderType: 'bill_assigned',
      }
    },
  },

  // ─── Offers ─────────────────────────────────────────────
  'offer.created': {
    label: 'Offer Created (FCM Broadcast)',
    category: 'Offer',
    channels: ['fcm'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      offerId: SIM_ID(), offerTitle: 'Diwali Special — 20% Off',
      offerType: 'percentage', discountValue: 20,
      audience: 'all',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      minimumOrderAmount: 500,
      terms: 'Valid on all products. Cannot be combined with other offers.',
    }),
    fcmTitle: 'New Offer Available!',
    fcmBody: 'Diwali Special — Get 20% off on all orders above ₹500!',
  },
  'offer.distributed': {
    label: 'Offer Distributed (FCM to Customers)',
    category: 'Offer',
    channels: ['fcm'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      offerId: SIM_ID(), offerTitle: 'Weekend Deal — ₹150 Off',
      offerType: 'fixed_amount', discountValue: 150,
      audience: 'selected_customers',
      targetCustomerIds: [SIM_ID()],
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    }),
    fcmTitle: 'Weekend Deal!',
    fcmBody: 'Get ₹150 off on your next order. Limited time only!',
  },

  // ─── Scheduled ──────────────────────────────────────────
  'scheduled.goodMorning': {
    label: 'Good Morning Greeting',
    category: 'Scheduled',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      greetingDate: new Date().toISOString().split('T')[0],
    }),
    fcmTitle: 'Good Morning!',
    fcmBody: 'Have a great day ahead!',
  },
  'scheduled.festivalGreeting': {
    label: 'Festival Greeting',
    category: 'Scheduled',
    channels: ['wa', 'fcm'],
    buildPayload: ({ phone, name }) => ({
      phone, customerPhone: phone, customerId: SIM_ID(), customerName: name,
      festivalName: 'Diwali', festivalMessage: 'Wishing you a Happy Diwali!',
    }),
    fcmTitle: 'Happy Diwali!',
    fcmBody: 'Wishing you a prosperous Diwali!',
  },
}

async function fireWA(eventType: string, payload: Record<string, any>) {
  const rawUrl = process.env.WA_BACKEND_URL || process.env.WA_BOT_URL || process.env.WHATSAPP_BACKEND_URL || process.env.NOTIFICATION_API_URL
  const backendUrl = (rawUrl || '').replace(/\/+$/, '')
  const secret = String(process.env.WA_BOT_TOKEN || process.env.API_KEY || process.env.WA_EVENT_SECRET || process.env.NOTIFY_API_SECRET || '').trim()

  const trace: any[] = []
  const log = (step: string, data: any) => trace.push({ step, ...data, ts: new Date().toISOString() })

  log('fire_wa', { eventType, phone: String(payload.phone || '').slice(0, 4) + '****' })

  if (!backendUrl) { log('skip', { reason: 'WA_BACKEND_URL not configured' }); return { ok: false, error: 'WA_BACKEND_URL not configured', trace } }
  if (!secret) { log('skip', { reason: 'WA secret not configured' }); return { ok: false, error: 'WA secret not configured', trace } }

  const url = `${backendUrl}/api/wa/events/${eventType}`
  try {
    const start = Date.now()
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${secret}`, 'x-api-key': secret },
      body: JSON.stringify({ ...payload, _simulated: true }),
    })
    const ms = Date.now() - start
    const text = await res.text()
    let json: any = null
    try { json = JSON.parse(text) } catch {}
    log('response', { status: res.status, ok: res.ok, ms, body: json || text.slice(0, 500) })
    return { ok: res.ok, status: res.status, response: json, trace }
  } catch (err: any) {
    log('error', { message: err.message })
    return { ok: false, error: err.message, trace }
  }
}

async function fireFCM(eventType: string, payload: Record<string, any>, title: string, body: string) {
  const trace: any[] = []
  const log = (step: string, data: any) => trace.push({ step, ...data, ts: new Date().toISOString() })

  log('fire_fcm', { eventType, title, body })

  const { sanityClient } = await import('@/lib/sanity')
  const phone = String(payload.phone || payload.customerPhone || payload.technicianPhone || '').replace(/\D/g, '')
  let tokens: string[] = []

  // Try to find tokens by phone first
  if (phone) {
    const found = await sanityClient.fetch<any[]>(
      `*[_type == "userFcmToken" && isActive == true && defined(token) && token != "" && customerPhone == $phone]{ token }`,
      { phone }
    )
    tokens = (found || []).map((t: any) => t.token).filter(Boolean)
  }

  // For technician reminders, also try technician role tokens
  if (!tokens.length && eventType.includes('technician')) {
    const techTokens = await sanityClient.fetch<any[]>(
      `*[_type == "userFcmToken" && isActive == true && defined(token) && token != "" && role == "technician"]{ token }`
    )
    tokens = (techTokens || []).map((t: any) => t.token).filter(Boolean)
  }

  // For offer events targeting admins, resolve admin tokens
  if (!tokens.length && eventType.startsWith('offer.')) {
    const adminTokens = await sanityClient.fetch<any[]>(
      `*[_type == "userFcmToken" && isActive == true && defined(token) && token != "" && role in ["admin","super_admin"]]{ token }`
    )
    tokens = (adminTokens || []).map((t: any) => t.token).filter(Boolean)
  }

  // Fallback: broadcast to all active tokens
  if (!tokens.length) {
    const allTokens = await sanityClient.fetch<any[]>(
      `*[_type == "userFcmToken" && isActive == true && defined(token) && token != ""]{ token }`
    )
    tokens = (allTokens || []).map((t: any) => t.token).filter(Boolean)
  }

  log('tokens', { count: tokens.length })
  if (!tokens.length) {
    log('abort', { reason: 'No FCM tokens found' })
    return { ok: false, error: 'No FCM tokens found', trace }
  }

  const data: Record<string, string> = { simulated: 'true', eventType, timestamp: new Date().toISOString() }

  try {
    const result = await sendFcmToTokens({ tokens, title, body, data })
    log('result', result)
    return { ok: result.success, response: result, trace }
  } catch (err: any) {
    log('error', { message: err.message })
    return { ok: false, error: err.message, trace }
  }
}

export async function POST(req: NextRequest) {
  const auth = await getServerAuth()
  if (!auth.isAuthenticated || auth.role !== 'super_admin') {
    return NextResponse.json({ ok: false, error: 'Unauthorized — super admin only' }, { status: 403 })
  }

  const body = await req.json()
  const { action } = body

  // ─── Offer Actions ────────────────────────────────────────
  if (action === 'offer.liveNotify') {
    const { offerId } = body
    if (!offerId) return NextResponse.json({ ok: false, error: 'offerId required' }, { status: 400 })

    const trace: any[] = []
    const log = (step: string, data: any) => trace.push({ step, ...data, ts: new Date().toISOString() })

    log('offer.liveNotify', { offerId })

    try {
      const { processOfferLiveNotification } = await import('@/services/notifications/offer-notification.server')
      const result = await processOfferLiveNotification(offerId, { dryRun: false })
      log('result', result)
      return NextResponse.json({ ok: true, action: 'offer.liveNotify', result, trace })
    } catch (err: any) {
      log('error', { message: err.message })
      return NextResponse.json({ ok: false, error: err.message, trace })
    }
  }

  if (action === 'offer.fcmTest') {
    const { offerId, customerPhone, customerName } = body
    if (!offerId) return NextResponse.json({ ok: false, error: 'offerId required' }, { status: 400 })

    const phone = String(customerPhone || '').replace(/\D/g, '')
    if (!phone || phone.length < 7) return NextResponse.json({ ok: false, error: 'Valid customerPhone required' }, { status: 400 })
    const name = String(customerName || '').trim() || 'Test Customer'

    const trace: any[] = []
    const log = (step: string, data: any) => trace.push({ step, ...data, ts: new Date().toISOString() })

    log('offer.fcmTest', { offerId, phone: phone.slice(0, 4) + '****' })

    try {
      const { sanityClient } = await import('@/lib/sanity')
      const offer = await sanityClient.fetch<any>(
        `*[_type == "offer" && _id == $id][0]{ _id, title, offerType, discountValue, description, startAt, endAt, terms }`,
        { id: offerId }
      )
      if (!offer) return NextResponse.json({ ok: false, error: 'Offer not found', trace })

      log('offer_loaded', { title: offer.title, type: offer.offerType })

      let tokens: string[] = []
      const found = await sanityClient.fetch<any[]>(
        `*[_type == "userFcmToken" && isActive == true && defined(token) && token != "" && customerPhone == $phone]{ token }`,
        { phone }
      )
      tokens = (found || []).map((t: any) => t.token).filter(Boolean)

      if (!tokens.length) {
        const allTokens = await sanityClient.fetch<any[]>(
          `*[_type == "userFcmToken" && isActive == true && defined(token) && token != ""]{ token }`
        )
        tokens = (allTokens || []).map((t: any) => t.token).filter(Boolean)
      }

      log('tokens', { count: tokens.length })
      if (!tokens.length) return NextResponse.json({ ok: false, error: 'No FCM tokens found', trace })

      const discountText = offer.offerType === 'percentage'
        ? `${offer.discountValue}% off`
        : offer.offerType === 'fixed_amount'
          ? `₹${offer.discountValue} off`
          : 'Special offer'

      const title = `🎉 ${offer.title}`
      const bodyText = `${discountText} — ${offer.description || 'Check out this exclusive offer!'}${offer.terms ? `\n\n${offer.terms}` : ''}`

      const result = await sendFcmToTokens({
        tokens,
        title,
        body: bodyText,
        data: { simulated: 'true', offerId: offer._id, eventType: 'offer_test', timestamp: new Date().toISOString() },
      })

      log('fcm_sent', result)
      return NextResponse.json({
        ok: true, action: 'offer.fcmTest',
        offer: { id: offer._id, title: offer.title, type: offer.offerType, discount: offer.discountValue },
        result, trace,
      })
    } catch (err: any) {
      log('error', { message: err.message })
      return NextResponse.json({ ok: false, error: err.message, trace })
    }
  }

  if (action === 'offer.claimTest') {
    const { offerId, customerId } = body
    if (!offerId || !customerId) return NextResponse.json({ ok: false, error: 'offerId and customerId required' }, { status: 400 })

    const trace: any[] = []
    const log = (step: string, data: any) => trace.push({ step, ...data, ts: new Date().toISOString() })

    log('offer.claimTest', { offerId, customerId })

    try {
      const { claimOffer } = await import('@/lib/offer-service')
      const result = await claimOffer(customerId, customerId, offerId)
      log('result', result)
      return NextResponse.json({ ok: true, action: 'offer.claimTest', result, trace })
    } catch (err: any) {
      log('error', { message: err.message })
      return NextResponse.json({ ok: false, error: err.message, trace })
    }
  }

  // ─── Standard Event Simulation ─────────────────────────────
  const { eventType, channels: targetChannels, customerPhone, customerName } = body

  if (!eventType) return NextResponse.json({ ok: false, error: 'eventType or action required' }, { status: 400 })

  const phone = String(customerPhone || '').replace(/\D/g, '')
  if (!phone || phone.length < 7) return NextResponse.json({ ok: false, error: 'Valid customerPhone required (min 7 digits)' }, { status: 400 })
  const name = String(customerName || '').trim()
  if (!name) return NextResponse.json({ ok: false, error: 'customerName required' }, { status: 400 })

  const simEvent = EVENTS[eventType]
  if (!simEvent) return NextResponse.json({ ok: false, error: `Unknown event: ${eventType}. Available: ${Object.keys(EVENTS).join(', ')}` }, { status: 400 })

  const payload = simEvent.buildPayload({ phone, name })
  const channels = targetChannels || simEvent.channels
  const results: Record<string, any> = {}

  if (channels.includes('wa')) {
    results.wa = await fireWA(eventType, payload)
  }
  if (channels.includes('fcm')) {
    results.fcm = await fireFCM(
      eventType, payload,
      simEvent.fcmTitle || `${simEvent.label} Notification`,
      simEvent.fcmBody || `Simulated ${simEvent.label} event`,
    )
  }

  return NextResponse.json({
    ok: true,
    simulated: true,
    event: eventType,
    label: simEvent.label,
    channels,
    results,
  })
}

export async function GET(req: NextRequest) {
  const auth = await getServerAuth()
  if (!auth.isAuthenticated || auth.role !== 'super_admin') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
  }

  const offersParam = req.nextUrl.searchParams.get('offers')
  if (offersParam === 'true') {
    const { sanityClient } = await import('@/lib/sanity')
    const offers = await sanityClient.fetch<any[]>(
      `*[_type == "offer"] | order(createdAt desc) [0...50]{
        _id, title, offerType, discountValue, status, audience,
        startAt, endAt, currentClaimCount, maxClaims, sendPushNotification,
        targetCustomerGroups, createdAt
      }`
    )
    return NextResponse.json({
      ok: true,
      offers: (offers || []).map(o => ({
        id: o._id,
        title: o.title,
        type: o.offerType,
        discount: o.discountValue,
        status: o.status,
        audience: o.audience,
        startAt: o.startAt,
        endAt: o.endAt,
        claims: o.currentClaimCount || 0,
        maxClaims: o.maxClaims || null,
        pushEnabled: o.sendPushNotification !== false,
        targetGroups: o.targetCustomerGroups || [],
      })),
    })
  }

  const events = Object.entries(EVENTS).map(([key, ev]) => ({
    key,
    label: ev.label,
    category: ev.category,
    channels: ev.channels,
  }))

  return NextResponse.json({ ok: true, events })
}
