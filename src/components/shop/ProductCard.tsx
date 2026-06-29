"use client";

import { motion } from "framer-motion";
import { ShoppingCart, Star, Sparkles, Percent, Plus, Minus } from "lucide-react";
import {
  type ShopProduct,
  formatPrice,
  getSanityImageUrl,
  calculateDiscount,
} from "@/lib/shop-queries";
import { useCartStore } from "@/store/cart-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ProductCard({
  product,
  onSelect,
  index = 0,
}: {
  product: ShopProduct;
  onSelect: (product: ShopProduct) => void;
  index?: number;
}) {
  const { items, addItem, updateQuantity } = useCartStore();
  const inCart = items.find((i) => i.productId === product._id);
  const imageUrl = product.images?.[0]
    ? getSanityImageUrl(product.images[0])
    : null;
  const isOutOfStock = !product.inStock || product.stockCount <= 0;
  const isLowStock =
    product.inStock &&
    product.stockCount > 0 &&
    product.stockCount <= product.lowStockThreshold;
  const discount = calculateDiscount(
    product.pricing.mrp || 0,
    product.pricing.sellingPrice,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      layout
    >
      <div
        onClick={() => onSelect(product)}
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] transition-all duration-500 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-black/30 md:rounded-2xl"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-900 md:aspect-square">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-white/10 md:h-12 md:w-12" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-1.5 top-1.5 flex flex-col gap-1 md:left-2 md:top-2 md:gap-1.5">
            {discount > 0 && (
              <Badge className="border-red-500/30 bg-red-500/20 text-[9px] text-red-300 shadow-lg backdrop-blur-sm md:text-[10px]">
                <Percent className="mr-0.5 h-2 w-2 md:h-2.5 md:w-2.5" />
                {discount}% OFF
              </Badge>
            )}
            {product.isNewArrival && (
              <Badge className="border-emerald-500/30 bg-emerald-500/20 text-[9px] text-emerald-300 shadow-lg backdrop-blur-sm md:text-[10px]">
                <Sparkles className="mr-0.5 h-2 w-2 md:h-2.5 md:w-2.5" />
                New
              </Badge>
            )}
            {product.isFeatured && (
              <Badge className="border-yellow-500/30 bg-yellow-500/20 text-[9px] text-yellow-300 shadow-lg backdrop-blur-sm md:text-[10px]">
                <Star className="mr-0.5 h-2 w-2 md:h-2.5 md:w-2.5" />
                Featured
              </Badge>
            )}
            {isOutOfStock && (
              <Badge
                variant="destructive"
                className="border-red-500/40 bg-red-500/30 text-[9px] shadow-lg backdrop-blur-sm md:text-[10px]"
              >
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Quick add button - always visible on mobile, hover on desktop */}
          {!isOutOfStock && (
            <div className="absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2 md:translate-y-2 md:opacity-0 md:transition-all md:duration-300 md:group-hover:translate-y-0 md:group-hover:opacity-100">
              {inCart ? (
                <div className="flex items-center overflow-hidden rounded-lg border border-sky-400/30 bg-slate-900/90 shadow-xl backdrop-blur-xl md:rounded-xl">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(product._id, inCart.quantity - 1);
                    }}
                    className="flex h-7 w-7 items-center justify-center text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white md:h-8 md:w-8"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[1.5rem] text-center text-[11px] font-semibold text-white md:min-w-[1.75rem] md:text-xs">
                    {inCart.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(product._id, inCart.quantity + 1);
                    }}
                    disabled={inCart.quantity >= product.stockCount}
                    className="flex h-7 w-7 items-center justify-center text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 md:h-8 md:w-8"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  }}
                  className="h-8 w-8 rounded-lg shadow-xl backdrop-blur-xl md:h-9 md:w-9 md:rounded-xl"
                >
                  <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 md:p-3.5">
          {product.brand && (
            <p className="text-[10px] font-medium uppercase tracking-wider text-sky-400/70 md:text-[11px]">
              {product.brand}
            </p>
          )}
          <h3 className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-white transition-colors group-hover:text-sky-300 md:mt-1 md:text-sm">
            {product.name}
          </h3>

          {/* Rating */}
          {product.rating && product.rating > 0 && (
            <div className="mt-1 flex items-center gap-1 md:mt-1.5 md:gap-1.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-2.5 w-2.5 md:h-3 md:w-3 ${
                      i < Math.round(product.rating || 0)
                        ? "fill-yellow-500 text-yellow-500"
                        : "fill-white/10 text-white/10"
                    }`}
                  />
                ))}
              </div>
              {product.reviewCount && product.reviewCount > 0 && (
                <span className="text-[9px] text-white/30 md:text-[10px]">
                  ({product.reviewCount})
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="mt-1.5 flex items-baseline gap-1.5 md:mt-2 md:gap-2">
            <span className="text-base font-bold text-sky-400 md:text-lg">
              {formatPrice(product.pricing.sellingPrice)}
            </span>
            {product.pricing.mrp && product.pricing.mrp > product.pricing.sellingPrice && (
              <span className="text-[10px] text-white/30 line-through md:text-xs">
                {formatPrice(product.pricing.mrp)}
              </span>
            )}
          </div>

          {/* Stock indicator */}
          {isLowStock && (
            <p className="mt-1 text-[10px] font-medium text-amber-400 md:mt-1.5">
              Only {product.stockCount} left
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
