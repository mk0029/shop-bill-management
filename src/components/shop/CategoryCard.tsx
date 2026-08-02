"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShopImage } from "@/components/ui/shop-image";
import {
  Zap,
  Lightbulb,
  Cable,
  Settings,
  Plug,
  Battery,
  Wrench,
  Shield,
  Fan,
  Speaker,
  type LucideIcon,
} from "lucide-react";
import { type ShopCategory } from "@/lib/shop-queries";

const iconMap: Record<string, LucideIcon> = {
  zap: Zap,
  lightbulb: Lightbulb,
  cable: Cable,
  settings: Settings,
  plug: Plug,
  battery: Battery,
  wrench: Wrench,
  shield: Shield,
  fan: Fan,
  speaker: Speaker,
};

export function CategoryCard({
  category,
  index = 0,
}: {
  category: ShopCategory;
  index?: number;
}) {
  const { name, slug, description, icon, image, productCount } = category;
  const IconComponent = iconMap[icon || ""] || Zap;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
    >
      <Link href={`/shop-items/${slug.current}`} className="group block">
        <div className="glass-card relative h-full overflow-hidden rounded-xl transition-all duration-500 hover:-translate-y-0.5 md:rounded-2xl md:hover:-translate-y-1">
          {image && (
            <div className="absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30">
              <ShopImage
                src={image}
                alt={name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="relative z-10 p-4 md:p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/10 ring-1 ring-white/5 transition-all duration-500 group-hover:from-sky-500/30 group-hover:to-violet-500/20 group-hover:ring-sky-400/25 md:mb-4 md:h-14 md:w-14 md:rounded-2xl">
              <IconComponent className="h-5 w-5 text-sky-400 transition-transform duration-500 group-hover:scale-110 md:h-7 md:w-7" />
            </div>
            <h3 className="text-base font-semibold text-white transition-colors duration-300 group-hover:text-sky-300 md:text-lg">
              {name}
            </h3>
            {description && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400 md:mt-2 md:text-sm">
                {description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3 md:mt-4">
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/15 bg-sky-400/5 px-2 py-0.5 text-[10px] font-medium text-sky-400 md:gap-1.5 md:px-3 md:py-1 md:text-xs">
                <Zap className="h-2.5 w-2.5 md:h-3 md:w-3" />
                {productCount} {productCount === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
