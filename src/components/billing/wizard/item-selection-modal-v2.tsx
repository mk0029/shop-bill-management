"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Plus, ShoppingCart,
  Star, Clock, LayoutGrid, List, ChevronDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/inventory-helpers";

const LS_RECENT = "bill_item_recent";
const LS_FAVORITES = "bill_item_favorites";

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_RECENT) || "[]"); } catch { return []; }
}
function addRecent(id: string) {
  try {
    const arr = getRecent().filter((i) => i !== id);
    arr.unshift(id);
    localStorage.setItem(LS_RECENT, JSON.stringify(arr.slice(0, 20)));
  } catch {}
}
function getFavorites(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_FAVORITES) || "[]")); } catch { return new Set(); }
}
function toggleFavorite(id: string) {
  try {
    const set = getFavorites();
    if (set.has(id)) set.delete(id); else set.add(id);
    localStorage.setItem(LS_FAVORITES, JSON.stringify([...set]));
  } catch {}
}

const glassModal: React.CSSProperties = {
  background: "rgba(15,23,42,0.7)",
  backdropFilter: "blur(32px) saturate(160%)",
  WebkitBackdropFilter: "blur(32px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 25px 60px rgba(0,0,0,0.5)",
};


interface ItemSelectionModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  activeProducts: any[];
  categories: any[];
  brands: any[];
  onAddItem: (product: any) => void;
  selectedItems: any[];
  onUpdateQuantity: (itemId: string, quantity: number, maxStock?: number) => void;
  onRemoveItem: (itemId: string) => void;
  onOpenManualItem: () => void;
  productsLoading: boolean;
}

export function ItemSelectionModalV2({
  isOpen,
  onClose,
  activeProducts,
  categories,
  brands,
  onAddItem,
  selectedItems,
  onUpdateQuantity,
  onRemoveItem,
  onOpenManualItem,
  productsLoading,
}: ItemSelectionModalV2Props) {
  const [search, setSearch] = useState("");
  const [catValue, setCatValue] = useState("");
  const [prodValue, setProdValue] = useState("");
  const [viewMode, setViewMode] = useState<"compact" | "grid">("compact");
  const [favorites, setFavorites] = useState<Set<string>>(getFavorites);
  const searchRef = useRef<HTMLInputElement>(null);
  const [catSearch, setCatSearch] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch(""); setCatValue(""); setProdValue("");
      setCatSearch(""); setOpenCategory(null);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) { window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }
  }, [isOpen, onClose]);

  const recentIds = useMemo(() => isOpen ? getRecent() : [], [isOpen]);

  const selectedMap = useMemo(() => {
    const m: Record<string, any> = {};
    selectedItems.forEach((i) => { m[i.id] = i; });
    return m;
  }, [selectedItems]);

  const filteredProducts = useMemo(() => {
    let items = activeProducts.filter((p) => p.isActive !== false);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.brand?.name?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q) ||
          Object.values(p.specifications || {}).some((v: any) => String(v).toLowerCase().includes(q)),
      );
    } else if (catValue) {
      items = items.filter((p) => p.category?.name === catValue || p.category?._id === catValue);
    }

    return items;
  }, [activeProducts, catValue, search]);

  const recentProducts = useMemo(() => {
    if (!search && !catValue) {
      return recentIds.map((id) => activeProducts.find((p) => p._id === id)).filter(Boolean);
    }
    return [];
  }, [recentIds, activeProducts, search, catValue]);

  const favoriteProducts = useMemo(() => {
    if (!search && !catValue) {
      return activeProducts.filter((p) => favorites.has(p._id));
    }
    return [];
  }, [favorites, activeProducts, search, catValue]);

  const selectedProduct = useMemo(() => {
    if (prodValue) return filteredProducts.find((p) => p._id === prodValue) || null;
    return null;
  }, [prodValue, filteredProducts]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, any[]>();
    filteredProducts.forEach((product) => {
      const name = product.category?.name || "Uncategorized";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(product);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [filteredProducts]);


  const totalSelectedPrice = useMemo(() =>
    selectedItems.reduce((s, i) => s + Number(i.total), 0),
    [selectedItems]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((category: any) =>
    !catSearch || category.name?.toLowerCase().includes(catSearch.toLowerCase()),
  );
  const activeCategory = catValue || "all";

  const selectProduct = (product: any) => {
    const stock = product.inventory?.currentStock ?? 0;
    if (stock <= 0) return;
    setProdValue(product._id);
  };

  const addProduct = (product: any) => {
    const stock = product.inventory?.currentStock ?? 0;
    if (stock <= 0) return;
    addRecent(product._id);
    onAddItem(product);
  };

  const productCard = (product: any) => {
    const added = !!selectedMap[product._id];
    const stock = Number(product.inventory?.currentStock ?? 0);
    const unit = product.pricing?.unit || "pcs";
    const isSelected = prodValue === product._id;

    return (
      <div
        key={product._id}
        className="group rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 transition-all hover:bg-white/[0.05]"
        style={added || isSelected ? { borderColor: "rgba(56,189,248,0.35)", background: "rgba(56,189,248,0.08)" } : undefined}
      >
        <button
          type="button"
          onClick={() => selectProduct(product)}
          disabled={stock <= 0}
          className="w-full text-left disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-xs font-medium text-white">
                {product.name || `${product.category?.name || "Unknown"} - ${product.brand?.name || "Brand"}`}
              </h4>
              <p className="mt-0.5 truncate text-[10px] text-gray-500">
                {[product.brand?.name, product.specifications?.watts ? `${product.specifications.watts}W` : ""]
                  .filter(Boolean)
                  .join(" - ")}
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleFavorite(product._id);
                setFavorites(getFavorites());
              }}
              className="rounded-md p-1 text-gray-500 hover:text-amber-300"
              aria-label="Toggle favorite"
            >
              <Star className="h-3.5 w-3.5" fill={favorites.has(product._id) ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${stock <= 0 ? "bg-red-500" : stock < 10 ? "bg-yellow-500" : "bg-green-500"}`} />
              <span className="text-[11px] text-gray-300">{stock} {unit}</span>
            </div>
            <span className="text-sm font-semibold text-white">
              {formatCurrency(product.pricing?.sellingPrice || 0)}
            </span>
          </div>
        </button>

        <div className="mt-2 flex items-center gap-2">
          {added && (
            <div className="flex min-w-0 flex-1 items-center justify-between rounded-md border border-cyan-300/15 bg-cyan-400/10 px-2 py-1">
              <span className="truncate text-[10px] text-cyan-200">In bill</span>
              <span className="text-[10px] text-cyan-300">x{selectedMap[product._id].quantity}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => addProduct(product)}
            disabled={stock <= 0}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:border-white/[0.05] disabled:bg-white/[0.03] disabled:text-slate-600"
          >
            <Plus className="h-3 w-3" />
            {added ? "Add one" : stock <= 0 ? "Out" : "Add"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[280] flex justify-end bg-black/70 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ x: "100%", opacity: 0.85 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0.85 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-l border-white/[0.08] sm:w-[min(100vw,980px)] xl:w-[min(100vw,1120px)]" style={glassModal}>
        <div className="flex min-h-[72px] flex-none items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div className="min-w-0"><div className="flex items-center gap-2 text-white"><ShoppingCart className="h-4 w-4 text-cyan-300" /><h2 className="truncate text-base font-semibold">Browse Inventory</h2></div><p className="mt-1 text-xs text-slate-500">{filteredProducts.length} products - {selectedItems.length} selected</p></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-slate-400 transition hover:text-white sm:h-11 sm:w-11" aria-label="Close inventory browser"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-none flex-col gap-2 border-b border-white/[0.06] bg-slate-950/45 px-4 py-3 sm:px-5">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, brands, category..." className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] py-2 pl-9 pr-9 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-cyan-200/35" />{search && (<button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300" aria-label="Clear search"><X className="h-4 w-4" /></button>)}</div>
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scroll"><button type="button" onClick={() => { setCatValue(""); setOpenCategory(null); }} className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] transition-all ${activeCategory === "all" ? "border-blue-500 bg-blue-600 text-white" : "border-white/[0.06] bg-white/[0.04] text-gray-400 hover:text-gray-200"}`}>All</button>{filteredCategories.map((category: any) => (<button key={category._id || category.name} type="button" onClick={() => { setCatValue(category.name); setOpenCategory(category.name); }} className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] transition-all ${activeCategory === category.name ? "border-blue-500 bg-blue-600 text-white" : "border-white/[0.06] bg-white/[0.04] text-gray-400 hover:text-gray-200"}`}>{category.name}</button>))}<button type="button" onClick={() => setViewMode(viewMode === "compact" ? "grid" : "compact")} className="ml-auto hidden shrink-0 items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 hover:text-gray-200 sm:inline-flex">{viewMode === "compact" ? <LayoutGrid className="h-3 w-3" /> : <List className="h-3 w-3" />}{viewMode === "compact" ? "Grid" : "List"}</button></div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {productsLoading ? (<div className="flex h-full items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-sm text-slate-500">Loading inventory...</div>) : filteredProducts.length === 0 ? (<div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] text-center"><ShoppingCart className="mb-3 h-9 w-9 text-slate-700" /><p className="text-sm font-medium text-slate-400">No products found</p><p className="mt-1 text-xs text-slate-600">Try search or another category</p></div>) : search || catValue ? (<div className={viewMode === "grid" ? "grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4" : "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"}>{filteredProducts.map(productCard)}</div>) : (<div className="space-y-2">{favoriteProducts.length > 0 && (<div className="rounded-lg border border-amber-300/10 bg-amber-300/[0.03] p-2"><div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-300/70"><Star className="h-3 w-3" />Favorites</div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{favoriteProducts.slice(0, 6).map(productCard)}</div></div>)}{recentProducts.length > 0 && (<div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2"><div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><Clock className="h-3 w-3" />Recently Used</div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{recentProducts.slice(0, 6).map(productCard)}</div></div>)}{groupedProducts.map(([categoryName, products]) => { const open = openCategory === categoryName; const totalStock = products.reduce((sum, product) => sum + Number(product.inventory?.currentStock || 0), 0); const outOfStock = products.filter((product) => Number(product.inventory?.currentStock || 0) === 0).length; return (<div key={categoryName} className="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]"><button type="button" onClick={() => setOpenCategory(open ? null : categoryName)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"><div className="flex min-w-0 flex-1 items-center gap-2.5"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600/15"><ShoppingCart className="h-4 w-4 text-blue-400" /></div><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold text-white">{categoryName}</h3><span className="text-[11px] text-gray-400">{products.length} - {totalStock} stk{outOfStock > 0 && <span className="text-red-400"> - {outOfStock} out</span>}</span></div></div></div><ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} /></button><AnimatePresence initial={false}>{open && (<motion.div key="category-products" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden"><div className="grid grid-cols-1 gap-2 px-2.5 pb-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.map(productCard)}</div></motion.div>)}</AnimatePresence></div>); })}</div>)}
        </div>

        {selectedProduct && (<div className="flex-none border-t border-white/[0.06] bg-slate-950/55 px-4 py-3 backdrop-blur-xl sm:px-5"><div className="flex flex-col gap-3 rounded-lg border border-cyan-300/15 bg-cyan-400/[0.06] p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{selectedProduct.name}</p><p className="mt-0.5 text-xs text-slate-500">{selectedProduct.inventory?.currentStock ?? 0} in stock - {formatCurrency(selectedProduct.pricing?.sellingPrice || 0)}</p></div><button type="button" onClick={() => addProduct(selectedProduct)} disabled={(selectedProduct.inventory?.currentStock ?? 0) <= 0} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-400/15 px-4 text-sm font-medium text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" />Add to Bill</button></div></div>)}

        <div className="flex flex-none items-center gap-3 border-t border-white/[0.06] bg-slate-950/70 px-4 py-3 backdrop-blur-xl sm:px-5"><button type="button" onClick={() => { onOpenManualItem(); onClose(); }} className="hidden rounded-lg border border-dashed border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 sm:inline-flex"><Plus className="mr-1.5 h-3.5 w-3.5" />Custom Item</button><div className="min-w-0 flex-1">{selectedItems.length > 0 ? (<div className="flex items-center gap-2 overflow-x-auto hide-scroll"><span className="shrink-0 text-xs font-medium text-white">{selectedItems.length} selected - {formatCurrency(totalSelectedPrice)}</span>{selectedItems.slice(0, 5).map((item: any) => (<div key={item.id} className="flex shrink-0 items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-1 text-[10px]"><span className="max-w-[120px] truncate text-white">{item.name}</span><span className="text-slate-500">x{item.quantity}</span><button type="button" onClick={() => onRemoveItem(item.id)} className="text-red-300/50 hover:text-red-300" aria-label="Remove selected item"><X className="h-2.5 w-2.5" /></button></div>))}</div>) : (<span className="text-xs text-slate-600">No items selected yet</span>)}</div><button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-cyan-300/20 bg-cyan-400/15 px-4 text-sm font-medium text-cyan-100">Done</button></div>
      </motion.div>
    </div>
  );
}




