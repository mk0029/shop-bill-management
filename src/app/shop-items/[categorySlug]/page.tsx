"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Sparkles,
  Grid3X3,
  List,
  X,
  Search,
} from "lucide-react";
import {
  fetchShopProductsByCategory,
  fetchShopCategoryBySlug,
  getSanityImageUrl,
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

export default function CategoryDetailPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
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

  const handleSelect = useCallback((product: ShopProduct) => {
    setSelectedProduct(product);
    setShowMobileDetail(true);
  }, []);

  const handleBackToList = useCallback(() => {
    setShowMobileDetail(false);
  }, []);

  const heading =
    category?.name ||
    categorySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
                <span className="text-sky-400">{heading}</span>
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
    <div className="min-h-screen bg-slate-950">
      <ShopNavbar />

      {/* Breadcrumb */}
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
              <span className="text-sky-400">{heading}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Category info bar */}
      <div className="border-b border-white/[0.04] bg-white/[0.01]">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {category?.description && (
                <p className="hidden text-sm text-slate-400 sm:block">
                  {category.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
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
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
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
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Delivery notice on mobile */}
        <div className="mb-4 block lg:hidden">
          <DeliveryNotice />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Product grid / list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`w-full ${selectedProduct ? "lg:w-2/5" : "lg:w-full"}`}
          >
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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product, i) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onSelect={handleSelect}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((product, i) => (
                  <div
                    key={product._id}
                    onClick={() => handleSelect(product)}
                    className="group flex cursor-pointer items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all hover:border-white/[0.12] hover:bg-white/[0.05]"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900">
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
          </motion.div>

          {/* Desktop detail panel */}
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden w-full lg:block lg:w-3/5 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pl-4"
            >
              <div className="sticky top-0">
                <DeliveryNotice />
                <div className="mt-4">
                  <ProductDetail product={selectedProduct} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Mobile detail fullscreen modal */}
      <AnimatePresence>
        {showMobileDetail && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col bg-slate-950 lg:hidden"
            style={{ height: "100dvh" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-slate-950/90 px-3 py-3 backdrop-blur-xl">
              <span className="text-sm font-medium text-white/50">
                Product Details
              </span>
              <button
                type="button"
                onClick={handleBackToList}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition-colors hover:border-white/20 hover:text-white"
              >
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
