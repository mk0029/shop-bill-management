import 'server-only'
import { sanityClient } from './sanity'
import { GoogleAuth } from 'google-auth-library'

export type SendPayload = {
  title: string
  body: string
  data?: Record<string, string>
  tokens?: string[]
  userIds?: string[]
  sound?: 'default' | string
}

type SendResult = {
  success: boolean
  sent?: number
  failed?: number
  errors?: string[]
}

type UserWithTokens = { fcmTokens?: string[] | null }

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

export async function sendNotification(payload: SendPayload): Promise<SendResult> {
  const errors: string[] = []
  try {
    const { title, body, data, tokens: directTokens, userIds } = payload
    if (!title || !body) return { success: false, errors: ['Missing title/body'] }

    let targetTokens: string[] = []
    if (Array.isArray(directTokens) && directTokens.length) {
      targetTokens = directTokens
    } else if (Array.isArray(userIds) && userIds.length) {
      targetTokens = await getTokensForUserIds(userIds)
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

export async function sendToAdmins(title: string, body: string, data?: Record<string, string>, excludeUserIds?: string[]): Promise<SendResult> {
  const tokens = await (excludeUserIds && excludeUserIds.length
    ? getAdminTokensExcept(excludeUserIds)
    : getAdminTokens())
  if (!tokens.length) return { success: false, errors: ['No admin tokens'] }
  return sendFcmV1ToTokens({ tokens, title, body, data })
}

export async function sendToAll(title: string, body: string, data?: Record<string, string>): Promise<SendResult> {
  const tokens = await getAllTokens()
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
  return {
    message: {
      token,
      notification: { title, body },
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
  settled.forEach((r, idx) => {
    if (r.status === 'fulfilled' && r.value) {
      sent += 1
    } else {
      failed += 1
      const reason = r.status === 'rejected' ? (r.reason?.message || String(r.reason)) : 'send failed'
      errors.push(`${tokens[idx]}: ${reason}`)
    }
  })
  return { success: failed === 0, sent, failed, errors: errors.length ? errors : undefined }
}
