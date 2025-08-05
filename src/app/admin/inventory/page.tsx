"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { useLocaleStore } from "@/store/locale-store";
import { useInventoryStore, Product } from "@/store/inventory-store";
import { formatSpecifications, getStockStatus } from "@/lib/inventory-data";
import { useEnhancedInventory } from "@/hooks/use-enhanced-inventory";
import {
  DeleteConfirmation,
  QuickDeleteConfirmation,
} from "@/components/inventory/delete-confirmation";
import {
  Package,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  BarChart3,
  DollarSign,
  Zap,
  Building2,
  Loader2,
} from "lucide-react";

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "light", label: "Lights" },
  { value: "motor", label: "Motors" },
  { value: "pump", label: "Pumps" },
  { value: "wire", label: "Wires" },
  { value: "switch", label: "Switches" },
  { value: "socket", label: "Sockets" },
  { value: "mcb", label: "MCB" },
  { value: "other", label: "Others" },
];

const stockStatusOptions = [
  { value: "all", label: "All Stock" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

const getStockStatusColor = (status: string) => {
  switch (status) {
    case "in_stock":
      return "text-green-400";
    case "low_stock":
      return "text-yellow-400";
    case "out_of_stock":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
};

const getStockStatusIcon = (status: string) => {
  switch (status) {
    case "in_stock":
      return TrendingUp;
    case "low_stock":
      return AlertTriangle;
    case "out_of_stock":
      return TrendingDown;
    default:
      return Package;
  }
};

export default function InventoryPage() {
  const router = useRouter();
  const { currency } = useLocaleStore();
  const {
    products,
    inventorySummary,
    isLoading,
    error,
    fetchProducts,
    fetchInventorySummary,
    getConsolidatedProducts,
    clearError,
  } = useInventoryStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showConsolidated, setShowConsolidated] = useState(true);
  const [deleteItem, setDeleteItem] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Enhanced inventory hook for delete functionality
  const { deleteProduct, isDeletingProduct, deleteError } =
    useEnhancedInventory();

  // Fetch data on component mount
  useEffect(() => {
    fetchProducts();
    fetchInventorySummary();
  }, [fetchProducts, fetchInventorySummary]);

  // Get consolidated products (same items grouped with latest prices)
  const consolidatedProducts = getConsolidatedProducts();
  const displayProducts = showConsolidated ? consolidatedProducts : products;

  const filteredItems = displayProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      product.category.name.toLowerCase() === categoryFilter;

    const stockStatus = getStockStatus(
      product.inventory.currentStock,
      product.inventory.minimumStock
    );
    const matchesStockStatus =
      stockStatusFilter === "all" || stockStatus.status === stockStatusFilter;

    return matchesSearch && matchesCategory && matchesStockStatus;
  });

  // Calculate summary based on current view
  const currentSummary = {
    totalItems: displayProducts.reduce(
      (sum, p) => sum + p.inventory.currentStock,
      0
    ),
    totalValue: displayProducts.reduce(
      (sum, p) => sum + p.inventory.currentStock * p.pricing.purchasePrice,
      0
    ),
    lowStockProducts: displayProducts.filter(
      (p) => p.inventory.currentStock <= p.inventory.minimumStock
    ).length,
    outOfStockProducts: displayProducts.filter(
      (p) => p.inventory.currentStock <= 0
    ).length,
  };

  const totalItems = currentSummary.totalItems;
  const totalValue = currentSummary.totalValue;
  const lowStockItems = currentSummary.lowStockProducts;
  const outOfStockItems = currentSummary.outOfStockProducts;

  const viewItemDetails = (item: Product) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  const getItemSpecifications = (product: Product) => {
    return formatSpecifications(product.specifications);
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteItem(product);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;

    const isConsolidated = !!deleteItem._consolidated;
    const consolidatedIds = deleteItem._consolidated?.originalIds;
    const productName = deleteItem.name;

    const success = await deleteProduct(
      deleteItem._id,
      isConsolidated,
      consolidatedIds
    );

    if (success) {
      setShowDeleteModal(false);
      setDeleteItem(null);
      // Refresh the products list
      fetchProducts();
      fetchInventorySummary();

      // Show success message (you can replace this with a proper toast notification)
      console.log(
        `✅ Successfully deleted ${productName}${
          isConsolidated ? " (consolidated)" : ""
        }`
      );
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteItem(null);
  };

  // Show loading state
  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading inventory...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button
            onClick={() => {
              clearError();
              fetchProducts();
              fetchInventorySummary();
            }}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Inventory Management
          </h1>
          <p className="text-gray-400 mt-1">
            Track stock levels, manage items, and monitor inventory value
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant={showConsolidated ? "default" : "outline"}
            onClick={() => setShowConsolidated(!showConsolidated)}>
            <BarChart3 className="w-4 h-4 mr-2" />
            {showConsolidated ? "Consolidated View" : "Detailed View"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/inventory/brands")}>
            <Building2 className="w-4 h-4 mr-2" />
            Manage Brands
          </Button>
          <Button onClick={() => router.push("/admin/inventory/add")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Items</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {totalItems}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Value</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {currency}
                  {totalValue.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">
                  {lowStockItems}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">
                  Out of Stock
                </p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {outOfStockItems}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, brand, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
            <div className="flex gap-3">
              <Dropdown
                options={categoryOptions}
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                placeholder="Filter by category"
                className="bg-gray-800 border-gray-700"
              />
              <Dropdown
                options={stockStatusOptions}
                value={stockStatusFilter}
                onValueChange={setStockStatusFilter}
                placeholder="Filter by stock"
                className="bg-gray-800 border-gray-700"
              />
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner for Consolidated View */}
      {showConsolidated && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-400">
            <BarChart3 className="w-4 h-4" />
            <p className="text-sm">
              <strong>Consolidated View:</strong> Same items from the same brand
              are grouped together. Total quantities are combined, and the
              latest purchase/selling prices are displayed.
            </p>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">
                    Item
                  </th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">
                    Brand
                  </th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">
                    Stock
                  </th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">
                    Purchase Price
                  </th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">
                    Selling Price
                  </th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">
                    Value
                  </th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((product) => {
                  const stockStatus = getStockStatus(
                    product.inventory.currentStock,
                    product.inventory.minimumStock
                  );
                  const StatusIcon = getStockStatusIcon(stockStatus.status);
                  const itemValue =
                    product.inventory.currentStock *
                    product.pricing.purchasePrice;

                  return (
                    <motion.tr
                      key={product._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">
                              {product.name}
                            </p>
                            {/* {product._consolidated && (
                              <span className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded-full">
                                {product._consolidated.totalEntries} entries
                              </span>
                            )} */}
                          </div>
                          <p className="text-sm text-gray-400">
                            {getItemSpecifications(product)}
                          </p>
                          {product._consolidated && (
                            <p className="text-xs text-blue-400 mt-1">
                              Latest price updated:{" "}
                              {new Date(
                                product._consolidated.latestPriceUpdate
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white">{product.brand.name}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <StatusIcon
                            className={`w-4 h-4 ${getStockStatusColor(
                              stockStatus.status
                            )}`}
                          />
                          <span
                            className={`font-medium ${getStockStatusColor(
                              stockStatus.status
                            )}`}>
                            {product.inventory.currentStock}{" "}
                            {product.pricing.unit}
                          </span>
                        </div>
                        {product.inventory.currentStock <=
                          product.inventory.minimumStock && (
                          <p className="text-xs text-yellow-400 mt-1">
                            Min: {product.inventory.minimumStock}{" "}
                            {product.pricing.unit}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-300">
                          {currency}
                          {product.pricing.purchasePrice}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white font-medium">
                          {currency}
                          {product.pricing.sellingPrice}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-green-400 font-medium">
                          {currency}
                          {itemValue.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewItemDetails(product)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/admin/inventory/edit/${product._id}`
                              )
                            }>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteClick(product)}
                            disabled={isDeletingProduct}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                No items found matching your criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Details Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        size="lg"
        title={selectedItem?.name}>
        {selectedItem && (
          <div className="space-y-6">
            {/* Item Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Item Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Category</p>
                  <p className="text-white capitalize">
                    {selectedItem.category.name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Brand</p>
                  <p className="text-white">{selectedItem.brand.name}</p>
                </div>
                <div>
                  <p className="text-gray-400">Specifications</p>
                  <p className="text-white">
                    {getItemSpecifications(selectedItem)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Unit</p>
                  <p className="text-white">{selectedItem.pricing.unit}</p>
                </div>
              </div>
            </div>

            {/* Stock Information */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Stock Information</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Current Stock</p>
                  <p className="text-white font-medium">
                    {selectedItem.inventory.currentStock}{" "}
                    {selectedItem.pricing.unit}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Minimum Stock</p>
                  <p className="text-white">
                    {selectedItem.inventory.minimumStock}{" "}
                    {selectedItem.pricing.unit}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <p
                    className={`font-medium ${getStockStatusColor(
                      getStockStatus(
                        selectedItem.inventory.currentStock,
                        selectedItem.inventory.minimumStock
                      ).status
                    )}`}>
                    {
                      getStockStatus(
                        selectedItem.inventory.currentStock,
                        selectedItem.inventory.minimumStock
                      ).label
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">
                Pricing Information
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Purchase Price</p>
                  <p className="text-gray-300">
                    {currency}
                    {selectedItem.pricing.purchasePrice}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Selling Price</p>
                  <p className="text-white font-medium">
                    {currency}
                    {selectedItem.pricing.sellingPrice}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Total Value</p>
                  <p className="text-green-400 font-medium">
                    {currency}
                    {(
                      selectedItem.inventory.currentStock *
                      selectedItem.pricing.sellingPrice
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() =>
                  router.push(`/admin/inventory/edit/${selectedItem._id}`)
                }>
                <Edit className="w-4 h-4 mr-2" />
                Edit Item
              </Button>
              <Button variant="outline" onClick={() => setShowItemModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmation
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        product={deleteItem}
        isConsolidated={!!deleteItem?._consolidated}
        isDeleting={isDeletingProduct}
        error={deleteError}
      />
    </div>
  );
}
