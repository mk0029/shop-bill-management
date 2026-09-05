"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Dropdown } from "./dropdown";

interface Product {
  _id: string;
  name: string;
  brand?: string;
  category?: string;
}

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: (selectedIds: string[]) => void;
  initialSelected?: string[];
}

const ITEMS_PER_PAGE = 24;

export function ProductSelectionModal({
  isOpen,
  onClose,
  onDone,
  initialSelected = [],
}: ProductSelectionModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [page, setPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    const load = async () => {
      try {
        const { sanityClient } = await import("@/lib/sanity");
        const data = await sanityClient.fetch<Product[]>(
          `*[_type == "shopProduct" && isActive == true] | order(name asc){_id, name, brand, "category": category->name}`,
        );
        if (active && Array.isArray(data)) setProducts(data);
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => { setPage(1); }, [search, brandFilter, categoryFilter]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => { if (p.brand) set.add(p.brand); });
    return Array.from(set).sort();
  }, [products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => { if (p.category) set.add(p.category); });
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (brandFilter) list = list.filter((p) => p.brand === brandFilter);
    if (categoryFilter) list = list.filter((p) => p.category === categoryFilter);
    return list;
  }, [products, search, brandFilter, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      paged.forEach((p) => next.add(p._id));
      return Array.from(next);
    });
  };

  const clearSelection = () => setSelected([]);

  const handleDone = () => { onDone(selected); onClose(); };

  const brandOptions = useMemo(
    () => [{ value: "", label: "All Brands" }, ...brands.map((b) => ({ value: b, label: b }))],
    [brands],
  );
  const categoryOptions = useMemo(
    () => [{ value: "", label: "All Categories" }, ...categories.map((c) => ({ value: c, label: c }))],
    [categories],
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative mx-4 flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-slate-950 shadow-2xl backdrop-blur-2xl"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 top-0 h-[80px] bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

            {/* Sticky Header */}
            <div className="sticky top-0 z-20 shrink-0 border-b border-white/[0.08] bg-slate-950/95 backdrop-blur-xl">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="text-lg font-semibold text-white/90">Select Products</h2>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/40 transition hover:bg-white/[0.12] hover:text-white/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search & Filters */}
              <div className="space-y-3 px-5 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-cyan-400/30"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Dropdown
                      options={brandOptions}
                      value={brandFilter}
                      onValueChange={setBrandFilter}
                      placeholder="All Brands"
                      searchable={brandOptions.length > 10}
                    />
                  </div>
                  <div className="flex-1">
                    <Dropdown
                      options={categoryOptions}
                      value={categoryFilter}
                      onValueChange={setCategoryFilter}
                      placeholder="All Categories"
                      searchable={categoryOptions.length > 10}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500">No products found</div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{filtered.length} products</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-[11px] font-medium text-cyan-400 transition hover:text-cyan-300"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="text-[11px] font-medium text-gray-400 transition hover:text-gray-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {paged.map((p) => {
                      const isSelected = selected.includes(p._id);
                      return (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => toggle(p._id)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition",
                            isSelected
                              ? "border-cyan-500/40 bg-cyan-500/12 text-white"
                              : "border-white/[0.06] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                              isSelected
                                ? "border-cyan-400 bg-cyan-400"
                                : "border-white/20",
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                            {(p.brand || p.category) && (
                              <p className="truncate text-[10px] text-gray-500">
                                {[p.brand, p.category].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-gray-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs text-gray-400">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-gray-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-20 shrink-0 border-t border-white/[0.08] bg-slate-950/95 backdrop-blur-xl px-5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-cyan-400">
                  {selected.length} product{selected.length !== 1 ? "s" : ""} selected
                </span>
                <div className="flex gap-3">
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleDone}>
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
