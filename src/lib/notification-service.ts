import { sanityClient } from '@/lib/sanity'
import { getAdminMessaging } from './firebase-admin'

export type SendPayload = {
  title: string
  body: string
  data?: Record<string, string>
  tokens?: string[]
  userIds?: string[]
  sound?: 'default' | string
}

async function getTokensForUsers(userIds: string[]): Promise<string[]> {
  if (!userIds?.length) return []
  const query = `*[_type=="user" && _id in $ids]{ fcmTokens }`
  const docs = await sanityClient.fetch<{ fcmTokens?: string[] }[]>(query, { ids: userIds })
  const tokens = new Set<string>()
  for (const d of docs) {
    for (const t of d?.fcmTokens || []) if (t) tokens.add(t)
  }
  return Array.from(tokens)
}

export async function sendNotification(payload: SendPayload) {
  const messaging = getAdminMessaging()

  const tokensFromUsers = payload.userIds?.length
    ? await getTokensForUsers(payload.userIds)
    : []
  const tokens = Array.from(new Set([...(payload.tokens || []), ...tokensFromUsers]))
  if (!tokens.length) return { success: false, error: 'No tokens to send' }

  const message = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    android: payload.sound
      ? { notification: { sound: payload.sound } }
      : undefined,
    apns: undefined, // Web Safari PWA custom sounds are not supported
    webpush: {
      headers: {
        Urgency: 'normal',
      },
      // Pass data.url etc. to SW
      fcmOptions: {},
    },
  } as any

  const res = await messaging.sendEachForMulticast(message)

  // Optionally prune invalid tokens
  const invalid: string[] = []
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = (r.error as any)?.errorInfo?.code || r.error?.code
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalid.push(tokens[i])
      }
    }
  })
  if (invalid.length) {
    await sanityClient.patch({ query: `*[_type=="user" && defined(fcmTokens)][]._id` })
      .unset(invalid.map((t) => `fcmTokens[@ == "${t}"]`))
      .commit()
      .catch(() => {})
  }

  return { success: true, counts: { success: res.successCount, failure: res.failureCount } }
}

export async function sendToAdmins(title: string, body: string, data?: Record<string, string>) {
  const ids = await sanityClient.fetch<string[]>(
    `*[_type=="user" && role=="admin" && count(fcmTokens) > 0]._id`
  )
  if (!ids?.length) return { success: false, error: 'No admin tokens' }
  return sendNotification({ title, body, data, userIds: ids })
}
