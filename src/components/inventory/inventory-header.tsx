import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

interface InventoryHeaderProps {
  onAddProduct: () => void;
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export const InventoryHeader = ({
  onAddProduct,
  totalProducts,
  totalValue,
  lowStockCount,
  outOfStockCount,
}: InventoryHeaderProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Inventory Management
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Manage your product inventory and stock levels
          </p>
        </div>
        <Button
          onClick={onAddProduct}
          className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Products</p>
              <p className="text-xl font-semibold text-white">
                {totalProducts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Package className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Value</p>
              <p className="text-xl font-semibold text-white">
                ₹{totalValue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-600/20 rounded-lg">
              <Package className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Low Stock</p>
              <p className="text-xl font-semibold text-white">
                {lowStockCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <Package className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Out of Stock</p>
              <p className="text-xl font-semibold text-white">
                {outOfStockCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
