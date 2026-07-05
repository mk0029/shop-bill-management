import 'server-only'
import { sanityClient } from './sanity'
import type { Offer, OfferClaim, OfferWithProduct, CreateOfferInput, UpdateOfferInput, ClaimStatus } from '@/types/offers'

const OFFER_FIELDS = `{
  _id,
  title,
  description,
  offerType,
  discountValue,
  products[]->{ _id, name, slug, brand, images, pricing, category->{ _id, name, slug } },
  startAt,
  endAt,
  status,
  maxClaims,
  maxClaimsPerUser,
  currentClaimCount,
  minimumOrderAmount,
  minimumQuantity,
  terms,
  createdBy->{ _id, name },
  createdAt,
  updatedAt
}`

export async function getActiveOfferForProduct(productId: string): Promise<OfferWithProduct | null> {
  const now = new Date().toISOString()
  const offer = await sanityClient.fetch<OfferWithProduct | null>(
    `*[_type == "offer" && status == "active" && startAt <= $now && endAt >= $now && $productId in products[]._ref] | order(createdAt desc)[0]${OFFER_FIELDS}`,
    { now, productId },
  )
  if (!offer) return null
  if (offer.maxClaims > 0 && offer.currentClaimCount >= offer.maxClaims) return null
  return offer
}

export async function getActiveOffersForProducts(productIds: string[]): Promise<Map<string, OfferWithProduct>> {
  const now = new Date().toISOString()
  const offers = await sanityClient.fetch<OfferWithProduct[]>(
    `*[_type == "offer" && status == "active" && startAt <= $now && endAt >= $now]${OFFER_FIELDS}`,
    { now },
  )
  const map = new Map<string, OfferWithProduct>()
  for (const offer of offers) {
    if (offer.maxClaims > 0 && offer.currentClaimCount >= offer.maxClaims) continue
    for (const productRef of offer.products || []) {
      const pid = typeof productRef === 'object' ? (productRef as { _ref?: string; _id?: string })._ref || (productRef as { _id?: string })._id : productRef
      if (pid && !map.has(pid)) {
        map.set(pid, offer)
      }
    }
  }
  return map
}

export async function canCustomerClaimOffer(
  customerId: string,
  offerId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const offer = await sanityClient.fetch<Offer | null>(
    `*[_type == "offer" && _id == $offerId][0]{
      _id, status, startAt, endAt, maxClaims, maxClaimsPerUser, currentClaimCount
    }`,
    { offerId },
  )

  if (!offer) return { allowed: false, reason: 'Offer not found' }
  if (offer.status !== 'active') return { allowed: false, reason: 'Offer is not active' }

  const now = new Date()
  const startAt = new Date(offer.startAt)
  const endAt = new Date(offer.endAt)

  if (now < startAt) return { allowed: false, reason: 'Offer has not started yet' }
  if (now > endAt) return { allowed: false, reason: 'Offer has expired' }

  if (offer.maxClaims > 0 && offer.currentClaimCount >= offer.maxClaims) {
    return { allowed: false, reason: 'Offer claim limit has been reached' }
  }

  const existingClaims = await sanityClient.fetch<number>(
    `count(*[_type == "offerClaim" && offerId == $offerId && customerId == $customerId && status != "cancelled"])`,
    { offerId, customerId },
  )

  if (offer.maxClaimsPerUser > 0 && existingClaims >= offer.maxClaimsPerUser) {
    return { allowed: false, reason: 'You have already claimed this offer the maximum number of times' }
  }

  return { allowed: true }
}

export async function claimOffer(
  customerId: string,
  userId: string,
  offerId: string,
): Promise<{ success: boolean; claim?: OfferClaim; reason?: string }> {
  const check = await canCustomerClaimOffer(customerId, offerId)
  if (!check.allowed) return { success: false, reason: check.reason }

  const offer = await sanityClient.fetch<Offer>(
    `*[_type == "offer" && _id == $offerId][0]{
      _id,
      title,
      offerType,
      discountValue,
      products[]->{ _id },
      maxClaims,
      currentClaimCount
    }`,
    { offerId },
  )

  if (!offer) return { success: false, reason: 'Offer not found' }

  const productIds: string[] = Array.from(
    new Set(
      (offer.products || []).map((p: unknown) => {
        const ref = p as { _id?: string; _ref?: string }
        return ref._id || ref._ref || ''
      }).filter(Boolean),
    ),
  )

  const existingClaim = await sanityClient.fetch<OfferClaim | null>(
    `*[_type == "offerClaim" && offerId == $offerId && customerId == $customerId && status == "claimed"][0]{_id}`,
    { offerId, customerId },
  )
  if (existingClaim) {
    return { success: false, reason: 'You have already claimed this offer' }
  }

  if (offer.maxClaims > 0) {
    const currentCount = await sanityClient.fetch<number>(
      `count(*[_type == "offerClaim" && offerId == $offerId && status != "cancelled"])`,
      { offerId },
    )
    if (currentCount >= offer.maxClaims) {
      return { success: false, reason: 'Offer claim limit has been reached' }
    }
  }

  const now = new Date().toISOString()
  const claim = await sanityClient.create({
    _type: 'offerClaim',
    offer: { _type: 'reference', _ref: offerId },
    offerId,
    customer: { _type: 'reference', _ref: userId },
    customerId,
    productIds,
    claimedAt: now,
    status: 'claimed',
    createdAt: now,
    updatedAt: now,
  }) as unknown as OfferClaim

  await sanityClient
    .patch(offerId)
    .inc({ currentClaimCount: 1 })
    .set({ updatedAt: now })
    .commit()

  return { success: true, claim }
}

export async function getAllActiveOffers(): Promise<OfferWithProduct[]> {
  const now = new Date().toISOString()
  const offers = await sanityClient.fetch<OfferWithProduct[]>(
    `*[_type == "offer" && status == "active" && endAt >= $now] | order(createdAt desc)${OFFER_FIELDS}`,
    { now },
  )
  return offers.filter((o) => {
    if (o.maxClaims > 0 && o.currentClaimCount >= o.maxClaims) return false
    return true
  })
}

export async function getCustomerOffers(customerId: string): Promise<OfferWithProduct[]> {
  const claims = await sanityClient.fetch<Array<{ offerId: string }>>(
    `*[_type == "offerClaim" && customerId == $customerId && status != "cancelled"]{offerId}`,
    { customerId },
  )
  if (!claims.length) return []
  const offerIds = [...new Set(claims.map((c) => c.offerId))]
  const now = new Date().toISOString()
  const offers = await sanityClient.fetch<OfferWithProduct[]>(
    `*[_type == "offer" && _id in $offerIds] | order(createdAt desc)${OFFER_FIELDS}`,
    { offerIds, now },
  )
  return offers
}

export async function getCustomerClaims(customerId: string): Promise<OfferClaim[]> {
  const claims = await sanityClient.fetch<OfferClaim[]>(
    `*[_type == "offerClaim" && customerId == $customerId] | order(claimedAt desc){
      _id,
      offerId,
      customerId,
      productIds,
      claimedAt,
      status,
      usedAt,
      cancelledAt,
      cancelReason,
      createdAt,
      updatedAt,
      "offerTitle": *[_type=="offer" && _id==^.offerId][0].title,
      "offerType": *[_type=="offer" && _id==^.offerId][0].offerType,
      "discountValue": *[_type=="offer" && _id==^.offerId][0].discountValue,
      "productNames": *[_type=="offer" && _id==^.offerId][0].products[]->name
    }`,
    { customerId },
  )
  return claims
}

export async function validateOfferInput(input: CreateOfferInput): Promise<string | null> {
  if (!input.title || input.title.trim().length < 2) return 'Title is required (min 2 chars)'
  if (!input.offerType) return 'Offer type is required'
  if (!input.productIds || input.productIds.length === 0) return 'At least one product is required'
  if (!input.startAt) return 'Start date is required'
  if (!input.endAt) return 'End date is required'
  if (new Date(input.endAt).getTime() <= new Date(input.startAt).getTime()) {
    return 'End date must be after start date'
  }
  if (input.offerType === 'percentage' && (input.discountValue == null || input.discountValue < 0 || input.discountValue > 100)) {
    return 'Percentage discount must be between 0 and 100'
  }
  if (input.offerType === 'fixed_amount' && (input.discountValue == null || input.discountValue < 0)) {
    return 'Fixed discount value must be non-negative'
  }
  return null
}

async function getValidShopProductIds(productIds: string[]): Promise<{
  validIds: string[]
  missingIds: string[]
}> {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)))
  if (uniqueIds.length === 0) return { validIds: [], missingIds: [] }

  const existingIds = await sanityClient.fetch<string[]>(
    `*[_type == "shopProduct" && _id in $productIds]._id`,
    { productIds: uniqueIds },
  )
  const existingSet = new Set(existingIds)

  return {
    validIds: uniqueIds.filter((id) => existingSet.has(id)),
    missingIds: uniqueIds.filter((id) => !existingSet.has(id)),
  }
}

async function hasSanityUser(userId: string): Promise<boolean> {
  if (!userId) return false
  const count = await sanityClient.fetch<number>(
    `count(*[_type == "user" && _id == $userId])`,
    { userId },
  )
  return count > 0
}

async function offerHasInvalidCreatedBy(offerId: string): Promise<boolean> {
  const current = await sanityClient.fetch<{ createdByRef?: string } | null>(
    `*[_type == "offer" && _id == $offerId][0]{"createdByRef": createdBy._ref}`,
    { offerId },
  )
  if (!current?.createdByRef) return false
  return !(await hasSanityUser(current.createdByRef))
}
export async function createOffer(
  input: CreateOfferInput,
  createdByUserId: string,
): Promise<{ success: boolean; offer?: Offer; error?: string }> {
  const validationError = await validateOfferInput(input)
  if (validationError) return { success: false, error: validationError }

  const now = new Date().toISOString()
  const { validIds, missingIds } = await getValidShopProductIds(input.productIds || [])
  if (validIds.length === 0) {
    return { success: false, error: 'Select at least one available product for this offer' }
  }
  if (missingIds.length > 0) {
    return {
      success: false,
      error: `Some selected products no longer exist: ${missingIds.join(', ')}`,
    }
  }

  const products = validIds.map((id) => ({
    _type: 'reference',
    _ref: id,
    _weak: false,
  }))

  const offer = await sanityClient.create({
    _type: 'offer',
    title: input.title.trim(),
    description: input.description?.trim() || '',
    offerType: input.offerType,
    discountValue: input.discountValue ?? 0,
    products,
    startAt: input.startAt,
    endAt: input.endAt,
    status: input.status || 'active',
    maxClaims: input.maxClaims ?? 0,
    maxClaimsPerUser: input.maxClaimsPerUser ?? 1,
    minimumOrderAmount: input.minimumOrderAmount ?? 0,
    minimumQuantity: input.minimumQuantity ?? 0,
    terms: input.terms?.trim() || '',
    createdBy: { _type: 'reference', _ref: createdByUserId, _weak: true },
    createdAt: now,
    updatedAt: now,
  }) as unknown as Offer

  return { success: true, offer }
}

export async function updateOffer(
  offerId: string,
  input: UpdateOfferInput,
): Promise<{ success: boolean; offer?: Offer; error?: string }> {
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }

  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.description !== undefined) patch.description = input.description.trim()
  if (input.offerType !== undefined) patch.offerType = input.offerType
  if (input.discountValue !== undefined) patch.discountValue = input.discountValue
  if (input.productIds !== undefined) {
    const { validIds, missingIds } = await getValidShopProductIds(input.productIds)
    if (validIds.length === 0) {
      return { success: false, error: 'Select at least one available product for this offer' }
    }
    if (missingIds.length > 0) {
      return {
        success: false,
        error: `Some selected products no longer exist: ${missingIds.join(', ')}`,
      }
    }

    patch.products = validIds.map((id) => ({
      _type: 'reference',
      _ref: id,
    }))
  }
  if (input.startAt !== undefined) patch.startAt = input.startAt
  if (input.endAt !== undefined) patch.endAt = input.endAt
  if (input.status !== undefined) patch.status = input.status
  if (input.maxClaims !== undefined) patch.maxClaims = input.maxClaims
  if (input.maxClaimsPerUser !== undefined) patch.maxClaimsPerUser = input.maxClaimsPerUser
  if (input.minimumOrderAmount !== undefined) patch.minimumOrderAmount = input.minimumOrderAmount
  if (input.minimumQuantity !== undefined) patch.minimumQuantity = input.minimumQuantity
  if (input.terms !== undefined) patch.terms = input.terms.trim()
  if (input.currentClaimCount !== undefined) patch.currentClaimCount = input.currentClaimCount

  let offerPatch = sanityClient.patch(offerId).set(patch)
  if (await offerHasInvalidCreatedBy(offerId)) {
    offerPatch = offerPatch.unset(['createdBy'])
  }

  const offer = await offerPatch.commit() as unknown as Offer
  return { success: true, offer }
}

export async function deleteOffer(offerId: string): Promise<{ success: boolean; error?: string }> {
  await sanityClient.delete(offerId)
  return { success: true }
}

export async function getAdminOffers(filters?: {
  status?: string
  search?: string
}): Promise<OfferWithProduct[]> {
  let filter = '_type == "offer"'
  const params: Record<string, unknown> = {}

  if (filters?.status) {
    const now = new Date().toISOString()
    if (filters.status === 'active') {
      filter += ' && status == "active" && startAt <= $now && endAt >= $now'
      params.now = now
    } else if (filters.status === 'inactive') {
      filter += ' && status == "inactive"'
    } else if (filters.status === 'expired') {
      filter += ' && status == "active" && endAt < $now'
      params.now = now
    } else if (filters.status === 'scheduled') {
      filter += ' && status == "active" && startAt > $now'
      params.now = now
    }
  }

  if (filters?.search) {
    filter += ' && title match $search'
    params.search = `*${filters.search}*`
  }

  return sanityClient.fetch<OfferWithProduct[]>(
    `*[${filter}] | order(createdAt desc)${OFFER_FIELDS}`,
    params,
  )
}

export async function getAdminOfferById(offerId: string): Promise<OfferWithProduct | null> {
  return sanityClient.fetch<OfferWithProduct | null>(
    `*[_type == "offer" && _id == $offerId][0]${OFFER_FIELDS}`,
    { offerId },
  )
}

export async function getAdminOfferClaims(offerId: string): Promise<OfferClaim[]> {
  return sanityClient.fetch<OfferClaim[]>(
    `*[_type == "offerClaim" && offerId == $offerId] | order(claimedAt desc){
      _id,
      offerId,
      customer,
      customerId,
      productIds,
      claimedAt,
      status,
      usedAt,
      cancelledAt,
      cancelReason,
      createdAt,
      updatedAt,
      "customerName": *[_type=="user" && _id==^.customer._ref][0].name,
      "customerPhone": *[_type=="user" && _id==^.customer._ref][0].phone
    }`,
    { offerId },
  )
}

export async function getOfferStats(): Promise<{
  total: number
  active: number
  expired: number
  inactive: number
  totalClaims: number
}> {
  const now = new Date().toISOString()
  const [total, activeCount, expiredCount, inactiveCount, totalClaims] = await Promise.all([
    sanityClient.fetch<number>(`count(*[_type == "offer"])`),
    sanityClient.fetch<number>(`count(*[_type == "offer" && status == "active" && startAt <= $now && endAt >= $now])`, { now }),
    sanityClient.fetch<number>(`count(*[_type == "offer" && status == "active" && endAt < $now])`, { now }),
    sanityClient.fetch<number>(`count(*[_type == "offer" && status == "inactive"])`),
    sanityClient.fetch<number>(`count(*[_type == "offerClaim" && status == "claimed"])`),
  ])
  return { total, active: activeCount, expired: expiredCount, inactive: inactiveCount, totalClaims }
}

export async function cancelClaim(
  claimId: string,
  cancelledByUserId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString()
  await sanityClient
    .patch(claimId)
    .set({
      status: 'cancelled',
      cancelledAt: now,
      cancelledBy: { _type: 'reference', _ref: cancelledByUserId },
      cancelReason: reason || '',
      updatedAt: now,
    })
    .commit()
  return { success: true }
}
