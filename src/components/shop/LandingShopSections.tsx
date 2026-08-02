"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Bolt,
  Star,
} from "lucide-react";
import { ShopImage } from "@/components/ui/shop-image";
import {
  fetchShopCategories,
  type ShopCategory,
} from "@/lib/shop-queries";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveCarousel } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sectionTitles = [
  {
    eyebrow: "Shop Electricals",
    title: "Shop Electrical Essentials",
    copy: "Quality switches, sockets, wires and more for every need.",
  },
  {
    eyebrow: "Home Needs",
    title: "Popular Items for Your Home",
    copy: "Lighting, fans, holders and accessories at fair prices.",
  },
  {
    eyebrow: "Quick Buy",
    title: "Quick Buy From Our Store",
    copy: "Browse and add items to your cart. Pick up from our shop.",
  },
];

const iconMap: Record<string, string> = {
  zap: "zap",
  lightbulb: "lightbulb",
  cable: "cable",
  settings: "settings",
  plug: "plug",
  battery: "battery",
  wrench: "wrench",
  shield: "shield",
  fan: "fan",
  speaker: "speaker",
};

function ShopCategoryCard({ category }: { category: ShopCategory }) {
  return (
    <Link
      href={`/shop-items/${category.slug.current}`}
      className="group block h-full"
    >
      <div className="glass-card relative h-full overflow-hidden p-5 transition-all duration-500 hover:-translate-y-1">
        {category.image && (
          <div className="absolute inset-0 opacity-10 transition-opacity duration-500 group-hover:opacity-20">
            <ShopImage
              src={category.image}
              alt={category.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="relative z-10">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/10 ring-1 ring-white/5 transition-all duration-500 group-hover:from-sky-500/30 group-hover:to-violet-500/20 group-hover:ring-sky-400/20">
            <Bolt className="h-5 w-5 text-sky-400 transition-transform duration-500 group-hover:scale-110" />
          </div>
          <h3 className="text-base font-semibold text-white transition-colors duration-300 group-hover:text-sky-300">
            {category.name}
          </h3>
          {category.description && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
              {category.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-sky-400/60">
            <span className="rounded-full border border-sky-400/15 bg-sky-400/5 px-2 py-0.5">
              {category.productCount} items
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function LandingShopSections() {
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShopCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    if (categories.length === 0) return [[], [], []];
    const shuffled = shuffle(categories);
    const size = Math.ceil(shuffled.length / 3);
    return [
      shuffled.slice(0, size),
      shuffled.slice(size, size * 2),
      shuffled.slice(size * 2),
    ];
  }, [categories]);

  if (!loading && categories.length === 0) return null;

  return (
    <>
      {sectionTitles.map((section, sectionIdx) => {
        const group = groups[sectionIdx];
        if (!loading && group.length === 0) return null;

        return (
          <section key={sectionIdx} className="py-8 md:py-16">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 md:mb-8">
                  <div>
                    <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-[11px] font-medium tracking-wide text-sky-300/80 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse-glow" />
                      {section.eyebrow}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                      {section.title}
                    </h2>
                    {section.copy && (
                      <p className="mt-2 text-sm text-slate-400 max-w-lg">
                        {section.copy}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/shop-items"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors shrink-0 group/link"
                  >
                    View All
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </motion.div>

              {loading ? (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass-card p-5">
                      <Skeleton className="mb-3 h-11 w-11 rounded-xl" />
                      <Skeleton className="h-4 w-2/3 mb-2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <ResponsiveCarousel
                  itemsPerView={{ base: 1, sm: 2, md: 3, lg: 4 }}
                  gap={16}
                  showArrows
                  showDots
                  infinite
                >
                  {group.map((cat) => (
                    <ShopCategoryCard key={cat._id} category={cat} />
                  ))}
                </ResponsiveCarousel>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
