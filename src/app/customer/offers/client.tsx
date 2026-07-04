"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Tag,
  Loader2,
  Gift,
  Percent,
  IndianRupee,
  Clock,
  LogIn,
  Timer,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { BaseGlassModal } from "@/components/ui/base-glass-modal"
import { useAuthStore } from "@/store/auth-store"
import { useRouter } from "next/navigation"
import type { OfferWithProduct, OfferType } from "@/types/offers"
import { sanityClient } from "@/lib/sanity"

const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  percentage: "Percentage Discount",
  fixed_amount: "Fixed Amount Discount",
  buy_x_get_y: "Buy X Get Y",
  free_item: "Free Item",
  custom: "Custom Offer",
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function getPrimaryProductHref() {
  return "/customer/purchase"
}

function useLiveTimer() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return tick
}

function TimeDisplay({ startAt, endAt }: { startAt: string; endAt: string }) {
  useLiveTimer()

  const now = Date.now()
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()

  if (now < start) {
    const diff = start - now
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return (
      <span className="flex items-center gap-1 text-amber-400">
        <Timer className="h-3 w-3" />
        Starts in {d}d {h}h {m}m {s}s
      </span>
    )
  }

  if (now > end) {
    return (
      <span className="flex items-center gap-1 text-red-400">
        <Clock className="h-3 w-3" />
        Expired
      </span>
    )
  }

  const diff = end - now
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return (
    <span className="flex items-center gap-1 text-emerald-400">
      <Timer className="h-3 w-3" />
      {d > 0 ? `${d}d ` : ""}{h}h {m}m {s}s left
    </span>
  )
}

export function CustomerOffersClient() {
  const { isAuthenticated, role } = useAuthStore()
  const router = useRouter()
  const [offers, setOffers] = useState<OfferWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [missedOffer, setMissedOffer] = useState<OfferWithProduct | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [productListOffer, setProductListOffer] = useState<OfferWithProduct | null>(null)

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/offers/active")
      const data = await res.json()
      if (data.success) setOffers(data.data)
    } catch {
      showToast("error", "Failed to load offers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOffers() }, [fetchOffers])

  useEffect(() => {
    const sub = sanityClient
      .listen('*[_type in ["offer", "offerClaim"]]', {}, { includeResult: false, visibility: "query" })
      .subscribe({
        next: () => void fetchOffers(),
        error: (error) => console.warn("[offers] realtime refresh failed", error),
      })

    return () => sub.unsubscribe()
  }, [fetchOffers])

  const handleClaim = (offer: OfferWithProduct) => {
    const now = Date.now()
    const end = new Date(offer.endAt).getTime()
    if (now > end) {
      setMissedOffer(offer)
      return
    }
    const start = new Date(offer.startAt).getTime()
    if (now < start) {
      showToast("error", "This offer hasn't started yet!")
      return
    }

    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    if (role !== "customer") {
      showToast("error", "Only customers can claim offers")
      return
    }

    const product = offer.products?.[0]
    const productId = product?._id || product?._ref
    if (!productId) {
      showToast("error", "No product available for this offer")
      return
    }

    try {
      sessionStorage.setItem("pendingOfferClaim", JSON.stringify({
        offerId: offer._id,
        offerTitle: offer.title,
        offerType: offer.offerType,
        discountValue: offer.discountValue,
        productId,
        categorySlug: product?.category?.slug?.current || null,
      }))
    } catch {
      // sessionStorage may not be available
    }
    router.push("/customer/purchase")
  }

  const getDiscountLabel = (offer: OfferWithProduct) => {
    if (offer.offerType === "percentage" && offer.discountValue) {
      return `${offer.discountValue}% OFF`
    }
    if (offer.offerType === "fixed_amount" && offer.discountValue) {
      return `${formatINR(offer.discountValue)} OFF`
    }
    return OFFER_TYPE_LABELS[offer.offerType as OfferType] || "Special Offer"
  }

  const getDiscountIcon = (offer: OfferWithProduct) => {
    if (offer.offerType === "percentage") return Percent
    if (offer.offerType === "fixed_amount") return IndianRupee
    return Gift
  }

  const isExpired = (endAt: string) => Date.now() > new Date(endAt).getTime()
  const isUpcoming = (startAt: string) => Date.now() < new Date(startAt).getTime()

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed right-4 top-4 z-[300] rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                : "border-red-500/30 bg-red-500/15 text-red-200"
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Special Offers</h1>
        <p className="mt-1 text-sm text-gray-400">Grab exclusive deals on your favorite products</p>
      </div>

      {/* Offers Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : offers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-20 px-6"
        >
          <div className="mb-4 rounded-full bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 p-4 ring-1 ring-white/[0.06]">
            <Tag className="h-8 w-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">No Offers Available</h3>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-400">
            There are no active offers right now. We&apos;ll notify you when a new offer is available!
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Stay tuned for upcoming deals
          </div>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer, i) => {
            const DiscountIcon = getDiscountIcon(offer)
            const expired = isExpired(offer.endAt)
            const upcoming = isUpcoming(offer.startAt)

            let buttonLabel = "Claim Offer"
            let buttonDisabled = false
            let buttonAction = () => handleClaim(offer)
            if (expired) {
              buttonLabel = "Offer Expired"
              buttonDisabled = false
            } else if (upcoming) {
              buttonLabel = "Coming Soon"
              buttonDisabled = true
            }

            return (
              <motion.div
                key={offer._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`group rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/30 ${
                  expired
                    ? "border-white/[0.04] bg-white/[0.01] opacity-60"
                    : "border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:border-white/[0.12]"
                }`}
              >
                {/* Discount badge */}
                <div className="mb-4 flex items-center gap-3">
                  <div className={`rounded-xl p-3 ring-1 ring-white/[0.06] ${
                    expired
                      ? "bg-gray-500/10"
                      : "bg-gradient-to-br from-cyan-500/20 to-emerald-500/20"
                  }`}>
                    <DiscountIcon className={`h-6 w-6 ${expired ? "text-gray-500" : "text-cyan-400"}`} />
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${
                      expired
                        ? "text-gray-500"
                        : "text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300"
                    }`}>
                      {getDiscountLabel(offer)}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {offer.offerType === "percentage" && offer.discountValue
                        ? `Save ${offer.discountValue}% on your purchase`
                        : offer.offerType === "fixed_amount" && offer.discountValue
                          ? `Save ${formatINR(offer.discountValue)} on your purchase`
                          : "Special deal"}
                    </p>
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-sm font-semibold ${expired ? "text-gray-500" : "text-white"}`}>
                  {offer.title}
                </h3>
                {offer.description && (
                  <p className="mt-1 text-xs text-gray-400 line-clamp-2">{offer.description}</p>
                )}

                {/* Check Details */}
                <button
                  type="button"
                  onClick={() => setProductListOffer(offer)}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/8 px-2.5 py-1 text-[10px] font-medium text-cyan-300 transition hover:bg-cyan-500/15"
                >
                  Check Details
                </button>

                {/* Live timer */}
                <div className="mt-3">
                  <TimeDisplay startAt={offer.startAt} endAt={offer.endAt} />
                </div>

                {/* Claims */}
                {offer.maxClaims > 0 && (
                  <div className="mt-1 text-[11px] text-gray-500">
                    {offer.currentClaimCount}/{offer.maxClaims} claimed
                  </div>
                )}

                {/* Claim button */}
                <div className="mt-4">
                  {!isAuthenticated ? (
                    <Button
                      onClick={() => router.push("/login")}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <LogIn className="h-4 w-4" />
                      Login to Claim
                    </Button>
                  ) : role !== "customer" ? null : expired ? (
                    <Button
                      onClick={() => setMissedOffer(offer)}
                      variant="outline"
                      className="w-full gap-2 border-red-500/20 text-red-400 hover:bg-red-500/10"
                    >
                      <Clock className="h-4 w-4" />
                      Offer Expired
                    </Button>
                  ) : (
                    <Button
                      onClick={buttonAction}
                      disabled={buttonDisabled || claimingId === offer._id}
                      className="w-full gap-2"
                    >
                      {claimingId === offer._id ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Claiming...</>
                      ) : upcoming ? (
                        <><Timer className="h-4 w-4" /> Coming Soon</>
                      ) : (
                        <><Gift className="h-4 w-4" /> Claim Offer</>
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Missed Offer Modal */}
      <BaseGlassModal
        isOpen={!!missedOffer}
        onClose={() => setMissedOffer(null)}
        size="md"
        mobileType="modal"
        backCloseId="customer-missed-offer"
      >
        {missedOffer && (
          <div className="flex flex-col items-center px-4 py-6 text-center">
            <div className="mb-4 rounded-full bg-gradient-to-br from-amber-500/10 to-red-500/10 p-4 ring-1 ring-white/[0.06]">
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Better Luck Next Time!</h3>
            <p className="mt-2 text-sm text-gray-400">
              You missed the <span className="text-cyan-300 font-medium">{missedOffer.title}</span> offer. It has expired.
            </p>
            <p className="mt-1 text-sm text-gray-500">Our new offers are on the way. Stay tuned!</p>
            <div className="mt-6 flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              More deals coming soon
            </div>
            <Button onClick={() => setMissedOffer(null)} className="mt-6 w-full">
              Browse Other Offers
            </Button>
          </div>
        )}
      </BaseGlassModal>

      {/* Product List Modal */}
      <BaseGlassModal
        isOpen={!!productListOffer}
        onClose={() => setProductListOffer(null)}
        title="Available Items"
        size="md"
        mobileType="modal"
        backCloseId="customer-offer-products"
      >
        {productListOffer && (
          <>
            <div className="max-h-72 space-y-1 overflow-y-auto px-2 py-1">
              {(productListOffer.products || []).length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-4">No items listed</p>
              ) : (
                (productListOffer.products || []).map((p, i) => {
                  const item = p as { name?: string; brand?: string; _id?: string }
                  return (
                    <div key={item._id || i} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/10 text-[9px] font-bold text-cyan-300">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{item.name || "Unknown Item"}</p>
                        {item.brand && <p className="text-[10px] text-gray-500">{item.brand}</p>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="mt-3 border-t border-white/[0.06] px-2 pt-3">
              <p className="text-center text-[11px] text-gray-500">
                This offer is available on {(productListOffer.products || []).length} item(s)
              </p>
            </div>
          </>
        )}
      </BaseGlassModal>
    </div>
  )
}
