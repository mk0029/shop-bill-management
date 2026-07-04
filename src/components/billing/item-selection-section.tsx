/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Package } from "lucide-react";

const glassCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

const glassInputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(16px)",
  borderRadius: "12px",
};

interface ItemSelectionSectionProps {
  categories: any[];
  activeProducts: any[];
  productsLoading: boolean;
  searcItemsClass?: string;
  searcHeaderClass?: string;
  searcCardClass?: string;
  onOpenItemModal: (category: string) => void;
}

export const ItemSelectionSection = ({
  categories,
  activeProducts,
  productsLoading,
  onOpenItemModal,
  searcItemsClass,
  searcCardClass,
  searcHeaderClass,
}: ItemSelectionSectionProps) => {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const filteredCategories = categories.filter((category) => {
    const name = (category.name || "").toLowerCase();
    const matchesDropdown = categoryFilter === "all" || name === categoryFilter;
    const matchesSearch =
      !searchTerm || name.includes(searchTerm.toLowerCase());
    return matchesDropdown && matchesSearch;
  });

  return (
    <div style={glassCardStyle} className={cn("p-5 sm:p-6", searcCardClass)}>
      <div className="flex items-center gap-2 mb-5">
        <Package className="w-5 h-5" style={{ color: "rgba(56,189,248,0.6)" }} />
        <h3 className="text-white font-semibold text-base">Bill Items</h3>
      </div>

      <div className={cn("mb-4", searcHeaderClass)}>
        <Label className="text-sm text-slate-300 mb-2 block">Filter by Category</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(148,163,184,0.4)" }} />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to filter categories"
            className="pl-9"
            style={glassInputStyle}
          />
        </div>
      </div>

      <div className={cn("max-h-[200px] overflow-auto", searcItemsClass)}>
        <div className="flex flex-wrap gap-2 mb-3">
          {filteredCategories.map((category) => (
            <motion.div
              key={category._id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0.1, filter: "blur(1px)" }}
              whileInView={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.3, ease: "linear" }}
              viewport={{ once: false, amount: 0.5 }}
            >
              <div
                onClick={() => onOpenItemModal(category.name.toLowerCase())}
                className="px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                <p className="font-medium text-white text-xs">{category.name}</p>
              </div>
            </motion.div>
          ))}
          {categoryFilter !== "all" && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0.1, filter: "blur(1px)" }}
              whileInView={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.3, ease: "linear" }}
              viewport={{ once: false, amount: 0.5 }}
            >
              <div
                onClick={() => setCategoryFilter("all")}
                className="cursor-pointer pt-2"
              >
                <p className="text-sm" style={{ color: "rgba(148,163,184,0.6)" }}>Reset Items</p>
              </div>
            </motion.div>
          )}

          {productsLoading && (
            <div className="col-span-full text-center py-8">
              <div className="h-6 w-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm" style={{ color: "rgba(148,163,184,0.5)" }}>Loading categories...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
