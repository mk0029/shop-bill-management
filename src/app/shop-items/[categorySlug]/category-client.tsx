"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ShopImage } from "@/components/ui/shop-image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Sparkles,
  Grid3X3,
  List,
  X,
  Search,
  Package,
} from "lucide-react";
import {
  fetchShopProductsByCategory,
  fetchShopCategoryBySlug,
  formatPrice,
  type ShopProduct,
  type ShopCategory,
} from "@/lib/shop-queries";
import { matchesSearch } from "@/lib/search-utils";
import { ShopNavbar } from "@/components/shop/ShopNavbar";
import { ProductCard } from "@/components/shop/ProductCard";
import {
  ProductDetail,
  ProductDetailSkeleton,
} from "@/components/shop/ProductDetail";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { DeliveryNotice } from "@/components/shop/DeliveryNotice";
import EmptyState from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

function ProductsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]"
        >
          <Skeleton className="aspect-square w-full" />
          <div className="p-3.5 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CategoryDetailClient() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [category, setCategory] = useState<ShopCategory | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const rightPanelRef = useRef<HTMLElement>(null);

  // Desktop/tablet split view: keep the selected product visible in the list
  useEffect(() => {
    if (!selectedProduct || typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    document
      .querySelector<HTMLElement>('[data-selected-product="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedProduct?._id]);

  // Start at the top of the details when switching products
  useEffect(() => {
    rightPanelRef.current?.scrollTo({ top: 0 });
  }, [selectedProduct?._id]);

  const productSearchData = useMemo(
    () =>
      products.map((p) => {
        const specsText =
          p.specifications
            ?.map((s: { label?: string; value?: string }) =>
              [s.label, s.value].filter(Boolean).join(" "),
            )
            .join(" ") || "";
        const featuresText = p.features?.join(" ") || "";
        return {
          id: p._id,
          text: [
            p.name,
            p.brand,
            p.shortDescription,
            p.description,
            featuresText,
            specsText,
            p.pricing?.unit,
            p.subcategory?.name,
          ]
            .filter(Boolean)
            .join(" "),
        };
      }),
    [products],
  );

  const filteredProducts = useMemo(
    () =>
      !searchQuery.trim()
        ? products
        : products.filter((p) => {
            const data = productSearchData.find((d) => d.id === p._id);
            return data ? matchesSearch(searchQuery, data.text) : false;
          }),
    [products, searchQuery, productSearchData],
  );

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [productsData, categoryData] = await Promise.all([
          fetchShopProductsByCategory(categorySlug),
          fetchShopCategoryBySlug(categorySlug),
        ]);
        setProducts(productsData);
        setCategory(categoryData);
      } catch {
        setError("Failed to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [categorySlug]);

  useEffect(() => {
    const productId = searchParams.get("productId");
    if (!productId || products.length === 0) return;

    const matchedProduct = products.find((product) => product._id === productId);
    if (matchedProduct) {
      setSelectedProduct(matchedProduct);
      setShowMobileDetail(true);
    }
  }, [products, searchParams]);

  const handleSelect = useCallback((product: ShopProduct) => {
    setSelectedProduct(product);
    setShowMobileDetail(true);
  }, []);

  const handleBackToList = useCallback(() => {
    setShowMobileDetail(false);
    setSelectedProduct(null);
  }, []);

  const heading =
    category?.name ||
    categorySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const pageTitle = heading;
  const inStockCount = filteredProducts.filter(
    (p) => p.inStock && p.stockCount > 0,
  ).length;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950">
        <ShopNavbar />
        <div className="pt-16">
          <div className="border-b border-white/[0.04] bg-white/[0.01]">
            <div className="mx-auto max-w-7xl px-4 py-3">
              <p className="text-xs text-slate-500">
                <a href="/" className="hover:text-sky-400 transition-colors">
                  Home
                </a>
                <span className="mx-1.5 text-slate-600">/</span>
                <a
                  href="/shop-items"
                  className="hover:text-sky-400 transition-colors"
                >
                  Shop Items
                </a>
                <span className="mx-1.5 text-slate-600">/</span>
              <span className="text-sky-400"><h1 className="inline text-xs font-semibold">{pageTitle}</h1></span>
              </p>
            </div>
          </div>
        </div>
        <main className="mx-auto max-w-7xl px-4 py-12">
          <EmptyState
            title="Something went wrong"
            description={error}
            icon={Sparkles}
            actions={[
              { label: "Try Again", onClick: () => window.location.reload() },
            ]}
            compact
          />
        </main>
      </div>
    );
  }

  return (
    <div className="bg-slate-950">
      <ShopNavbar />

      {/*
        Desktop/tablet (md+): the page is locked to 100dvh, the navbar is fixed
        on top, and only the two panels below scroll independently.
        Mobile (<md): normal page scrolling, sections stack vertically.
      */}
      <div className="flex min-h-screen flex-col pt-16 md:h-dvh md:min-h-0 md:overflow-hidden">
        {/* Slim header bar: breadcrumb + category info + search/toggle */}
        <div className="shrink-0 border-b border-white/[0.04] bg-white/[0.01]">
          <div className="mx-auto max-w-7xl px-4 py-2.5 md:py-3">
            <p className="text-xs text-slate-500">
              <a href="/" className="transition-colors hover:text-sky-400">
                Home
              </a>
              <span className="mx-1.5 text-slate-600">/</span>
              <a
                href="/shop-items"
                className="transition-colors hover:text-sky-400">
                Shop Items
              </a>
              <span className="mx-1.5 text-slate-600">/</span>
              <span className="text-sky-400">{heading}</span>
            </p>
            <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-white">
                  {heading}
                </h1>
                {category?.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {/* Search input */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-1.5 pl-8 pr-7 text-xs text-white placeholder-white/30 outline-none transition-colors focus:border-sky-400/40 focus:bg-white/[0.05] sm:w-48"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {!loading && (
                  <span className="shrink-0 text-xs text-slate-500">
                    {filteredProducts.length}{" "}
                    {filteredProducts.length === 1 ? "item" : "items"}
                    {inStockCount < filteredProducts.length && (
                      <span className="ml-1 text-amber-500/60">
                        ({inStockCount} in stock)
                      </span>
                    )}
                  </span>
                )}
                <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode === "grid"
                        ? "bg-sky-400/15 text-sky-400"
                        : "text-white/30 hover:text-white/60"
                    }`}>
                    <Grid3X3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode === "list"
                        ? "bg-sky-400/15 text-sky-400"
                        : "text-white/30 hover:text-white/60"
                    }`}>
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two independently scrolling panels (md+) / stacked sections (mobile) */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* LEFT: product list */}
          <section className="min-h-0 w-full overflow-y-auto overscroll-contain md:w-2/5 md:shrink-0 md:border-r md:border-white/[0.04]">
            <div className="p-4 md:p-3 lg:p-4">
              {/* Delivery notice on mobile only (desktop shows it in details) */}
              <div className="mb-4 block md:hidden">
                <DeliveryNotice />
              </div>

              {loading ? (
                <ProductsGridSkeleton />
              ) : products.length === 0 ? (
                <EmptyState
                  title="No products found"
                  description="This category doesn't have any products yet."
                  icon={ShoppingBag}
                  compact
                />
              ) : filteredProducts.length === 0 ? (
                <EmptyState
                  title="No matching items"
                  description={`No items match "${searchQuery}". Try a different search term.`}
                  icon={Search}
                  actions={[
                    { label: "Clear search", onClick: () => setSearchQuery("") },
                  ]}
                  compact
                />
              ) : viewMode === "grid" ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product, i) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      onSelect={handleSelect}
                      index={i}
                      selected={product._id === selectedProduct?._id}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const isSelected = product._id === selectedProduct?._id;
                    return (
                      <div
                        key={product._id}
                        onClick={() => handleSelect(product)}
                        data-selected-product={isSelected ? "true" : undefined}
                        className={`group flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-all md:p-3 ${
                          isSelected
                            ? "border-sky-400/40 bg-sky-400/[0.07]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.05]"
                        }`}>
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-900 md:h-20 md:w-20 md:rounded-xl">
                          {product.images?.[0] ? (
                            <ShopImage
                              src={product.images[0]}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              width={80}
                              height={80}
                            />
                          ) : (
                            <ShoppingBag className="h-full w-full p-4 text-white/10" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {product.brand && (
                            <p className="text-[10px] font-medium uppercase tracking-wider text-sky-400/60 md:text-[11px]">
                              {product.brand}
                            </p>
                          )}
                          <h3 className="mt-0.5 line-clamp-2 text-xs font-medium text-white transition-colors group-hover:text-sky-300 md:text-sm">
                            {product.name}
                          </h3>
                          {product.shortDescription && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 md:mt-1 md:text-xs">
                              {product.shortDescription}
                            </p>
                          )}
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-sm font-bold text-sky-400 md:text-base">
                              {formatPrice(product.pricing.sellingPrice)}
                            </span>
                            {product.pricing.mrp &&
                              product.pricing.mrp >
                                product.pricing.sellingPrice && (
                                <span className="text-[11px] text-white/30 line-through md:text-xs">
                                  {formatPrice(product.pricing.mrp)}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: product details (independent scroll) */}
          <section
            ref={rightPanelRef}
            className="hidden min-h-0 flex-1 overflow-y-auto overscroll-contain md:block">
            <div className="mx-auto max-w-3xl p-4 md:p-6 lg:p-8">
              {selectedProduct ? (
                <>
                  <DeliveryNotice />
                  <div className="mt-4">
                    <ProductDetail
                      product={selectedProduct}
                      onBack={handleBackToList}
                    />
                  </div>
                </>
              ) : (
                <div className="flex min-h-[50dvh] flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400/10 ring-1 ring-sky-400/20">
                    <Package className="h-7 w-7 text-sky-400" />
                  </div>
                  <p className="text-sm font-medium text-white/80">
                    Select a product to view details
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Click any item from the list on the left.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Mobile detail fullscreen modal */}
      <AnimatePresence>
        {showMobileDetail && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col bg-slate-950 md:hidden"
            style={{ height: "100dvh" }}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-slate-950/90 px-3 py-3 backdrop-blur-xl">
              <span className="text-sm font-medium text-white/50">
                Product Details
              </span>
              <button
                type="button"
                onClick={handleBackToList}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition-colors hover:border-white/20 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 pb-8">
                <ProductDetail product={selectedProduct} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer />
    </div>
  );
}
