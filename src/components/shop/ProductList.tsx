"use client";

import { ShopImage } from "@/components/ui/shop-image";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Check, IndianRupee } from "lucide-react";
import { type ShopProduct, formatPrice, getSanityImageUrl } from "@/lib/shop-queries";
import { useCartStore } from "@/store/cart-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { PackageSearch } from "lucide-react";

function getImageUrl(product: ShopProduct): string | undefined {
  if (!product.images || product.images.length === 0) return undefined;
  const img = product.images[0] as any;
  const url = getSanityImageUrl(img);
  return url || undefined;
}

export function ProductListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ProductList({
  products,
  selectedId,
  onSelect,
  loading,
}: {
  products: ShopProduct[];
  selectedId?: string;
  onSelect: (product: ShopProduct) => void;
  loading?: boolean;
}) {
  const { items, addItem } = useCartStore();

  if (loading) return <ProductListSkeleton />;

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="This category doesn't have any products yet. Check back later."
        icon={PackageSearch}
        compact
      />
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-2">
        {products.map((product, index) => {
          const inCart = items.find(
            (i) => i.productId === product._id,
          );
          const imageUrl = getImageUrl(product);
          const isOutOfStock = product.stock <= 0;

          return (
            <motion.div
              key={product._id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              onClick={() => onSelect(product)}
              className={`group cursor-pointer rounded-xl border p-3 transition-all duration-300 ${
                selectedId === product._id
                  ? "border-sky-400/30 bg-sky-400/5"
                  : "border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center gap-3">
                {product.images?.[0] && (
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
                    <ShopImage
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-medium text-white">
                      {product.name}
                    </h4>
                    {product.isFeatured && (
                      <Badge variant="secondary" className="shrink-0 border-yellow-500/20 bg-yellow-500/10 text-[10px] text-yellow-400">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-sky-400">
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-xs text-white/30 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                    <span className="text-[10px] text-white/30">
                      / {product.unit}
                    </span>
                  </div>
                  {product.brand && (
                    <p className="mt-0.5 text-[11px] text-white/30">
                      {product.brand.name}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                  {isOutOfStock ? (
                    <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant={inCart ? "secondary" : "default"}
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem({
                          productId: product._id,
                          name: product.name,
                          price: product.price,
                          originalPrice: product.originalPrice,
                          imageUrl,
                          unit: product.unit,
                          brand: product.brand?.name,
                          stock: product.stock,
                        });
                      }}
                      className="h-8 px-2.5 text-xs"
                    >
                      {inCart ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          {inCart.quantity}
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-1 h-3 w-3" />
                          Add
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </AnimatePresence>
  );
}
