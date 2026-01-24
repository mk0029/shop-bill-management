"use client";

import AdminDataHydrator from "@/components/admin/admin-data-hydrator";
import { useInventoryManagement } from "@/hooks/use-inventory-management";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { InventoryDialogs } from "@/components/inventory/inventory-dialogs";
import { RealtimeInventoryHeader } from "@/components/inventory/realtime-inventory-header";

export type AdminInventoryClientProps = {
  products: Array<Record<string, any>>;
  brands: Array<Record<string, any>>;
  categories: Array<Record<string, any>>;
};

export default function AdminInventoryClient({
  products,
  brands,
  categories,
}: AdminInventoryClientProps) {
  const {
    products: storeProducts,
    brands: storeBrands,
    categories: storeCategories,
    isLoading,
    selectedProduct,
    searchTerm,
    selectedCategory,
    selectedBrand,
    sortBy,
    sortOrder,
    timeFilter,
    dateFrom,
    dateTo,
    showDeleteDialog,
    showEditDialog,
    setSearchTerm,
    setSelectedCategory,
    setSelectedBrand,
    setSortBy,
    setSortOrder,
    setTimeFilter,
    setDateFrom,
    setDateTo,
    handleDeleteProduct,
    confirmDelete,
    handleEditProduct,
    setShowDeleteDialog,
    setShowEditDialog,
    getStockStatus,
    getTotalValue,
    getLowStockCount,
    getOutOfStockCount,
    router,
  } = useInventoryManagement();

  const effectiveProducts = storeProducts?.length ? storeProducts : products;
  const effectiveBrands = storeBrands?.length ? storeBrands : brands;
  const effectiveCategories = storeCategories?.length
    ? storeCategories
    : categories;

  return (
    <>
      <AdminDataHydrator
        products={products}
        brands={brands}
        categories={categories}
      />
      <div className="space-y-6 max-md:space-y-4 max-md:pb-4">
        <RealtimeInventoryHeader
          onAddProduct={() => router.push("/admin/inventory/add")}
          totalProducts={effectiveProducts.length}
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
          timeFilter={timeFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          categories={effectiveCategories}
          brands={effectiveBrands}
          onSearchChange={setSearchTerm}
          onCategoryChange={setSelectedCategory}
          onBrandChange={setSelectedBrand}
          onSortChange={setSortBy}
          onSortOrderToggle={() =>
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
          }
          onTimeFilterChange={setTimeFilter}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />

        <InventoryTable
          products={effectiveProducts}
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
          onDeleteCancel={() => setShowDeleteDialog(false)}
          onEditCancel={() => setShowEditDialog(false)}
        />
      </div>
    </>
  );
}
