export type OfferType = 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_item' | 'custom'
export type OfferStatus = 'active' | 'inactive'
export type ComputedOfferStatus = 'scheduled' | 'active' | 'expired'
export type ClaimStatus = 'claimed' | 'used' | 'expired' | 'cancelled'

export function getComputedOfferStatus(startAt: string, endAt: string): ComputedOfferStatus {
  const now = Date.now()
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  if (now < start) return 'scheduled'
  if (now > end) return 'expired'
  return 'active'
}

export interface Offer {
  _id: string
  title: string
  description?: string
  offerType: OfferType
  discountValue?: number
  products: Array<Record<string, unknown>>
  startAt: string
  endAt: string
  status: OfferStatus
  maxClaims: number
  maxClaimsPerUser: number
  currentClaimCount: number
  minimumOrderAmount: number
  minimumQuantity: number
  terms?: string
  createdBy?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  audience?: 'all' | 'selected_groups' | 'selected_categories' | 'selected_customers'
  targetCustomerIds?: string[]
  targetCustomerGroups?: string[]
  sendPushNotification?: boolean
}

export interface OfferWithProduct extends Omit<Offer, 'products'> {
  products: Array<{
    _ref?: string
    _id?: string
    _type?: string
    name?: string
    slug?: { current: string }
    brand?: string
    category?: { _id?: string; name?: string; slug?: { current: string } }
    pricing?: { sellingPrice: number; mrp?: number; unit: string }
    product?: {
      _id: string
      name: string
      slug?: { current: string }
      brand?: string
      images?: Array<{ _key?: string }>
      pricing?: { sellingPrice: number; mrp?: number; unit: string }
    }
  }>
  productNames?: string[]
}

export interface OfferClaim {
  _id: string
  offer: Record<string, unknown>
  offerId: string
  customer: Record<string, unknown>
  customerId: string
  productIds?: string[]
  claimedAt: string
  status: ClaimStatus
  usedAt?: string
  cancelledAt?: string
  cancelledBy?: Record<string, unknown>
  cancelReason?: string
  createdAt: string
  updatedAt: string
  offerTitle?: string
  offerType?: string
  discountValue?: number
  productNames?: string[]
  customerName?: string
  customerPhone?: string
}

export interface CreateOfferInput {
  title: string
  description?: string
  offerType: OfferType
  discountValue?: number
  productIds: string[]
  productTypes?: string[]
  startAt: string
  endAt: string
  status?: OfferStatus
  maxClaims?: number
  maxClaimsPerUser?: number
  minimumOrderAmount?: number
  minimumQuantity?: number
  terms?: string
  audience?: 'all' | 'selected_groups' | 'selected_categories' | 'selected_customers'
  targetCustomerIds?: string[]
  targetCustomerGroups?: string[]
  sendPushNotification?: boolean
}

export interface UpdateOfferInput extends Partial<CreateOfferInput> {
  currentClaimCount?: number
}
