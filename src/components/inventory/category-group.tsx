"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package } from "lucide-react";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

interface CategoryGroupProps {
  categoryName: string;
  products: any[];
  open: boolean;
  onToggle: () => void;
  renderProduct: (product: any, index: number) => React.ReactNode;
}

export default function CategoryGroup({
  categoryName,
  products,
  open,
  onToggle,
  renderProduct,
}: CategoryGroupProps) {
  const totalValue = products.reduce(
    (sum, p) =>
      sum +
      Number(p.pricing?.purchasePrice || 0) *
        Number(p.inventory?.currentStock || 0),
    0,
  );
  const totalStock = products.reduce(
    (sum, p) => sum + Number(p.inventory?.currentStock || 0),
    0,
  );
  const outOfStock = products.filter(
    (p) => Number(p.inventory?.currentStock || 0) === 0,
  ).length;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-blue-600/15 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate text-sm">
                {categoryName}
              </h3>
              <span className="text-[11px] text-gray-400">
                {products.length} · {totalStock} stk
                {outOfStock > 0 && <span className="text-red-400"> · {outOfStock} out</span>}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs font-medium text-purple-400">
            {formatINR(totalValue)}
          </span>
          <motion.svg
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="category-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-2.5 pb-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {products.map((product, index) => renderProduct(product, index))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
