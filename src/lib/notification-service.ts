import 'server-only'
import { sanityClient } from './sanity'
import { getAdminMessaging } from './firebase-admin'
import type { messaging } from 'firebase-admin'

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

export async function sendNotification(payload: SendPayload): Promise<SendResult> {
  const errors: string[] = []
  try {
    const { title, body, data, tokens: directTokens, userIds, sound } = payload
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

    const messaging = getAdminMessaging()
    // FCM requires all data values as strings
    const dataAsStrings: Record<string, string> | undefined = data
      ? Object.fromEntries(Object.entries(data).map(([k, v]) => [String(k), String(v)]))
      : undefined

    const message: messaging.MulticastMessage = {
      notification: { title, body },
      data: dataAsStrings,
      android: { notification: { sound: sound || 'default' } },
      apns: { payload: { aps: { sound: sound || 'default' } } },
      // Ensure longer offline delivery window for browsers via Web Push TTL (in seconds)
      // One week = 7 * 24 * 60 * 60 = 604800 seconds
      webpush: { headers: { TTL: '604800' } },
      tokens: targetTokens,
    }

    const resp = await messaging.sendEachForMulticast(message)
    if (resp.failureCount) {
      resp.responses.forEach((r, idx) => {
        if (!r.success) errors.push(`${targetTokens[idx]}: ${r.error?.message || 'send failed'}`)
      })
    }
    return { success: resp.failureCount === 0, sent: resp.successCount, failed: resp.failureCount, errors: errors.length ? errors : undefined }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'FCM send error'
    errors.push(msg)
    return { success: false, errors }
  }
}

export async function sendToAdmins(title: string, body: string, data?: Record<string, string>): Promise<SendResult> {
  const tokens = await getAdminTokens()
  if (!tokens.length) return { success: false, errors: ['No admin tokens'] }
  return sendNotification({ title, body, data, tokens })
}
