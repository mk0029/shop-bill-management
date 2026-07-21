"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Sparkles, Search, X } from "lucide-react";
import { fetchShopCategories, type ShopCategory } from "@/lib/shop-queries";
import { matchesSearch } from "@/lib/search-utils";
import { CategoryCard } from "@/components/shop/CategoryCard";
import { ShopNavbar } from "@/components/shop/ShopNavbar";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";

function CategoriesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6"
        >
          <Skeleton className="mb-4 h-14 w-14 rounded-2xl" />
          <Skeleton className="mb-2 h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-4 h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function ShopItemsClient() {
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const categorySearchData = useMemo(
    () =>
      categories.map((c) => ({
        id: c._id,
        text: [c.name, c.description].filter(Boolean).join(" "),
      })),
    [categories],
  );

  const filteredCategories = useMemo(
    () =>
      !searchQuery.trim()
        ? categories
        : categories.filter((c) => {
            const data = categorySearchData.find((d) => d.id === c._id);
            return data ? matchesSearch(searchQuery, data.text) : false;
          }),
    [categories, searchQuery, categorySearchData],
  );

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchShopCategories();
        const shuffled = [...data];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setCategories(shuffled);
      } catch {
        setError("Failed to load categories. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <ShopNavbar />

      {/* Page title bar */}
      <div className="pt-16">
        <div className="border-b border-white/[0.04] bg-white/[0.01]">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <p className="text-xs text-slate-500">
              <a href="/" className="hover:text-sky-400 transition-colors">Home</a>
              <span className="mx-1.5 text-slate-600">/</span>
              <span className="text-sky-400">Shop Items</span>
            </p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-500/[0.03] to-transparent" />
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-sky-500/[0.04] blur-3xl" />
        <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-violet-500/[0.03] blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 text-center sm:py-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/10 ring-1 ring-white/5 md:mb-5 md:h-16 md:w-16 md:rounded-2xl"
          >
            <ShoppingBag className="h-6 w-6 text-sky-400 md:h-8 md:w-8" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-white sm:text-4xl"
          >
            Browse Electrical Items
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-2 text-xs text-slate-400 md:mt-3 md:text-sm"
          >
            Select a category to browse our collection of electrical products
          </motion.p>
        </div>
      </section>

      {/* Categories grid */}
      <main className="mx-auto max-w-7xl px-4 py-5 md:py-8">
        {/* Search input */}
        <div className="relative mb-5 max-w-md md:mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pl-10 pr-9 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-sky-400/40 focus:bg-white/[0.05]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {loading ? (
          <CategoriesSkeleton />
        ) : error ? (
          <EmptyState
            title="Something went wrong"
            description={error}
            icon={Sparkles}
            actions={[
              {
                label: "Try Again",
                onClick: () => window.location.reload(),
              },
            ]}
            compact
          />
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Shop categories will appear here once they are added."
            icon={ShoppingBag}
            compact
          />
        ) : filteredCategories.length === 0 ? (
          <EmptyState
            title="No matching categories"
            description={`No categories match "${searchQuery}". Try a different search term.`}
            icon={Search}
            actions={[
              { label: "Clear search", onClick: () => setSearchQuery("") },
            ]}
            compact
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-5">
            {filteredCategories.map((cat, i) => (
              <CategoryCard key={cat._id} category={cat} index={i} />
            ))}
          </div>
        )}
      </main>

      <CartDrawer />
    </div>
  );
}
