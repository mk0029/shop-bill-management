"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Check,
  ChevronLeft,
  Star,
  Percent,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Truck,
  RotateCcw,
  Plus,
  Minus,
} from "lucide-react";
import {
  type ShopProduct,
  formatPrice,
  calculateDiscount,
  getSanityImageUrl,
} from "@/lib/shop-queries";
import { useCartStore } from "@/store/cart-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { DeliveryNotice } from "@/components/shop/DeliveryNotice";

export function ProductDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="aspect-square w-full animate-pulse rounded-2xl bg-white/[0.04]" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-white/[0.04]" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.04]" />
      <div className="h-20 w-full animate-pulse rounded-xl bg-white/[0.04]" />
      <div className="h-12 w-full animate-pulse rounded-xl bg-white/[0.04]" />
    </div>
  );
}

export function ProductDetail({
  product,
  onBack,
}: {
  product: ShopProduct;
  onBack?: () => void;
}) {
  const { items, addItem, updateQuantity, openCart } = useCartStore();
  const inCart = items.find((i) => i.productId === product._id);
  const [showAllSpecs, setShowAllSpecs] = useState(false);

  const isOutOfStock = !product.inStock || product.stockCount <= 0;
  const isLowStock =
    product.inStock &&
    product.stockCount > 0 &&
    product.stockCount <= product.lowStockThreshold;
  const discount = calculateDiscount(
    product.pricing.mrp || 0,
    product.pricing.sellingPrice,
  );

  const specs = product.specifications || [];
  const displaySpecs = showAllSpecs ? specs : specs.slice(0, 6);

  const imageUrl = product.images?.[0]
    ? getSanityImageUrl(product.images[0])
    : undefined;

  const handleAddToCart = () => {
    addItem({
      productId: product._id,
      name: product.name,
      price: product.pricing.sellingPrice,
      originalPrice: product.pricing.mrp,
      imageUrl: imageUrl || undefined,
      unit: product.pricing.unit,
      brand: product.brand,
      stock: product.stockCount,
    });
  };

  return (
    <motion.div
      key={product._id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to all items
        </button>
      )}

      {/* Gallery */}
      <ProductGallery product={product} />

      {/* Product info */}
      <div className="mt-3 space-y-4 md:mt-5 md:space-y-5">
        {/* Title & Brand */}
        <div>
          {product.brand && (
            <p className="text-[10px] font-medium uppercase tracking-wider text-sky-400/70 md:text-xs">
              {product.brand}
            </p>
          )}
          <h1 className="mt-0.5 text-xl font-bold text-white md:mt-1 md:text-2xl">
            {product.name}
          </h1>

          {/* Rating */}
          {product.rating && product.rating > 0 && (
            <div className="mt-1.5 flex items-center gap-2 md:mt-2">
              <div className="flex items-center gap-1 rounded-md bg-yellow-500/15 px-2 py-0.5">
                <span className="text-xs font-bold text-yellow-400">
                  {product.rating.toFixed(1)}
                </span>
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              </div>
              {product.reviewCount && product.reviewCount > 0 && (
                <span className="text-xs text-white/40">
                  ({product.reviewCount} reviews)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-bold text-sky-400 md:text-3xl">
            {formatPrice(product.pricing.sellingPrice)}
          </span>
          {product.pricing.mrp &&
            product.pricing.mrp > product.pricing.sellingPrice && (
              <>
                <span className="text-sm text-white/30 line-through md:text-base">
                  {formatPrice(product.pricing.mrp)}
                </span>
                <Badge className="border-red-500/30 bg-red-500/15 text-[10px] text-red-300 md:text-xs">
                  <Percent className="mr-0.5 h-2.5 w-2.5 md:h-3 md:w-3" />
                  {discount}% off
                </Badge>
              </>
            )}
          <span className="text-[10px] text-white/30 md:text-xs">/ {product.pricing.unit}</span>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {isOutOfStock ? (
            <Badge
              variant="destructive"
              className="flex items-center gap-1 border-red-500/20 bg-red-500/10 text-[10px] text-red-400 md:text-xs"
            >
              <AlertTriangle className="h-2.5 w-2.5 md:h-3 md:w-3" />
              Out of Stock
            </Badge>
          ) : isLowStock ? (
            <Badge className="border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-400 md:text-xs">
              Only {product.stockCount} left
            </Badge>
          ) : (
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-400 md:text-xs">
              In Stock
            </Badge>
          )}
          {product.isNewArrival && (
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-400 md:text-xs">
              <Sparkles className="mr-0.5 h-2.5 w-2.5 md:mr-1 md:h-3 md:w-3" />
              New
            </Badge>
          )}
          {product.isFeatured && (
            <Badge className="border-yellow-500/20 bg-yellow-500/10 text-[10px] text-yellow-400 md:text-xs">
              <Star className="mr-0.5 h-2.5 w-2.5 md:mr-1 md:h-3 md:w-3" />
              Featured
            </Badge>
          )}
          {product.subcategory && (
            <Badge
              variant="outline"
              className="border-violet-500/20 bg-violet-500/10 text-[10px] text-violet-400 md:text-xs"
            >
              {product.subcategory.name}
            </Badge>
          )}
        </div>

        {/* Delivery Notice */}
        <DeliveryNotice />

        {/* Add to cart */}
        {!isOutOfStock && (
          <div className="flex gap-2 md:gap-3">
            {inCart ? (
              <>
                <div className="flex items-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product._id, inCart.quantity - 1)}
                    className="flex h-11 w-11 items-center justify-center text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white md:h-12 md:w-12"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2.5rem] text-center text-sm font-semibold text-white md:min-w-[3rem] md:text-base">
                    {inCart.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(product._id, inCart.quantity + 1)}
                    disabled={inCart.quantity >= product.stockCount}
                    className="flex h-11 w-11 items-center justify-center text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 md:h-12 md:w-12"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={openCart}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-400/30 px-4 py-3 text-sm font-medium text-sky-400 transition-all active:scale-[0.97] hover:bg-sky-400/10 md:py-4 md:text-base"
                >
                  <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden md:inline">View</span> Cart
                </button>
              </>
            ) : (
              <button
                onClick={handleAddToCart}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all active:scale-[0.97] hover:from-sky-400 hover:to-sky-500 md:py-4 md:text-base"
              >
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                Add to Cart
              </button>
            )}
          </div>
        )}

        {/* Short description */}
        {product.shortDescription && (
          <p className="text-sm leading-relaxed text-slate-400">
            {product.shortDescription}
          </p>
        )}

        {/* Key Features */}
        {product.features && product.features.length > 0 && (
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/60 md:mb-3 md:text-sm">
              Key Features
            </h3>
            <ul className="space-y-1.5 md:space-y-2">
              {product.features.map((feature, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400 md:h-4 md:w-4" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Full Description */}
        {product.description && (
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/60 md:mb-3 md:text-sm">
              Description
            </h3>
            <p className="text-sm leading-relaxed text-slate-400">
              {product.description}
            </p>
          </div>
        )}

        {/* Specifications */}
        {specs.length > 0 && (
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/60 md:mb-3 md:text-sm">
              Technical Specifications
            </h3>
            <div className="overflow-hidden rounded-xl border border-white/[0.06]">
              <table className="w-full text-xs md:text-sm">
                <tbody>
                  {displaySpecs.map((spec, i) => (
                    <tr
                      key={i}
                      className={`border-b border-white/[0.04] last:border-0 ${
                        i % 2 === 0 ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-medium text-white/60 md:px-4 md:py-2.5">
                        {spec.label}
                      </td>
                      <td className="px-3 py-2 text-white/80 md:px-4 md:py-2.5">
                        {spec.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {specs.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllSpecs(!showAllSpecs)}
                className="mt-2 flex items-center gap-1 text-xs text-sky-400/70 transition-colors hover:text-sky-400"
              >
                {showAllSpecs ? (
                  <>
                    Show less <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    See all {specs.length} specifications{" "}
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 md:gap-3 md:p-4">
          <div className="text-center">
            <Truck className="mx-auto mb-1 h-4 w-4 text-sky-400/60 md:h-5 md:w-5" />
            <p className="text-[10px] text-white/40 md:text-[11px]">Pickup Only</p>
          </div>
          <div className="text-center">
            <ShieldCheck className="mx-auto mb-1 h-4 w-4 text-sky-400/60 md:h-5 md:w-5" />
            <p className="text-[10px] text-white/40 md:text-[11px]">Genuine Products</p>
          </div>
          <div className="text-center">
            <RotateCcw className="mx-auto mb-1 h-4 w-4 text-sky-400/60 md:h-5 md:w-5" />
            <p className="text-[10px] text-white/40 md:text-[11px]">Check before buy</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
