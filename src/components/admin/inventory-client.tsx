"use client";

import { useState, useMemo } from "react";
import { useInventoryManagement } from "@/hooks/use-inventory-management";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { RealtimeInventoryHeader } from "@/components/inventory/realtime-inventory-header";
import { InventoryDialogs } from "@/components/inventory/inventory-dialogs";
import CategoryGroup from "@/components/inventory/category-group";
import ProductCard from "@/components/inventory/product-card";
import ProductDetailModal from "@/components/inventory/product-detail-modal";
import { useAuthStore } from "@/store/auth-store";
import { Package, Loader2 } from "lucide-react";

export default function AdminInventoryClient() {
  const { role } = useAuthStore();
  const isTechnician = role === "technician";
  const {
    products: storeProducts,
    categories: storeCategories,
    isLoading,
    selectedProduct,
    searchTerm,
    selectedCategory,
    showDeleteDialog,
    showEditDialog,
    setSearchTerm,
    setSelectedCategory,
    handleDeleteProduct,
    confirmDelete,
    handleEditProduct,
    setShowDeleteDialog,
    setShowEditDialog,
    getTotalValue,
    getLowStockCount,
    getOutOfStockCount,
    router,
  } = useInventoryManagement();

  const effectiveProducts = storeProducts || [];
  const effectiveCategories = storeCategories || [];

  // Single open category at a time
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [viewProduct, setViewProduct] = useState<any | null>(null);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, any[]>();
    effectiveProducts.forEach((product) => {
      const catName = product.category?.name || "Uncategorized";
      if (!groups.has(catName)) groups.set(catName, []);
      groups.get(catName)!.push(product);
    });
    return groups;
  }, [effectiveProducts]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-2 text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RealtimeInventoryHeader
        onAddProduct={() => router.push("/admin/inventory/add")}
        totalProducts={effectiveProducts.length}
        totalValue={getTotalValue()}
        lowStockCount={getLowStockCount()}
        outOfStockCount={getOutOfStockCount()}
        isTechnician={isTechnician}
      />

      <div
        className="py-2 px-1 z-40 -top-3 sticky bg-slate-900
    "
      >
        {" "}
        <InventoryFilters
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          categories={effectiveCategories}
          onSearchChange={setSearchTerm}
          onCategoryChange={setSelectedCategory}
        />
      </div>
      {/* Products grouped by category */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] sm:text-xs text-gray-500">
            {sortedCategories.length} categories · {effectiveProducts.length}{" "}
            items
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
                <ProductCard
                  key={product._id}
                  product={product}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  onView={setViewProduct}
                  onManageOffer={(p) => {
                    const productId = p._id || p.productId
                    router.push(`/admin/offers?productId=${productId}`)
                  }}
                  isTechnician={isTechnician}
                />
              )}
            />
          ))
        )}
      </div>

      <InventoryDialogs
        showDeleteDialog={showDeleteDialog}
        showEditDialog={showEditDialog}
        selectedProduct={selectedProduct}
        onDeleteConfirm={confirmDelete}
        onDeleteCancel={() => setShowDeleteDialog(false)}
        onEditCancel={() => setShowEditDialog(false)}
      />

      <ProductDetailModal
        product={viewProduct}
        isOpen={!!viewProduct}
        onClose={() => setViewProduct(null)}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
        isTechnician={isTechnician}
      />
    </div>
  );
}
