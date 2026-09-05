import 'server-only'
import { sanityClient } from '@/lib/sanity'
import { getSanityClient } from '@/lib/sanity/client-factory'
import { createDocument, updateDocument } from '@/lib/sanity/write-router'
import { createAndDispatchNotification } from './notification-events.server'
import type { Offer } from '@/types/offers'
import type { OfferNotificationChannel, OfferNotificationResult } from '@/types/offer-notifications'

type OfferDoc = Offer & {
  audience?: 'all' | 'selected_groups' | 'selected_categories' | 'selected_customers'
  targetCustomerIds?: string[]
  targetCustomerGroups?: string[]
  sendPushNotification?: boolean
}

function isOfferActive(offer: OfferDoc): boolean {
  if (offer.status !== 'active') return false
  const now = Date.now()
  const start = new Date(offer.startAt).getTime()
  const end = new Date(offer.endAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return false
  return now >= start && now <= end
}

async function getEligibleCustomerIds(offer: OfferDoc): Promise<string[]> {
  const audience = offer.audience || 'all'

  if (audience === 'selected_customers') {
    const ids = (offer.targetCustomerIds || []).filter(Boolean)
    if (!ids.length) return []
    const valid = await sanityClient.fetch<string[]>(
      `*[_type=="user" && _id in $ids && role=="customer" && isActive != false]._id`,
      { ids },
    )
    return valid || []
  }

  if (audience === 'selected_groups') {
    const groups = (offer.targetCustomerGroups || []).filter(Boolean)
    if (!groups.length) return []
    return sanityClient.fetch<string[]>(
      `*[_type=="user" && role=="customer" && isActive != false && customerGroup in $groups]._id`,
      { groups },
    )
  }

  if (audience === 'selected_categories') {
    return sanityClient.fetch<string[]>(
      `*[_type=="user" && role=="customer" && isActive != false]._id`,
    )
  }

  return sanityClient.fetch<string[]>(
    `*[_type=="user" && role=="customer" && isActive != false]._id`,
  )
}

async function ensureNotificationLog(
  offerId: string,
  customerId: string,
  channel: string,
): Promise<{ created: boolean; logId: string }> {
  const createdAt = new Date().toISOString()
  const docId = `offerNLog.${offerId}.${customerId}.${channel}`
  try {
    const { _id, ...doc } = {
      _id: docId,
      _type: 'offerNotificationLog' as const,
      offerId,
      customerId,
      channel,
      status: 'pending',
      createdAt,
    }
    const result = await createDocument(doc as unknown as Record<string, unknown>, 'notifications', {
      documentId: _id,
    })
    if (!result.success) {
      throw new Error(result.error || 'Log create failed')
    }
    return { created: true, logId: docId }
  } catch {
    return { created: false, logId: docId }
  }
}

async function markNotificationLogResult(
  logId: string,
  status: 'sent' | 'skipped' | 'failed',
  details?: { messageId?: string; error?: string },
) {
  const patch: Record<string, unknown> = {
    status,
    sentAt: status === 'sent' ? new Date().toISOString() : undefined,
  }
  if (details?.messageId) patch.messageId = details.messageId
  if (details?.error) patch.errorMessage = details.error?.slice(0, 1000)
  await updateDocument(logId, patch, 'notifications').catch(() => {})
}

async function fetchOffer(offerId: string): Promise<OfferDoc | null> {
  const offer =
    (await getSanityClient('offers')
      .fetch<OfferDoc | null>(`*[_type=="offer" && _id==$offerId][0]`, { offerId })
      .catch(() => null)) ||
    (await sanityClient
      .fetch<OfferDoc | null>(`*[_type=="offer" && _id==$offerId][0]`, { offerId })
      .catch(() => null))
  return offer
}

export async function processOfferLiveNotification(
  offerId: string,
  options?: { channels?: OfferNotificationChannel[] },
): Promise<OfferNotificationResult> {
  const channels = options?.channels || ['fcm', 'in_app']
  const result: OfferNotificationResult = {
    offerId,
    totalCustomers: 0,
    notified: 0,
    skipped: 0,
    failed: 0,
    channels,
  }

  const offer = await fetchOffer(offerId)
  if (!offer) {
    result.errors = ['Offer not found']
    return result
  }
  if (!isOfferActive(offer)) {
    result.errors = ['Offer is not currently live']
    return result
  }
  if (offer.sendPushNotification === false) {
    result.errors = ['Push notification disabled for this offer']
    return result
  }

  const customerIds = await getEligibleCustomerIds(offer)
  if (!customerIds.length) return result

  result.totalCustomers = customerIds.length

  const BATCH_SIZE = 50
  for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
    const batch = customerIds.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.allSettled(
      batch.map((customerId) => notifyCustomer(customerId, offer, channels)),
    )
    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        result.notified += r.value.notified
        result.skipped += r.value.skipped
        result.failed += r.value.failed
      } else {
        result.failed++
      }
    }
  }

  return result
}

async function notifyCustomer(
  customerId: string,
  offer: OfferDoc,
  channels: OfferNotificationChannel[],
): Promise<{ notified: number; skipped: number; failed: number }> {
  let notified = 0
  let skipped = 0
  let failed = 0

  for (const channel of channels) {
    const log = await ensureNotificationLog(offer._id, customerId, channel)
    if (!log.created) {
      skipped++
      continue
    }

    if (channel === 'fcm' || channel === 'in_app') {
      try {
        const mainTitle = '🎉 New Offer is Live!'
        const mainBody = `${offer.title} is now live! Don't miss out\u2014grab this exclusive offer before it expires.`
        const result = await createAndDispatchNotification({
          type: 'offer_live',
          userId: customerId,
          title: mainTitle,
          body: mainBody,
          data: {
            type: 'offer_live',
            offerId: offer._id,
            route: `/offers/${offer._id}`,
            link: `/offers/${offer._id}`,
          },
          dedupeKey: `offer_live:${offer._id}:${customerId}`,
        })

        const messageId = result.notificationId || ''
        const ok = result.ok && result.send.sent > 0
        await markNotificationLogResult(log.logId, ok ? 'sent' : 'failed', {
          messageId,
          error: ok ? undefined : result.send.errors?.[0],
        })
        if (ok) notified++
        else failed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await markNotificationLogResult(log.logId, 'failed', { error: msg })
        failed++
      }
    }
  }

  return { notified, skipped, failed }
}

export async function forceNotifySingleCustomer(
  customerId: string,
  offerId: string,
): Promise<boolean> {
  const offer = await fetchOffer(offerId)
  if (!offer || !isOfferActive(offer)) return false
  const r = await notifyCustomer(customerId, offer, ['fcm', 'in_app'])
  return r.notified > 0
}
