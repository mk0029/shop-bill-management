"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShopImage } from "@/components/ui/shop-image";
import { motion, AnimatePresence } from "framer-motion";
import { sanityClient } from "@/lib/sanity";
import {
  ShoppingBag,
  Sparkles,
  X,
  ArrowLeft,
  ChevronRight,
  Package,
  Layers,
  Grid3X3,
  List,
} from "lucide-react";
import {
  fetchShopCategories,
  fetchShopProductsByCategory,
  getSanityImageUrl,
  formatPrice,
  type ShopCategory,
  type ShopProduct,
} from "@/lib/shop-queries";
import { useCartStore } from "@/store/cart-store";
import { ProductDetail } from "@/components/shop/ProductDetail";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";

function ShimmerOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 animate-shimmer" />
  );
}

function ChatListSkeleton() {
  return (
    <div className="space-y-2 px-4 pt-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
          <ShimmerOverlay />
        </div>
      ))}
    </div>
  );
}

function CategorySidebarSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-800" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
              <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
          <ShimmerOverlay />
        </div>
      ))}
    </div>
  );
}

function ProductListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
        >
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-800" />
            </div>
            <div className="h-8 w-16 shrink-0 animate-pulse rounded-lg bg-slate-800" />
          </div>
          <ShimmerOverlay />
        </div>
      ))}
    </div>
  );
}

function OfferBadge({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className="absolute -top-1.5 -right-1.5 z-10 flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg shadow-amber-500/30"
    >
      <Sparkles className="h-2.5 w-2.5" />
      {count}
    </motion.div>
  );
}

export function CustomerPurchaseContent() {
  const router = useRouter();
  const { items, openCart, addItem, updateQuantity } = useCartStore();
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<ShopCategory | null>(
    null,
  );
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(
    null,
  );

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productOfferCounts, setProductOfferCounts] = useState<
    Record<string, number>
  >({});

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [mobileView, setMobileView] = useState<
    "categories" | "products" | "detail"
  >("categories");

  useEffect(() => {
    fetchShopCategories()
      .then((data) => {
        setCategories(data);
      })
      .catch(() => setError("Failed to load categories"))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Process pending offer from sessionStorage (redirected from offers page)
  const pendingProcessedRef = useRef(false);
  useEffect(() => {
    if (pendingProcessedRef.current || categoriesLoading) return;

    let pendingRaw: string | null = null;
    try {
      pendingRaw = sessionStorage.getItem("pendingOfferClaim");
    } catch {
      return;
    }
    if (!pendingRaw) return;

    pendingProcessedRef.current = true;
    let pending: {
      offerId: string;
      offerTitle: string;
      offerType?: string;
      discountValue?: number;
      productId: string;
      categorySlug: string | null;
    };
    try {
      pending = JSON.parse(pendingRaw);
    } catch {
      sessionStorage.removeItem("pendingOfferClaim");
      return;
    }
    sessionStorage.removeItem("pendingOfferClaim");

    sanityClient
      .fetch<ShopProduct | null>(
        `*[_type == "shopProduct" && _id == $productId][0]{
        _id, name, slug, brand, images, pricing, stockCount,
        category->{ _id, name, slug }
      }`,
        { productId: pending.productId },
      )
      .then((product) => {
        if (!product) return;

        const catSlug = pending.categorySlug || product.category?.slug?.current;
        const category = catSlug
          ? categories.find((c) => c.slug.current === catSlug) || null
          : null;

        if (category) {
          selectCategory(category);
        }

        const basePrice = product.pricing.sellingPrice;
        let offerAdjustedPrice: number | undefined;
        if (
          pending.offerType === "percentage" &&
          pending.discountValue != null
        ) {
          offerAdjustedPrice = Math.round(
            basePrice - (basePrice * pending.discountValue) / 100,
          );
        } else if (
          pending.offerType === "fixed_amount" &&
          pending.discountValue != null
        ) {
          offerAdjustedPrice = Math.max(0, basePrice - pending.discountValue);
        }

      addItem({
        productId: product._id,
        name: product.name,
        price: basePrice,
        originalPrice: product.pricing.mrp,
        imageUrl: product.images?.[0]
          ? getSanityImageUrl(product.images[0]) || undefined
          : undefined,
        unit: product.pricing.unit,
        brand: product.brand,
        stock: product.stockCount,
        offerId: pending.offerId,
        offerTitle: pending.offerTitle,
        offerType: pending.offerType,
        offerDiscountValue: pending.discountValue,
        offerAdjustedPrice,
      });

        openCart();
      })
      .catch(() => {});
  }, [categories, categoriesLoading]);

  const selectCategory = useCallback((cat: ShopCategory) => {
    if (cat.productCount <= 0) return;
    setSelectedCategory(cat);
    setSelectedProduct(null);
    setProducts([]);
    setProductOfferCounts({});
    setProductsLoading(true);
    setMobileView("products");
    fetchShopProductsByCategory(cat.slug.current)
      .then((fetched) => {
        setProducts(fetched);
        const productIds = fetched.map((p) => p._id);
        if (productIds.length > 0) {
          const now = new Date().toISOString();
          sanityClient
            .fetch<Array<{ products: Array<{ _id?: string; _ref?: string }> }>>(
              `*[_type == "offer" && status == "active" && startAt <= $now && endAt >= $now]{
                products[]->{ _id }
              }`,
              { now },
            )
            .then((offers) => {
              const counts: Record<string, number> = {};
              for (const offer of offers) {
                for (const p of offer.products || []) {
                  const pid = p._id || p._ref;
                  if (pid && productIds.includes(pid)) {
                    counts[pid] = (counts[pid] || 0) + 1;
                  }
                }
              }
              setProductOfferCounts(counts);
            })
            .catch(() => {});
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  const selectProduct = useCallback((product: ShopProduct) => {
    setSelectedProduct(product);
    setMobileView("detail");
  }, []);

  const backToCategories = useCallback(() => {
    setMobileView("categories");
    setSelectedCategory(null);
    setSelectedProduct(null);
    setProducts([]);
  }, []);

  const backToProducts = useCallback(() => {
    setMobileView("products");
    setSelectedProduct(null);
  }, []);

  const getItemQty = (productId: string) =>
    items.find((i) => i.productId === productId)?.quantity || 0;

  const handleAdd = (product: ShopProduct) => {
    addItem({
      productId: product._id,
      name: product.name,
      price: product.pricing.sellingPrice,
      originalPrice: product.pricing.mrp,
      imageUrl: product.images?.[0]
        ? getSanityImageUrl(product.images[0]) || undefined
        : undefined,
      unit: product.pricing.unit,
      brand: product.brand,
      stock: product.stockCount,
    });
  };

  const handleQtyUp = (product: ShopProduct) => {
    const current = getItemQty(product._id);
    updateQuantity(product._id, current + 1);
  };

  const handleQtyDown = (product: ShopProduct) => {
    const current = getItemQty(product._id);
    if (current <= 1) {
      updateQuantity(product._id, 0);
      return;
    }
    updateQuantity(product._id, current - 1);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-gray-950/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          {mobileView !== "categories" ? (
            <button
              type="button"
              onClick={
                mobileView === "products" ? backToCategories : backToProducts
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-colors hover:border-white/20 hover:text-white"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-colors hover:border-white/20 hover:text-white"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-white">
              {mobileView === "categories" && "Purchase"}
              {mobileView === "products" && selectedCategory?.name}
              {mobileView === "detail" && "Product Details"}
            </h1>
            <p className="text-xs text-white/55">
              {mobileView === "categories" && "Browse items from the shop"}
              {mobileView === "products" &&
                `${products.length} item${products.length === 1 ? "" : "s"}`}
              {mobileView === "detail" && selectedProduct?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mobileView === "products" && (
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] p-0.5 mr-1">
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
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={openCart}
            className="relative border-white/10 text-xs"
          >
            <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
            Cart
            {items.length > 0 && (
              <Badge className="ml-1.5 bg-sky-500 min-w-5 min-h-5 text-[10px] px-0 flex items-center justify-center">
                {items.length > 9 ? "9+" : items.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden items-center justify-between border-b border-white/[0.08] bg-gray-950/90 px-6 py-3 backdrop-blur-xl lg:flex">
        <div>
          <h1 className="text-lg font-semibold text-white">Purchase</h1>
          <p className="text-xs text-white/55">Browse items from the shop</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={openCart}
          className="relative border-white/10 text-xs"
        >
          <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
          Cart
          {items.length > 0 && (
            <Badge className="ml-1.5 bg-sky-500  min-w-4 text-[10px] flex">
              {items.length > 9 ? "9+" : items.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-white/[0.06] touch-pan-y p-3 lg:block">
          {categoriesLoading ? (
            <CategorySidebarSkeleton />
          ) : categories.length === 0 && !error ? (
            <div className="px-2 pt-8">
              <EmptyState
                title="No categories"
                description="Shop categories will appear here once available."
                icon={ShoppingBag}
                compact
              />
            </div>
          ) : error ? (
            <div className="px-2 pt-8">
              <EmptyState
                title="Error"
                description={error}
                icon={Sparkles}
                compact
              />
            </div>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => {
                const hasProducts = cat.productCount > 0;
                const isActive = selectedCategory?._id === cat._id;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    disabled={!hasProducts}
                    onClick={() => selectCategory(cat)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      isActive
                        ? "bg-sky-500/10 text-sky-300"
                        : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isActive ? "bg-sky-500/20" : "bg-white/[0.04]"
                      }`}
                    >
                      <Package
                        className={`h-5 w-5 ${
                          isActive ? "text-sky-400" : "text-white/40"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-sm font-semibold ${
                          isActive ? "text-sky-300" : "text-white"
                        }`}
                      >
                        {cat.name}
                      </span>
                      <p className="mt-0.5 text-xs text-white/40">
                        {hasProducts
                          ? `${cat.productCount} ${cat.productCount === 1 ? "item" : "items"}`
                          : "Available soon"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Mobile content */}
        <div className="flex-1 overflow-hidden lg:hidden">
          <AnimatePresence mode="wait">
            {mobileView === "categories" && (
              <motion.div
                key="categories"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full touch-pan-y overflow-y-auto py-3"
              >
                {error && (
                  <div className="px-4">
                    <EmptyState
                      title="Something went wrong"
                      description={error}
                      icon={Sparkles}
                      compact
                    />
                  </div>
                )}
                {categoriesLoading ? (
                  <ChatListSkeleton />
                ) : categories.length === 0 && !error ? (
                  <div className="px-4">
                    <EmptyState
                      title="No categories"
                      description="Shop categories will appear here once available."
                      icon={ShoppingBag}
                      compact
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5 px-3">
                    {categories.map((cat) => {
                      const hasProducts = cat.productCount > 0;
                      return (
                        <button
                          key={cat._id}
                          type="button"
                          disabled={!hasProducts}
                          onClick={() => selectCategory(cat)}
                          className="group flex w-full items-center gap-4 rounded-2xl border border-transparent px-4 py-3.5 text-left transition-all hover:border-white/[0.08] hover:bg-white/[0.04] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/10">
                            <Package className="h-5 w-5 text-sky-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-base font-semibold text-white">
                                {cat.name}
                              </span>
                              {hasProducts && (
                                <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-white/20 transition-transform group-hover:translate-x-0.5" />
                              )}
                            </div>
                            <p className="mt-0.5 text-sm text-white/40">
                              {hasProducts
                                ? `${cat.productCount} ${cat.productCount === 1 ? "item" : "items"} available`
                                : "Available soon"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
            {mobileView === "products" && (
              <motion.div
                key="products"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full touch-pan-y overflow-y-auto p-4"
              >
                {renderProductsContent()}
              </motion.div>
            )}
            {mobileView === "detail" && (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full touch-pan-y overflow-y-auto"
              >
                <div className="p-4 pb-8">
                  {selectedProduct && (
                    <ProductDetail product={selectedProduct} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop content */}
        <div className="hidden flex-1 overflow-hidden lg:block">
          {!selectedCategory ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="Select a category"
                description="Choose a category from the sidebar to browse items."
                icon={Layers}
                compact
              />
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* Category header bar */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedCategory.name}
                  </h2>
                  <p className="text-xs text-white/50">
                    {productsLoading
                      ? "Loading..."
                      : `${products.length} item${products.length === 1 ? "" : "s"}`}
                  </p>
                </div>
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
              </div>

              {/* Products + Detail split */}
              <div className="flex flex-1 overflow-hidden">
                <div
                  className={`touch-pan-y overflow-y-auto ${
                    selectedProduct ? "w-2/5" : "flex-1"
                  }`}
                >
                  <div className="p-4">{renderProductsContent()}</div>
                </div>

                {selectedProduct && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-3/5 touch-pan-y overflow-y-auto border-l border-white/[0.06]"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                      <span className="text-xs font-medium text-white/50">
                        Product Details
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition-colors hover:border-white/20 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-4 pb-8">
                      <ProductDetail product={selectedProduct} />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop cart FAB */}
      <div className="hidden lg:fixed lg:bottom-6 lg:right-6 lg:z-50 lg:block">
        <button
          type="button"
          onClick={openCart}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 transition-transform hover:scale-105 active:scale-95"
        >
          <ShoppingBag className="h-5 w-5" />
          {items.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-sky-600">
              {items.length}
            </span>
          )}
        </button>
      </div>

      <CartDrawer onPurchaseMore={backToCategories} />
    </div>
  );

  function renderProductsContent() {
    if (productsLoading) {
      return <ProductListSkeleton />;
    }

    if (products.length === 0) {
      return (
        <EmptyState
          title="No products"
          description="Items for this category will be available soon."
          icon={ShoppingBag}
          compact
        />
      );
    }

    return viewMode === "grid" ? (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const qty = getItemQty(product._id);
          const isSelected = selectedProduct?._id === product._id;
          return renderCard(product, qty, isSelected);
        })}
      </div>
    ) : (
      <div className="space-y-3">
        {products.map((product) => {
          const qty = getItemQty(product._id);
          return renderListItem(product, qty);
        })}
      </div>
    );
  }

  function renderCard(product: ShopProduct, qty: number, isSelected: boolean) {
    return (
      <div
        key={product._id}
        className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all hover:bg-white/[0.06] ${
          isSelected
            ? "border-sky-400/40 bg-sky-400/5"
            : "border-white/[0.06] bg-white/[0.03] hover:border-sky-300/25"
        }`}
      >
        <div onClick={() => selectProduct(product)}>
          <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
            {product.images?.[0] ? (
              <ShopImage
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ShoppingBag className="h-12 w-12 text-white/10" />
              </div>
            )}
            {(productOfferCounts[product._id] || 0) > 0 && (
              <OfferBadge count={productOfferCounts[product._id]} />
            )}
          </div>
          <div className="space-y-1.5 p-3">
            {product.brand && (
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/75">
                {product.brand}
              </p>
            )}
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-white transition-colors group-hover:text-sky-200">
              {product.name}
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-sky-300">
                {formatPrice(product.pricing.sellingPrice)}
              </span>
              {product.pricing.mrp &&
                product.pricing.mrp > product.pricing.sellingPrice && (
                  <span className="text-xs text-white/30 line-through">
                    {formatPrice(product.pricing.mrp)}
                  </span>
                )}
            </div>
            {(productOfferCounts[product._id] || 0) > 0 && (
              <div className="mt-1 flex items-center gap-0.5 rounded-md border border-amber-500/20 bg-amber-500/8 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 w-fit">
                <Sparkles className="h-2.5 w-2.5" />
                {productOfferCounts[product._id]} Offer
                {productOfferCounts[product._id] > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-white/[0.06] px-3 py-2.5">
          {qty === 0 ? (
            <button
              type="button"
              onClick={() => handleAdd(product)}
              className="w-full rounded-lg bg-sky-500/20 py-1.5 text-xs font-semibold text-sky-300 transition-colors hover:bg-sky-500/30"
            >
              Add to Cart
            </button>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleQtyDown(product)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                {qty === 1 ? (
                  <ShoppingBag className="h-3 w-3" />
                ) : (
                  <span className="text-sm font-semibold">-</span>
                )}
              </button>
              <span className="min-w-[1.5ch] text-center text-sm font-semibold text-white">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => handleQtyUp(product)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                <span className="text-sm font-semibold">+</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderListItem(product: ShopProduct, qty: number) {
    return (
      <div
        key={product._id}
        onClick={() => selectProduct(product)}
        className="group flex cursor-pointer items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all hover:border-white/[0.12] hover:bg-white/[0.05]"
      >
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900">
          {product.images?.[0] ? (
            <ShopImage
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ShoppingBag className="h-full w-full p-4 text-white/10" />
          )}
          {(productOfferCounts[product._id] || 0) > 0 && (
            <OfferBadge count={productOfferCounts[product._id]} />
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
          {product.shortDescription && (
            <p className="mt-1 line-clamp-1 text-xs text-slate-500">
              {product.shortDescription}
            </p>
          )}
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-base font-bold text-sky-400">
              {formatPrice(product.pricing.sellingPrice)}
            </span>
            {product.pricing.mrp &&
              product.pricing.mrp > product.pricing.sellingPrice && (
                <span className="text-xs text-white/30 line-through">
                  {formatPrice(product.pricing.mrp)}
                </span>
              )}
          </div>
          {(productOfferCounts[product._id] || 0) > 0 && (
            <div className="mt-1 flex items-center gap-0.5 rounded-md border border-amber-500/20 bg-amber-500/8 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 w-fit">
              <Sparkles className="h-2.5 w-2.5" />
              {productOfferCounts[product._id]} Offer
              {productOfferCounts[product._id] > 1 ? "s" : ""}
            </div>
          )}
        </div>
        <div className="shrink-0">
          {qty === 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAdd(product);
              }}
              className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-300 transition-colors hover:bg-sky-500/30"
            >
              Add
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQtyDown(product);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                {qty === 1 ? (
                  <ShoppingBag className="h-3 w-3" />
                ) : (
                  <span className="text-sm font-semibold">-</span>
                )}
              </button>
              <span className="min-w-[1.5ch] text-center text-sm font-semibold text-white">
                {qty}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQtyUp(product);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                <span className="text-sm font-semibold">+</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}
