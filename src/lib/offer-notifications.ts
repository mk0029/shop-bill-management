import 'server-only'
import { sanityClient } from './sanity'
import { getActiveTokenStringsForUsers } from './fcm/tokens.server'
import { GoogleAuth } from 'google-auth-library'

const FCM_FAILURE_LOG_TYPE = 'fcm_offer_failure'

function getGoogleAuth(): GoogleAuth {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (json) {
    const credentials = JSON.parse(json)
    return new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })
  }
  return new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  })
}

async function getAccessToken(auth: GoogleAuth): Promise<string> {
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  if (typeof token === 'string') return token
  if (token && typeof token === 'object' && (token as { token?: string }).token) return (token as { token: string }).token
  throw new Error('Unable to acquire Google OAuth2 access token')
}

function buildFcmV1Message({
  token,
  title,
  body,
  data,
}: {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}) {
  return {
    message: {
      token,
      notification: { title, body },
      data: data || {},
    },
  }
}

async function sendFcmToSingleToken(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const projectId = process.env.PROJECT_ID || (() => {
    try {
      const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      if (json) return JSON.parse(json)?.project_id as string | undefined
      return undefined
    } catch {
      return undefined
    }
  })()

  if (!projectId) return

  const auth = getGoogleAuth()
  const accessToken = await getAccessToken(auth)

  const payload = buildFcmV1Message({ token, title, body, data })
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const json = await resp.json().catch(() => ({}))
    throw new Error(`FCM send failed: ${resp.status} ${JSON.stringify(json)}`)
  }
}

async function logFcmFailure(
  context: string,
  offerId: string,
  error: string,
  userId?: string,
) {
  try {
    await sanityClient.create({
      _type: 'notification',
      title: `FCM Failure: ${context}`,
      body: error,
      type: FCM_FAILURE_LOG_TYPE,
      message: `Failed to send FCM for offer ${offerId}: ${error}`,
      time: new Date().toISOString(),
      audience: 'admins',
      targetUserIds: userId ? [userId] : [],
      data: {
        route: '/admin/offers',
        message: error,
        extra: {
          target: 'admin',
          title: 'FCM Offer Notification Failure',
          body: error,
        },
      },
      createdAt: new Date().toISOString(),
    })
  } catch {
    console.error('[OfferFCM] Failed to log FCM failure:', error)
  }
}

export async function sendNewOfferNotification(
  offerId: string,
  offerTitle: string,
  productNames: string[],
): Promise<void> {
  try {
    const productName = productNames[0] || 'products'
    const title = 'New Offer Available'
    const body = `Special offer available on ${productName}. Claim it before it expires.`

    const customers = await sanityClient.fetch<Array<{ _id: string }>>(
      `*[_type == "user" && role == "customer" && isActive == true]._id`,
    )

    if (!customers.length) return

    const customerIds = customers.map((c) => c._id)
    const tokens = await getActiveTokenStringsForUsers(customerIds)

    if (!tokens.length) return

    const data: Record<string, string> = {
      type: 'offer_new',
      offerId,
      route: '/customer/offers',
    }

    await Promise.allSettled(
      tokens.map((token) =>
        sendFcmToSingleToken(token, title, body, data).catch((err) => {
          const msg = err instanceof Error ? err.message : 'Unknown FCM error'
          return logFcmFailure('NEW_OFFER', offerId, msg)
        }),
      ),
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logFcmFailure('NEW_OFFER_BATCH', offerId, msg)
  }
}

export async function sendClaimSuccessNotification(
  customerId: string,
  offerId: string,
  offerTitle: string,
  productNames: string[],
): Promise<void> {
  try {
    const productName = productNames[0] || 'product'
    const title = 'Offer Claimed Successfully'
    const body = `Your offer on ${productName} has been claimed successfully.`

    const tokens = await getActiveTokenStringsForUsers([customerId])

    if (!tokens.length) return

    const data: Record<string, string> = {
      type: 'offer_claimed',
      offerId,
      route: '/customer/offers/claims',
    }

    await Promise.allSettled(
      tokens.map((token) =>
        sendFcmToSingleToken(token, title, body, data).catch((err) => {
          const msg = err instanceof Error ? err.message : 'Unknown FCM error'
          return logFcmFailure('CLAIM_SUCCESS', offerId, msg, customerId)
        }),
      ),
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logFcmFailure('CLAIM_SUCCESS_BATCH', offerId, msg, customerId)
  }
}
