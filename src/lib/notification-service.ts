import 'server-only'
import { sanityClient } from './sanity'
import { GoogleAuth } from 'google-auth-library'

import { createHash } from 'node:crypto'

export type SendPayload = {
  title: string
  body: string
  data?: Record<string, string>
  tokens?: string[]
  userIds?: string[]
  // Allow targeting by phone numbers (normalized to digits only)
  phoneNumbers?: string[]
  sound?: 'default' | string
  // New: allow client to explicitly exclude current device tokens
  excludeTokens?: string[]
}

export type NotificationEvent = {
  eventId?: string
  type:
    | 'customer_created'
    | 'bill_created'
    | 'bill_status_updated'
    | 'cashbook_entry'
    | 'inventory_added'
    | 'shop_status'
    | 'admin_broadcast'
    | 'user_direct'

  actorUserId: string
  data: {
    customerId?: string
    billId?: string
    inventoryId?: string
    status?: string
    route?: string
    message?: string
    extra?: any
  }
}

type NotificationDoc = {
  _id: string
  _type: 'notification'
  title: string
  body: string
  audience: 'all' | 'admins' | 'users'
  type: string
  actorUserId: string
  targetUserIds: string[]
  data?: Record<string, unknown>
  readBy: string[]
  createdAt: string
  expiresAt?: string
  eventId: string
}

function deriveAudience(event: NotificationEvent): 'all' | 'admins' | 'users' {
  if (event.type === 'admin_broadcast') {
    const target = event.data?.extra?.target
    if (target === 'all_users') return 'all'
    return 'admins'
  }
  if (event.type === 'user_direct') return 'users'
  if (event.type === 'shop_status') return 'all'
  if (event.type === 'bill_created' || event.type === 'bill_status_updated') {
    // These often target both admins + customer; list API does not support mixed audience.
    // Default to 'admins' unless explicitly a direct/customer notification.
    return event.data?.customerId ? 'users' : 'admins'
  }
  return 'admins'
}

type EmitResult = {
  ok: boolean
  idempotent: boolean
  notificationId?: string
  persisted?: boolean
  targets?: { userIds: string[]; tokenCount: number }
  send?: { success: boolean; sent?: number; failed?: number; errors?: string[] }
  error?: string
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

function computeEventId(event: NotificationEvent): string {
  if (event.eventId && typeof event.eventId === 'string' && event.eventId.trim()) {
    return event.eventId.trim()
  }
  const entityId =
    event.data?.billId ||
    event.data?.customerId ||
    event.data?.inventoryId ||
    ''
  const bucket = Math.floor(Date.now() / (60 * 1000)) // 1 minute bucket
  return sha256(`${event.type}|${event.actorUserId}|${entityId}|${bucket}`).slice(0, 32)
}

async function getAllActiveAdminUserIds(): Promise<string[]> {
  const ids = await sanityClient.fetch<string[]>(
    `*[_type=="user" && role=="admin" && isActive != false]._id`
  )
  return Array.from(new Set((ids || []).filter(Boolean)))
}

async function getAllActiveCustomerUserIds(): Promise<string[]> {
  const ids = await sanityClient.fetch<string[]>(
    `*[_type=="user" && role=="customer" && isActive != false]._id`
  )
  return Array.from(new Set((ids || []).filter(Boolean)))
}

async function getActiveTokensForSanityUserIds(userIds: string[]): Promise<string[]> {
  if (!userIds?.length) return []
  const query = `*[_type=="user" && ( _id in $ids || customerId in $ids || clerkId in $ids ) && isActive != false]{ fcmTokens }`
  const users = await sanityClient.fetch<UserWithTokens[]>(query, { ids: userIds })
  const tokens = (users || [])
    .flatMap(u => Array.isArray(u?.fcmTokens) ? u.fcmTokens : [])
    .filter(Boolean)
  return Array.from(new Set(tokens))
}

function applySkipSelf(actorUserId: string, targetUserIds: string[]): string[] {
  if (!actorUserId) return Array.from(new Set((targetUserIds || []).filter(Boolean)))
  return Array.from(new Set((targetUserIds || []).filter(Boolean))).filter(id => id !== actorUserId)
}

function coerceStringRecord(input: unknown): Record<string, string> | undefined {
  if (!input || typeof input !== 'object') return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === 'undefined') continue
    out[String(k)] = String(v)
  }
  return out
}

function buildDefaultTitleBody(event: NotificationEvent): { title: string; body: string } {
  const t = event.type
  if (t === 'customer_created') {
    return { title: 'New customer created', body: 'A new customer has been added.' }
  }
  if (t === 'bill_created') {
    return { title: 'Bill created', body: 'A new bill has been created.' }
  }
  if (t === 'bill_status_updated') {
    return { title: 'Bill status updated', body: `Bill status updated${event.data?.status ? `: ${event.data.status}` : ''}` }
  }
  if (t === 'cashbook_entry') {
    return { title: 'Cashbook entry', body: 'A new cashbook entry was added.' }
  }
  if (t === 'inventory_added') {
    return { title: 'Inventory updated', body: 'A new inventory item was added.' }
  }
  if (t === 'shop_status') {
    return { title: 'Shop status updated', body: event.data?.status ? `Status: ${event.data.status}` : 'Shop status changed.' }
  }
  if (t === 'admin_broadcast') {
    return { title: 'Announcement', body: event.data?.message ? String(event.data.message) : 'You have a new announcement.' }
  }
  if (t === 'user_direct') {
    return { title: 'Message', body: event.data?.message ? String(event.data.message) : 'You have a new message.' }
  }
  return { title: 'Notification', body: '' }
}

async function resolveTargetUserIds(event: NotificationEvent): Promise<string[]> {
  const type = event.type

  if (type === 'customer_created') {
    return await getAllActiveAdminUserIds()
  }

  if (type === 'bill_created' || type === 'bill_status_updated') {
    const admins = await getAllActiveAdminUserIds()
    const customerId = event.data?.customerId
    return customerId ? Array.from(new Set([...admins, String(customerId)])) : admins
  }

  if (type === 'cashbook_entry' || type === 'inventory_added') {
    return await getAllActiveAdminUserIds()
  }

  if (type === 'shop_status') {
    const [admins, customers] = await Promise.all([
      getAllActiveAdminUserIds(),
      getAllActiveCustomerUserIds(),
    ])
    return Array.from(new Set([...admins, ...customers]))
  }

  if (type === 'admin_broadcast') {
    const target = event.data?.extra?.target
    if (target === 'all_admins') return await getAllActiveAdminUserIds()
    if (target === 'all_users') {
      const [admins, customers] = await Promise.all([
        getAllActiveAdminUserIds(),
        getAllActiveCustomerUserIds(),
      ])
      return Array.from(new Set([...admins, ...customers]))
    }
    if (target === 'specific_user') {
      const uid = event.data?.extra?.targetUserId
      return uid ? [String(uid)] : []
    }
    return []
  }

  if (type === 'user_direct') {
    const uid = event.data?.extra?.targetUserId || event.data?.customerId
    return uid ? [String(uid)] : []
  }

  return []
}

async function persistNotificationDoc(doc: NotificationDoc): Promise<{ created: boolean } | { created: false; conflict: true } | { created: false; error: string }> {
  try {
    await sanityClient.create(doc as any)
    return { created: true }
  } catch (e: any) {
    const code = e?.statusCode || e?.status
    if (code === 409) {
      return { created: false, conflict: true }
    }
    const msg = e instanceof Error ? e.message : String(e)
    return { created: false, error: msg }
  }
}

export const notificationService = {
  async emit(event: NotificationEvent): Promise<EmitResult> {
    try {
      if (!event?.type) return { ok: false, idempotent: false, error: 'Missing event.type' }
      if (!event?.actorUserId) return { ok: false, idempotent: false, error: 'Missing actorUserId' }

      const eventId = computeEventId(event)
      const notificationId = `notification.${eventId}`

      // Resolve targets (Sanity user._id only) then enforce skip-self
      const rawTargets = await resolveTargetUserIds(event)
      const targetUserIds = applySkipSelf(String(event.actorUserId), rawTargets)

      // Persist FIRST (idempotency guard uses deterministic _id)
      const defaults = buildDefaultTitleBody(event)
      const title = String(event.data?.extra?.title || defaults.title)
      const body = String(event.data?.extra?.body || defaults.body)
      const createdAt = new Date().toISOString()
      const expiresAt = (() => {
        const raw = event.data?.extra?.expiresAt
        if (!raw) return undefined
        if (typeof raw === 'string') return raw
        return undefined
      })()

      const persisted = await persistNotificationDoc({
        _id: notificationId,
        _type: 'notification',
        title,
        body,
        audience: deriveAudience(event),
        type: String(event.type),
        actorUserId: String(event.actorUserId),
        targetUserIds,
        data: {
          ...(event.data || {}),
          route: event.data?.route || undefined,
        },
        readBy: [],
        createdAt,
        ...(expiresAt ? { expiresAt } : {}),
        eventId,
      })

      if ('conflict' in persisted && persisted.conflict) {
        // Already processed -> do not re-send
        return { ok: true, idempotent: true, notificationId, persisted: false, targets: { userIds: targetUserIds, tokenCount: 0 } }
      }
      if ('error' in persisted) {
        return { ok: false, idempotent: false, notificationId, error: persisted.error }
      }

      // If no targets after skip-self, stop after persistence
      if (!targetUserIds.length) {
        return { ok: true, idempotent: false, notificationId, persisted: true, targets: { userIds: [], tokenCount: 0 }, send: { success: true, sent: 0, failed: 0 } }
      }

      // Fetch tokens (active only)
      const tokens = await getActiveTokensForSanityUserIds(targetUserIds)
      if (!tokens.length) {
        return { ok: true, idempotent: false, notificationId, persisted: true, targets: { userIds: targetUserIds, tokenCount: 0 }, send: { success: false, sent: 0, failed: 0, errors: ['No target tokens'] } }
      }

      // Include deep link + id for client-side dedupe / navigation
      const dataForFcm = coerceStringRecord({
        id: notificationId,
        type: event.type,
        route_path: event.data?.route || undefined,
        billId: event.data?.billId,
        customerId: event.data?.customerId,
        inventoryId: event.data?.inventoryId,
        status: event.data?.status,
      })

      const send = await sendNotification({
        title,
        body,
        tokens,
        data: dataForFcm,
      })

      return {
        ok: true,
        idempotent: false,
        notificationId,
        persisted: true,
        targets: { userIds: targetUserIds, tokenCount: tokens.length },
        send,
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, idempotent: false, error: msg }
    }
  },
}

export async function sendToAllEnv(title: string, body: string, data: Record<string, string> | undefined, env: 'prod' | 'dev', excludeTokens?: string[]): Promise<SendResult> {
  let tokens = await getAllTokensByEnv(env)
  if (Array.isArray(excludeTokens) && excludeTokens.length && tokens.length) {
    const ex = new Set(excludeTokens.filter(Boolean))
    tokens = tokens.filter(t => !ex.has(t))
  }
  if (!tokens.length) return { success: false, errors: ['No user tokens'] }
  try {
    const result = await sendFcmV1ToTokens({ tokens, title, body, data })
    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'FCM v1 broadcast error'
    return { success: false, errors: [msg] }
  }
}

type SendResult = {
  success: boolean
  sent?: number
  failed?: number
  errors?: string[]
}

type UserWithTokens = { fcmTokens?: string[] | null }
type UserWithEnvTokens = { fcmTokens?: string[] | null; fcmTokensProd?: string[] | null; fcmTokensDev?: string[] | null }

async function getTokensForUserIds(userIds: string[]): Promise<string[]> {
  if (!userIds?.length) return []
  // Accept both Sanity _id and clerkId/customerId
  const query = `*[_type=="user" && ( _id in $ids || clerkId in $ids || customerId in $ids ) && isActive != false]{ fcmTokens }`
  const users = await sanityClient.fetch<UserWithTokens[]>(query, { ids: userIds })
  const tokens = (users || [])
    .flatMap(u => Array.isArray(u?.fcmTokens) ? u.fcmTokens : [])
    .filter(Boolean)
  // Deduplicate
  return Array.from(new Set(tokens))
}

// Try to match multiple possible phone fields and normalize to digits only for comparison.
async function getTokensForPhones(phones: string[]): Promise<string[]> {
  if (!phones?.length) return []
  // Normalize to digits only; also keep a Set for O(1) lookups
  const norm = (s: string) => (s || '').replace(/\D+/g, '')
  const inputSet = new Set(phones.map(p => norm(p)).filter(Boolean))
  if (!inputSet.size) return []

  // Fetch candidate users with any of the common phone fields.
  // We pull minimal fields to filter on server side reliably.
  const query = `*[_type=="user" && isActive != false]{
    fcmTokens,
    phone,
    phoneNumber,
    mobile,
    contactNumber
  }`
  const users = await sanityClient.fetch<Array<UserWithTokens & {
    phone?: string | null,
    phoneNumber?: string | null,
    mobile?: string | null,
    contactNumber?: string | null,
  }>>(query)

  const tokens: string[] = []
  for (const u of users || []) {
    const candidates = [u.phone, u.phoneNumber, u.mobile, u.contactNumber]
    const anyMatch = candidates.some(v => v && inputSet.has(norm(String(v))))
    if (anyMatch) {
      if (Array.isArray(u?.fcmTokens)) tokens.push(...u.fcmTokens.filter(Boolean) as string[])
    }
  }
  return Array.from(new Set(tokens))
}

async function getAdminTokens(): Promise<string[]> {
  const query = `*[_type=="user" && role=="admin" && isActive != false]{ fcmTokens }`
  const users = await sanityClient.fetch<UserWithTokens[]>(query)
  const tokens = (users || [])
    .flatMap(u => Array.isArray(u?.fcmTokens) ? u.fcmTokens : [])
    .filter(Boolean)
  return Array.from(new Set(tokens))
}

async function getAdminTokensExcept(excludeUserIds?: string[]): Promise<string[]> {
  const all = await getAdminTokens()
  if (!excludeUserIds || excludeUserIds.length === 0) return all
  const excludeTokens = await getTokensForUserIds(excludeUserIds)
  if (!excludeTokens.length) return all
  const excludeSet = new Set(excludeTokens)
  return all.filter(t => !excludeSet.has(t))
}

// Get FCM tokens for all active users
async function getAllTokens(): Promise<string[]> {
  const query = `*[_type=="user" && isActive != false]{ fcmTokens }`
  const users = await sanityClient.fetch<UserWithTokens[]>(query)
  const tokens = (users || [])
    .flatMap(u => Array.isArray(u?.fcmTokens) ? u.fcmTokens : [])
    .filter(Boolean)
  return Array.from(new Set(tokens))
}

async function getAllTokensByEnv(env: 'prod' | 'dev'): Promise<string[]> {
  const query = `*[_type=="user" && isActive != false]{ fcmTokens, fcmTokensProd, fcmTokensDev }`
  const users = await sanityClient.fetch<UserWithEnvTokens[]>(query)
  const tokens = (users || [])
    .flatMap(u => {
      const envTokens = env === 'prod' ? u?.fcmTokensProd : u?.fcmTokensDev
      if (Array.isArray(envTokens) && envTokens.length) return envTokens
      // Fallback to legacy field if env-specific arrays are empty
      return Array.isArray(u?.fcmTokens) ? u!.fcmTokens! : []
    })
    .filter(Boolean)
  return Array.from(new Set(tokens))
}

export async function sendNotification(payload: SendPayload): Promise<SendResult> {
  const errors: string[] = []
  try {
    const { title, body, data, tokens: directTokens, userIds, phoneNumbers, excludeTokens } = payload
    if (!title || !body) return { success: false, errors: ['Missing title/body'] }

    let targetTokens: string[] = []
    if (Array.isArray(directTokens) && directTokens.length) {
      targetTokens = directTokens
    } else if (Array.isArray(userIds) && userIds.length) {
      targetTokens = await getTokensForUserIds(userIds)
    } else if (Array.isArray(phoneNumbers) && phoneNumbers.length) {
      targetTokens = await getTokensForPhones(phoneNumbers)
    }

    // Device-level suppression: remove any explicit exclude tokens
    if (Array.isArray(excludeTokens) && excludeTokens.length && targetTokens.length) {
      const ex = new Set(excludeTokens.filter(Boolean))
      targetTokens = targetTokens.filter(t => !ex.has(t))
    }

    // Nothing to send
    if (!targetTokens.length) {
      return { success: false, errors: ['No target tokens'] }
    }

    // Use FCM v1 HTTP API for all sends to align with serverless
    const dataAsStrings: Record<string, string> | undefined = data
      ? Object.fromEntries(Object.entries(data).map(([k, v]) => [String(k), String(v)]))
      : undefined
    const result = await sendFcmV1ToTokens({ tokens: targetTokens, title, body, data: dataAsStrings })
    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'FCM send error'
    errors.push(msg)
    return { success: false, errors }
  }
}

export async function sendToAdmins(title: string, body: string, data?: Record<string, string>, excludeUserIds?: string[], excludeTokens?: string[]): Promise<SendResult> {
  let tokens = await (excludeUserIds && excludeUserIds.length
    ? getAdminTokensExcept(excludeUserIds)
    : getAdminTokens())
  // Device-level suppression
  if (Array.isArray(excludeTokens) && excludeTokens.length && tokens.length) {
    const ex = new Set(excludeTokens.filter(Boolean))
    tokens = tokens.filter(t => !ex.has(t))
  }
  if (!tokens.length) return { success: false, errors: ['No admin tokens'] }
  return sendFcmV1ToTokens({ tokens, title, body, data })
}

export async function sendToAll(title: string, body: string, data?: Record<string, string>, excludeTokens?: string[]): Promise<SendResult> {
  let tokens = await getAllTokens()
  if (Array.isArray(excludeTokens) && excludeTokens.length && tokens.length) {
    const ex = new Set(excludeTokens.filter(Boolean))
    tokens = tokens.filter(t => !ex.has(t))
  }
  if (!tokens.length) return { success: false, errors: ['No user tokens'] }

  // Use Google FCM HTTP v1 directly to avoid requiring Admin SDK configuration on serverless
  try {
    const result = await sendFcmV1ToTokens({ tokens, title, body, data })
    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'FCM v1 broadcast error'
    return { success: false, errors: [msg] }
  }
}

// --------------------- Google FCM HTTP v1 helpers (no Admin SDK) ---------------------

type FcmV1SinglePayload = {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

function buildFcmV1Message({ token, title, body, data }: FcmV1SinglePayload) {
  const sanitized: Record<string, string> = {}
  if (data) {
    for (const [k, v] of Object.entries(data)) sanitized[k] = String(v)
  }
  // Important: send data-only for Web to avoid Chrome auto-showing a duplicate notification.
  // We include title/body in data; our Service Worker (sw.js) will render exactly one notification.
  if (!sanitized.title) sanitized.title = String(title)
  if (!sanitized.body) sanitized.body = String(body)
  return {
    message: {
      token,
      data: sanitized,
      // Ensure high priority delivery across platforms
      webpush: {
        headers: {
          TTL: '604800',
          // Web Push delivery urgency hint: very-low | low | normal | high
          Urgency: 'high',
        },
      },
      android: {
        priority: 'HIGH',
        notification: {
          title,
          body,
        },
      },
    },
  }
}

type AccessTokenShape = string | { token?: string } | null

async function getAccessToken(): Promise<string> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const auth = json
    ? new GoogleAuth({ credentials: JSON.parse(json), scopes: ['https://www.googleapis.com/auth/firebase.messaging'] })
    : new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/firebase.messaging'] })
  const client = await auth.getClient()
  const token = (await client.getAccessToken()) as AccessTokenShape
  if (typeof token === 'string') return token
  if (token && typeof token === 'object' && typeof token.token === 'string') return token.token
  throw new Error('Unable to acquire Google OAuth2 access token')
}

async function sendFcmV1(token: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
  const projectId = process.env.PROJECT_ID || (() => {
    try {
      const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      if (json) return JSON.parse(json)?.project_id as string | undefined
      return undefined
    } catch {
      return undefined
    }
  })()
  if (!projectId) throw new Error('PROJECT_ID not configured')
  const accessToken = await getAccessToken()
  const payload = buildFcmV1Message({ token, title, body, data })
  const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    // Try to extract helpful error info from FCM
    let details = ''
    try {
      const text = await resp.text()
      try {
        const json = JSON.parse(text)
        const status = json?.error?.status
        const message = json?.error?.message
        const code = Array.isArray(json?.error?.details) && json.error.details[0]?.errorCode
        details = `status=${resp.status} ${status || ''} code=${code || ''} message=${message || text}`.trim()
      } catch {
        details = `status=${resp.status} message=${text}`
      }
    } catch {
      details = `status=${resp.status}`
    }
    throw new Error(`FCM send failed: ${details}`)
  }
  return true
}

async function sendFcmV1ToTokens({ tokens, title, body, data }: { tokens: string[]; title: string; body: string; data?: Record<string, string> }): Promise<SendResult> {
  const settled = await Promise.allSettled(tokens.map(t => sendFcmV1(t, title, body, data)))
  let sent = 0
  let failed = 0
  const errors: string[] = []
  const invalidTokens: string[] = []
  
  settled.forEach((r, idx) => {
    if (r.status === 'fulfilled' && r.value) {
      sent += 1
    } else {
      failed += 1
      const reason = r.status === 'rejected' ? (r.reason?.message || String(r.reason)) : 'send failed'
      errors.push(`${tokens[idx]}: ${reason}`)
      
      // Check if this is an invalid token error
      if (reason.includes('UNREGISTERED') || reason.includes('NotRegistered') || reason.includes('NOT_FOUND')) {
        invalidTokens.push(tokens[idx])
      }
    }
  })
  
  // Clean up invalid tokens from database
  if (invalidTokens.length > 0) {
    try {
      await cleanupInvalidTokens(invalidTokens)
      console.log(`Cleaned up ${invalidTokens.length} invalid FCM tokens`)
    } catch (error) {
      console.error('Failed to cleanup invalid tokens:', error)
    }
  }
  
  return { success: failed === 0, sent, failed, errors: errors.length ? errors : undefined }
}

async function cleanupInvalidTokens(invalidTokens: string[]): Promise<void> {
  if (!invalidTokens.length) return
  
  // Remove invalid tokens from all users
  const query = `*[_type=="user" && defined(fcmTokens) && count(fcmTokens[@ in $invalidTokens]) > 0]{
    _id,
    fcmTokens
  }`
  
  const users = await sanityClient.fetch(query, { invalidTokens })
  
  for (const user of users || []) {
    const validTokens = (user.fcmTokens || []).filter(token => !invalidTokens.includes(token))
    await sanityClient
      .patch(user._id)
      .set({ fcmTokens: validTokens.length > 0 ? validTokens : null })
      .commit()
  }
}
