export type OfferAudience = 'all' | 'selected_groups' | 'selected_categories' | 'selected_customers'

export type OfferNotificationChannel = 'fcm' | 'in_app' | 'email'

export type OfferNotificationStatus = 'pending' | 'sent' | 'skipped' | 'failed'

export interface OfferNotificationLog {
  _id: string
  _type: 'offerNotificationLog'
  offerId: string
  customerId: string
  channel: OfferNotificationChannel
  status: OfferNotificationStatus
  messageId?: string
  sentAt?: string
  errorMessage?: string
  retryCount: number
  createdAt: string
}

export interface OfferNotificationResult {
  offerId: string
  totalCustomers: number
  notified: number
  skipped: number
  failed: number
  channels: OfferNotificationChannel[]
  errors?: string[]
}

export interface ProcessOfferNotificationInput {
  offerId: string
  channels?: OfferNotificationChannel[]
}
