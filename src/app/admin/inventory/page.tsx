"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// UI Components
const Dialog = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => (
  <div
    className={`fixed inset-0 z-50 flex items-center justify-center ${
      open ? "block" : "hidden"
    }`}
  >
    <div
      className="fixed inset-0 bg-black/50"
      onClick={() => onOpenChange(false)}
    />
    <div className="relative z-50 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
      {children}
    </div>
  </div>
);

const DialogContent = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-4">{children}</div>
);

const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">{children}</div>
);

const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold">{children}</h2>
);

// Dropdown Menu Components
const DropdownMenu = ({ children }: { children: React.ReactNode }) => (
  <div className="relative inline-block text-left">{children}</div>
);

const DropdownMenuTrigger = ({ children }: { children: React.ReactNode }) => (
  <div className="cursor-pointer">{children}</div>
);

const DropdownMenuContent = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
    <div className="py-1">{children}</div>
  </div>
);

const DropdownMenuItem = ({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) => (
  <div
    className={`block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

const DropdownMenuSeparator = () => <div className="my-1 h-px bg-gray-100" />;

// Icons
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Zap,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  MoreHorizontal,
} from "lucide-react";

// Store and Types
import { useLocaleStore } from "@/store/locale-store";
import { useInventoryStore, type Product } from "@/store/inventory-store";

// Components
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { RealtimeInventoryStats } from "@/components/realtime/realtime-inventory";

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "light", label: "Lights" },
  // ... other categories ...
];

function getItemSpecifications(product: Product) {
  if (!product.specifications) return "";
  if (typeof product.specifications === "string") return product.specifications;
  return Object.entries(product.specifications)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

interface StockStatus {
  status: "in-stock" | "low-stock" | "out-of-stock";
  label: string;
}

function getStockStatusIcon(status: StockStatus | string) {
  const statusObj =
    typeof status === "string"
      ? { status: status as StockStatus["status"], label: status }
      : status;

  switch (statusObj.status) {
    case "in-stock":
      return TrendingUp;
    case "low-stock":
      return AlertTriangle;
    case "out-of-stock":
      return TrendingDown;
    default:
      return TrendingUp;
  }
}

// Get stock status for a product
function getProductStockStatus(product: Product): StockStatus {
  if (!product) return { status: "out-of-stock", label: "Out of Stock" };

  const currentStock = product.inventory?.currentStock || 0;
  const minimumStock = product.inventory?.minimumStock || 0;

  if (currentStock <= 0) {
    return { status: "out-of-stock", label: "Out of Stock" };
  } else if (currentStock <= minimumStock) {
    return { status: "low-stock", label: "Low Stock" };
  } else {
    return { status: "in-stock", label: "In Stock" };
  }
}

function getStockStatusColor(status: string | StockStatus): string {
  const statusValue = typeof status === "string" ? status : status.status;
  switch (statusValue) {
    case "in-stock":
      return "bg-green-100 text-green-800";
    case "low-stock":
      return "bg-yellow-100 text-yellow-800";
    case "out-of-stock":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function InventoryPage() {
  const router = useRouter();
  const { currency } = useLocaleStore();
  const { products = [], fetchProducts, deleteProduct } = useInventoryStore();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [deleteItem, setDeleteItem] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [showConsolidated, setShowConsolidated] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter items based on search and filters
  const filteredItems = (products || []).filter((product) => {
    const searchTermLower = searchTerm.toLowerCase();
    const brandName =
      typeof product.brand === "string"
        ? product.brand
        : product.brand?.name || "";
    const categoryName =
      typeof product.category === "string"
        ? product.category
        : product.category?.name || "";

    const matchesSearch =
      product.name?.toLowerCase().includes(searchTermLower) ||
      brandName.toLowerCase().includes(searchTermLower) ||
      (product.description || "").toLowerCase().includes(searchTermLower);

    const matchesCategory =
      categoryFilter === "all" ||
      product.category?._id === categoryFilter ||
      categoryName.toLowerCase() === categoryFilter.toLowerCase();

    const stockStatus = getProductStockStatus(product);
    const matchesStockStatus =
      stockStatusFilter === "all" || stockStatus.status === stockStatusFilter;

    return matchesSearch && matchesCategory && matchesStockStatus;
  });

  // Delete product handler
  const handleDeleteProduct = (product: Product) => {
    setDeleteItem(product);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;

    try {
      await deleteProduct(deleteItem._id);
      toast.success(`Successfully deleted ${deleteItem.name}`);
      setDeleteItem(null);
      await fetchProducts();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete product"
      );
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteItem(null);
    setDeleteError(null);
  };

  // View item details
  const viewItemDetails = (item: Product) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  return (
    <RealtimeProvider>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <div className="flex items-center gap-3">
              <Button
                variant={showConsolidated ? "default" : "outline"}
                onClick={() => setShowConsolidated(!showConsolidated)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {showConsolidated ? "Detailed View" : "Consolidated View"}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/admin/inventory/brands")}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Manage Brands
              </Button>
              <Button onClick={() => router.push("/admin/inventory/add")}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Real-time Inventory Statistics */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Live Inventory Statistics
            </h2>
            <RealtimeInventoryStats />
          </div>

          {/* Filters */}
          <Card className="bg-card">
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, brand, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-3">
                  {/* Filters dropdown */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters((prev) => !prev)}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      More Filters
                    </Button>
                    {showFilters && (
                      <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          <DropdownMenuItem
                            onClick={() => {
                              setCategoryFilter("all");
                              setShowFilters(false);
                            }}
                          >
                            All Categories
                          </DropdownMenuItem>
                          {categoryOptions.map((category) => (
                            <DropdownMenuItem
                              key={category.value}
                              onClick={() => {
                                setCategoryFilter(category.value);
                                setShowFilters(false);
                              }}
                            >
                              {category.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setStockStatusFilter("all");
                              setShowFilters(false);
                            }}
                          >
                            All Stock Status
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setStockStatusFilter("in-stock");
                              setShowFilters(false);
                            }}
                          >
                            In Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setStockStatusFilter("low-stock");
                              setShowFilters(false);
                            }}
                          >
                            Low Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setStockStatusFilter("out-of-stock");
                              setShowFilters(false);
                            }}
                          >
                            Out of Stock
                          </DropdownMenuItem>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Item</th>
                      <th className="text-left py-3 px-4">Brand</th>
                      <th className="text-left py-3 px-4">Stock</th>
                      <th className="text-left py-3 px-4">Purchase Price</th>
                      <th className="text-left py-3 px-4">Selling Price</th>
                      <th className="text-left py-3 px-4">Value</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((product) => {
                      const status = getProductStockStatus(product);
                      const StatusIcon = getStockStatusIcon(status);
                      const itemValue =
                        (product.inventory?.currentStock || 0) *
                        (product.pricing?.purchasePrice || 0);

                      return (
                        <motion.tr
                          key={product._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {getItemSpecifications(product)}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {product.brand?.name || "N/A"}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <StatusIcon className="h-4 w-4" />
                              <span className={getStockStatusColor(status)}>
                                {product.inventory?.currentStock || 0}{" "}
                                {product.pricing?.unit || ""}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {currency}{" "}
                            {product.pricing?.purchasePrice?.toFixed(2) ||
                              "0.00"}
                          </td>
                          <td className="py-4 px-4">
                            {currency}{" "}
                            {product.pricing?.sellingPrice?.toFixed(2) ||
                              "0.00"}
                          </td>
                          <td className="py-4 px-4 font-medium">
                            {currency} {itemValue.toFixed(2)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewItemDetails(product)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/admin/inventory/edit/${product._id}`
                                  )
                                }
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80"
                                onClick={() => handleDeleteProduct(product)}
                                disabled={isDeletingProduct}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No products found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteItem}
          onOpenChange={(open: boolean) => !open && setDeleteItem(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete &quot;{deleteItem?.name}&quot;?
                This action cannot be undone.
              </p>
              {deleteError && (
                <div className="text-red-500 text-sm">{deleteError}</div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteItem(null)}
                  disabled={isDeletingProduct}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={isDeletingProduct}
                >
                  {isDeletingProduct ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Product Details Dialog */}
        <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedItem.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {typeof selectedItem.brand === "string"
                        ? selectedItem.brand
                        : selectedItem.brand?.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(
                        getProductStockStatus(selectedItem).status
                      )}`}
                    >
                      {getProductStockStatus(selectedItem).label}
                    </span>
                    <span className="text-sm font-medium">
                      {currency}
                      {selectedItem.pricing?.sellingPrice?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400">Category</p>
                    <p className="text-white">
                      {typeof selectedItem.category === "string"
                        ? selectedItem.category
                        : selectedItem.category?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Product ID</p>
                    <p className="text-white">
                      {selectedItem.productId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Quantity</p>
                    <p className="text-white">
                      {selectedItem.inventory?.currentStock || 0}{" "}
                      {selectedItem.pricing?.unit || "units"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Low Stock Threshold</p>
                    <p className="text-white">
                      {selectedItem.inventory?.minimumStock || "Not set"}
                    </p>
                  </div>
                </div>

                {selectedItem.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Description
                    </h4>
                    <p className="text-sm">{selectedItem.description}</p>
                  </div>
                )}

                {selectedItem.specifications && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Specifications
                    </h4>
                    <div className="mt-2 space-y-1">
                      {Object.entries(
                        typeof selectedItem.specifications === "string"
                          ? JSON.parse(selectedItem.specifications)
                          : selectedItem.specifications
                      ).map(([key, value]) => (
                        <div key={key} className="flex text-sm">
                          <span className="font-medium text-gray-500 w-32 flex-shrink-0">
                            {key}:
                          </span>
                          <span className="flex-1">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowItemModal(false)}
                    className="mr-2"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setShowItemModal(false);
                      router.push(`/admin/inventory/edit/${selectedItem._id}`);
                    }}
                  >
                    Edit Product
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RealtimeProvider>
  );
}
