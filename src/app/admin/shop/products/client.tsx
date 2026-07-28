"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { shopProductApiService, shopCategoryApiService } from "@/lib/sanity-api-service";
import { Package, Plus, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/store/confirm-store";
import ShopProductCard from "@/components/shop/shop-product-card";
import ShopProductDetailModal from "@/components/shop/shop-product-detail-modal";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import CategoryGroup from "@/components/inventory/category-group";

const formatCurrency = (amount: number) => {
  if (amount < 1000) return `\u20B9${amount.toFixed(0)}`;
  const k = amount / 1000;
  const decimals = k < 10 ? 1 : 0;
  return `\u20B9${k.toFixed(decimals)}K`;
};

export default function ShopProductsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [viewProduct, setViewProduct] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        shopProductApiService.getAll(),
        shopCategoryApiService.getAll(),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmDialog({
      title: "Delete Product",
      description: `Delete "${name}"? This cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      const res = await shopProductApiService.delete(id);
      if (res.success) {
        toast.success("Product deleted");
        loadData();
      } else {
        toast.error(res.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const filtered = useMemo(() => {
    let result = [...products];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((p) => p.name?.toLowerCase().includes(q));
    }
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category?.name === selectedCategory);
    }

    return result;
  }, [products, searchTerm, selectedCategory]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, any[]>();
    filtered.forEach((product) => {
      const catName = product.category?.name || "Uncategorized";
      const mapped = {
        ...product,
        inventory: { currentStock: Number(product.stockCount || 0) },
        pricing: {
          ...(product.pricing || {}),
          purchasePrice: Number(product.pricing?.buyerPrice || 0),
        },
      };
      if (!groups.has(catName)) groups.set(catName, []);
      groups.get(catName)!.push(mapped);
    });
    return groups;
  }, [filtered]);

  const sortedCategories = useMemo(() => {
    return Array.from(groupedByCategory.keys()).sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [groupedByCategory]);

  const toggleCategory = (cat: string) => {
    setOpenCategory((prev) => (prev === cat ? null : cat));
  };

  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + Number(p.pricing?.buyerPrice || 0) * Number(p.stockCount || 0), 0),
    [products],
  );

  const lowStockCount = useMemo(
    () => products.filter((p) => p.stockCount > 0 && p.stockCount <= (p.lowStockThreshold || 5)).length,
    [products],
  );

  const outOfStockCount = useMemo(
    () => products.filter((p) => !p.inStock || p.stockCount === 0).length,
    [products],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-2 text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-bold text-white">Shop Products</h1>
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push("/admin/shop")} variant="outline" size="sm" className="gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <Button onClick={() => router.push("/admin/shop/products/new")} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: "Products", value: products.length, icon: <Package className="w-4 h-4 text-blue-400" />, bg: "bg-blue-600/20", valueClass: "text-white" },
            { label: "Value", value: formatCurrency(totalValue), icon: <TrendingUp className="w-4 h-4 text-purple-400" />, bg: "bg-green-600/20", valueClass: "text-purple-400" },
            { label: "Low Stock", value: lowStockCount, icon: <Package className="w-4 h-4 text-yellow-400" />, bg: "bg-yellow-600/20", valueClass: "text-white" },
            { label: "Out of Stock", value: outOfStockCount, icon: <Package className="w-4 h-4 text-red-400" />, bg: "bg-red-600/20", valueClass: "text-white" },
          ].map((stat, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg max-sm:hidden ${stat.bg}`}>{stat.icon}</div>
              <div>
                <p className="text-[11px] text-gray-400">{stat.label}</p>
                <p className={`text-base font-bold ${stat.valueClass}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="py-2 px-1 z-40 -top-3 sticky bg-slate-900">
        <InventoryFilters
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          categories={categories.filter((c) => groupedByCategory.has(c.name))}
          onSearchChange={setSearchTerm}
          onCategoryChange={setSelectedCategory}
        />
      </div>

      {/* Category groups */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] sm:text-xs text-gray-500">
            {sortedCategories.length} categories · {filtered.length} items
          </span>
        </div>

        {sortedCategories.length === 0 ? (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <Package className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-xs">No products found</p>
          </div>
        ) : (
          sortedCategories.map((catName) => (
            <CategoryGroup
              key={catName}
              categoryName={catName}
              products={groupedByCategory.get(catName) || []}
              open={openCategory === catName}
              onToggle={() => toggleCategory(catName)}
              renderProduct={(product) => (
                <ShopProductCard
                  key={product._id}
                  product={product}
                  onEdit={(p) => router.push(`/admin/shop/products/${p._id}`)}
                  onDelete={(p) => handleDelete(p._id, p.name)}
                  onView={setViewProduct}
                />
              )}
            />
          ))
        )}
      </div>

      <ShopProductDetailModal
        product={viewProduct}
        isOpen={!!viewProduct}
        onClose={() => setViewProduct(null)}
        onEdit={(p) => router.push(`/admin/shop/products/${p._id}`)}
        onDelete={(p) => handleDelete(p._id, p.name)}
      />
    </div>
  );
}
