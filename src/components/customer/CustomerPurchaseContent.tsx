"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Sparkles,
  Grid3X3,
  List,
  X,
  MessageCircle,
  CheckCheck,
  Store,
} from "lucide-react";
import {
  fetchShopCategories,
  fetchShopProductsByCategory,
  fetchShopCategoryBySlug,
  getSanityImageUrl,
  formatPrice,
  type ShopCategory,
  type ShopProduct,
} from "@/lib/shop-queries";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { CategoryCard } from "@/components/shop/CategoryCard";
import { ProductCard } from "@/components/shop/ProductCard";
import {
  ProductDetail,
  ProductDetailSkeleton,
} from "@/components/shop/ProductDetail";
import { DeliveryNotice } from "@/components/shop/DeliveryNotice";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { toast } from "sonner";

function CategoriesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
        >
          <Skeleton className="mb-4 h-14 w-14 rounded-2xl" />
          <Skeleton className="mb-2 h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

function ProductsGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]"
        >
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CustomerPurchaseContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { items, getTotalAmount, openCart } = useCartStore();
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categoryMeta, setCategoryMeta] = useState<ShopCategory | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(
    null,
  );
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [sendingOrder, setSendingOrder] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [error, setError] = useState<string | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchShopCategories()
      .then((data) => {
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategory(data[0].slug.current);
        }
      })
      .catch(() => setError("Failed to load categories"))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Fetch products when category changes
  useEffect(() => {
    if (!selectedCategory) return;
    setProductsLoading(true);
    setSelectedProduct(null);
    setShowMobileDetail(false);
    Promise.all([
      fetchShopProductsByCategory(selectedCategory),
      fetchShopCategoryBySlug(selectedCategory),
    ])
      .then(([productsData, cat]) => {
        setProducts(productsData);
        setCategoryMeta(cat);
      })
      .catch(() => setError("Failed to load products"))
      .finally(() => setProductsLoading(false));
  }, [selectedCategory]);

  const handleSelect = useCallback((product: ShopProduct) => {
    setSelectedProduct(product);
    setShowMobileDetail(true);
  }, []);

  const handleSendOrderToChat = useCallback(async () => {
    if (!user || items.length === 0) return;
    setSendingOrder(true);
    try {
      const total = getTotalAmount();
      let orderText = `🛒 *New Order*\n\n--- Items ---\n`;
      items.forEach((item, i) => {
        orderText += `${i + 1}. ${item.name}`;
        if (item.brand) orderText += ` (${item.brand})`;
        orderText += ` × ${item.quantity} = ${formatPrice(item.price * item.quantity)}\n`;
      });
      orderText += `\n📦 Total Items: ${items.reduce((s, i) => s + i.quantity, 0)}`;
      orderText += `\n💰 Total: ${formatPrice(total)}`;
      orderText += `\n\n📍 Pickup only — Please confirm availability and pickup time.`;
      orderText += `\n— ${(user as any)?.name || "Customer"}`;

      // Dynamically import to avoid circular dependencies
      const { sendShopChatMessage } = await import("@/lib/shop-chat/api");
      const { getMyShopChatRoom } = await import("@/lib/shop-chat/api");

      const { room } = await getMyShopChatRoom();
      const clientMessageId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      await sendShopChatMessage({
        roomId: room.roomId,
        text: orderText,
        type: "text",
        clientMessageId,
      });

      setOrderSent(true);
      toast.success("Order sent to chat!", {
        description: "The shop will respond shortly.",
        action: {
          label: "Open Chat",
          onClick: () => router.push("/customer/chat"),
        },
      });
    } catch {
      toast.error("Failed to send order", {
        description: "Please try again or contact the shop directly.",
      });
    } finally {
      setSendingOrder(false);
    }
  }, [user, items, getTotalAmount, router]);

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/10">
            <ShoppingBag className="h-4 w-4 text-sky-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Purchase</h1>
            <p className="text-[11px] text-white/40">
              Browse and order items from the shop
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={openCart}
            className="relative border-white/10 text-xs"
          >
            <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
            Cart
            {items.length > 0 && (
              <Badge className="ml-1.5 bg-sky-500 px-1 text-[10px]">
                {items.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: categories */}
        <div className="hidden w-56 shrink-0 overflow-y-auto border-r border-white/[0.06] p-3 lg:block">
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-white/30">
            Categories
          </p>
          {categoriesLoading ? (
            <div className="space-y-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => {
                const active = selectedCategory === cat.slug.current;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.slug.current)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-all ${
                      active
                        ? "bg-sky-400/10 text-sky-300 border border-sky-400/20"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-white border border-transparent"
                    }`}
                  >
                    <span className="line-clamp-1">{cat.name}</span>
                    {cat.productCount > 0 && (
                      <span className="ml-auto float-right text-[10px] text-white/30">
                        {cat.productCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile category tabs */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] px-3 py-2 lg:hidden">
            {categoriesLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-lg" />
                ))
              : categories.map((cat) => {
                  const active = selectedCategory === cat.slug.current;
                  return (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.slug.current)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                        active
                          ? "bg-sky-400/10 text-sky-300 border border-sky-400/20"
                          : "text-slate-400 hover:text-white border border-transparent"
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
          </div>

          {/* Top bar with view toggle */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
            <p className="text-xs text-slate-500">
              {categoryMeta?.name || "Loading..."}
              {!productsLoading && (
                <span className="ml-1.5 text-white/20">
                  ({products.length} {products.length === 1 ? "item" : "items"})
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-sky-400/15 text-sky-400"
                      : "text-white/30 hover:text-white/60"
                  }`}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === "list"
                      ? "bg-sky-400/15 text-sky-400"
                      : "text-white/30 hover:text-white/60"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
              {items.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleSendOrderToChat}
                  disabled={sendingOrder || orderSent}
                  className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-500"
                >
                  {orderSent ? (
                    <>
                      <CheckCheck className="h-3.5 w-3.5" />
                      Sent
                    </>
                  ) : sendingOrder ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-3.5 w-3.5" />
                      Send Order on Chat
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-3">
              <DeliveryNotice />
            </div>

            {error && (
              <EmptyState
                title="Something went wrong"
                description={error}
                icon={Sparkles}
                compact
              />
            )}

            {productsLoading ? (
              <ProductsGridSkeleton />
            ) : products.length === 0 && !error ? (
              <EmptyState
                title="No products"
                description="This category has no products yet."
                icon={ShoppingBag}
                compact
              />
            ) : viewMode === "grid" ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product, i) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onSelect={handleSelect}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product, i) => (
                  <div
                    key={product._id}
                    onClick={() => handleSelect(product)}
                    className="group flex cursor-pointer items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all hover:border-white/[0.12] hover:bg-white/[0.05]"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                      {product.images?.[0] ? (
                        <img
                          src={getSanityImageUrl(product.images[0]) || ""}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ShoppingBag className="h-full w-full p-4 text-white/10" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {product.brand && (
                        <p className="text-[11px] font-medium uppercase tracking-wider text-sky-400/60">
                          {product.brand}
                        </p>
                      )}
                      <h3 className="mt-0.5 text-sm font-medium text-white transition-colors group-hover:text-sky-300">
                        {product.name}
                      </h3>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-base font-bold text-sky-400">
                          {formatPrice(product.pricing.sellingPrice)}
                        </span>
                        {product.pricing.mrp &&
                          product.pricing.mrp >
                            product.pricing.sellingPrice && (
                            <span className="text-xs text-white/30 line-through">
                              {formatPrice(product.pricing.mrp)}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile product detail bottom sheet */}
      <AnimatePresence>
        {showMobileDetail && selectedProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileDetail(false)}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[70] max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-white/[0.08] bg-slate-950 shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-slate-950/90 p-4 backdrop-blur-xl">
                <span className="text-xs font-medium text-white/50">
                  Product Details
                </span>
                <button
                  type="button"
                  onClick={() => setShowMobileDetail(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition-colors hover:border-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 pb-8">
                <ProductDetail product={selectedProduct} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CartDrawer />
    </div>
  );
}
