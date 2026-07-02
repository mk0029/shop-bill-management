"use client";

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Package } from "lucide-react";
import { GlassCard, GlassCardHeader } from "./GlassCard";
import { cn } from "@/lib/utils";

interface ItemsCardProps {
  bill: any;
  currency?: string;
}

export const ItemsCard = memo(function ItemsCard({
  bill,
  currency = "₹",
}: ItemsCardProps) {
  const items = bill?.items;
  if (!items?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard>
        <GlassCardHeader title={`Items (${items.length})`} />
        <div className=" px-3 sm:px-5 md:px-6 pb-6 space-y-3">
          {items.map((item: any, index: number) => (
            <ItemRow
              key={item._key || item._id || index}
              item={item}
              index={index}
              currency={currency}
            />
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
});

const ItemRow = memo(function ItemRow({
  item,
  index,
  currency,
}: {
  item: any;
  index: number;
  currency: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const name = item.product?.name || item.productName || item.name || "Item";
  const category =
    item.category ||
    item.product?.category?.name ||
    item.product?.category ||
    "";
  const qty = item.quantity || 0;
  const unitPrice = item.unitPrice || item.price || 0;
  const totalPrice = item.totalPrice || item.total || 0;
  const specs = item.specifications || item.product?.specifications;

  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const toggle = useCallback(() => setExpanded((e) => !e), []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={cn(
        "rounded-2xl border transition-all duration-300 cursor-pointer select-none",
        expanded
          ? "border-white/15 bg-white/[0.06]"
          : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/10",
      )}
      onClick={toggle}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Product icon/placeholder */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400/20 to-indigo-500/20 border border-white/10 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-white/50" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white truncate">{name}</p>
              {category && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-300/80 border border-purple-500/20 shrink-0">
                  {category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
              <span>
                Qty: <span className="text-white/70">{qty}</span>
              </span>
              <span>
                Unit: {currency}
                {unitPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Price + Chevron */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-white tabular-nums">
              {currency}
              {totalPrice.toFixed(2)}
            </span>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-white/30" />
            </motion.div>
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && specs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="glass-divider my-3" />
              <div className="text-xs text-white/40 space-y-1">
                {typeof specs === "object"
                  ? Object.entries(specs)
                      .filter(
                        ([_, v]) => v !== undefined && v !== null && v !== "",
                      )
                      .map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-white/30 capitalize">
                            {k.replace(/([a-z])([A-Z])/g, "$1 $2")}:
                          </span>
                          <span className="text-white/60">{String(v)}</span>
                        </div>
                      ))
                  : String(specs)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
