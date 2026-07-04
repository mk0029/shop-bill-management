export type OfferType = 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_item' | 'custom'
export type OfferStatus = 'active' | 'inactive'
export type ClaimStatus = 'claimed' | 'used' | 'expired' | 'cancelled'

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
}

export interface UpdateOfferInput extends Partial<CreateOfferInput> {
  currentClaimCount?: number
}
