import { createAndDispatchNotification } from '@/services/notifications/notification-events.server'

export async function sendClaimSuccessNotification(
  customerId: string,
  offerId: string,
  productNames: string[],
): Promise<void> {
  const productName = productNames[0] || 'product'
  await createAndDispatchNotification({
    type: 'offer_claimed',
    userId: customerId,
    title: 'Offer Claimed Successfully',
    body: `Your offer on ${productName} has been claimed successfully.`,
    data: {
      type: 'offer_claimed',
      offerId,
      route: '/customer/offers/claims',
      link: '/customer/offers/claims',
    },
    dedupeKey: `offer_claimed:${offerId}:${customerId}`,
  })
}
