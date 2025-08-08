"use client";

import { useInventoryManagement } from "@/hooks/use-inventory-management";
import { InventoryHeader } from "@/components/inventory/inventory-header";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { InventoryDialogs } from "@/components/inventory/inventory-dialogs";

export default function InventoryPage() {
  const {
    products,
    brands,
    categories,
    isLoading,
    selectedProduct,
    searchTerm,
    selectedCategory,
    selectedBrand,
    sortBy,
    sortOrder,
    showDeleteDialog,
    showEditDialog,
    setSearchTerm,
    setSelectedCategory,
    setSelectedBrand,
    setSortBy,
    setSortOrder,
    handleDeleteProduct,
    confirmDelete,
    handleEditProduct,
    handleUpdateProduct,
    setShowDeleteDialog,
    setShowEditDialog,
    getStockStatus,
    getTotalValue,
    getLowStockCount,
    getOutOfStockCount,
    router,
  } = useInventoryManagement();

  return (
    <div className="space-y-6 max-md:pb-4">
      <InventoryHeader
        onAddProduct={() => router.push("/admin/inventory/add")}
        totalProducts={products.length}
        totalValue={getTotalValue()}
        lowStockCount={getLowStockCount()}
        outOfStockCount={getOutOfStockCount()}
      />

      <InventoryFilters
        searchTerm={searchTerm}
        selectedCategory={selectedCategory}
        selectedBrand={selectedBrand}
        sortBy={sortBy}
        sortOrder={sortOrder}
        categories={categories}
        brands={brands}
        onSearchChange={setSearchTerm}
        onCategoryChange={setSelectedCategory}
        onBrandChange={setSelectedBrand}
        onSortChange={setSortBy}
        onSortOrderToggle={() =>
          setSortOrder(sortOrder === "asc" ? "desc" : "asc")
        }
      />

      <InventoryTable
        products={products}
        isLoading={isLoading}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        getStockStatus={getStockStatus}
      />

      <InventoryDialogs
        showDeleteDialog={showDeleteDialog}
        showEditDialog={showEditDialog}
        selectedProduct={selectedProduct}
        onDeleteConfirm={confirmDelete}
        onEditSave={handleUpdateProduct}
        onDeleteCancel={() => setShowDeleteDialog(false)}
        onEditCancel={() => setShowEditDialog(false)}
      />
    </div>
  );
}