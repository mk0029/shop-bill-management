/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Package } from "lucide-react";
import { RealtimeProductTable } from "@/components/inventory/realtime-product-table";

import { Product } from "@/store/inventory-store";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

interface InventoryTableProps {
  products: any;
  isLoading: boolean;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  isTechnician?: boolean;
  getStockStatus: (stock: number) => {
    status: string;
    color: string;
    bg: string;
  };
}

export const InventoryTable = ({
  products,
  isLoading,
  onEditProduct,
  onDeleteProduct,
  isTechnician = false,
  getStockStatus,
}: InventoryTableProps) => {
  if (isLoading) {
    return (
      <div className="bg-background border border-border rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-400">Loading inventory...</span>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-background border border-border rounded-lg p-8">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No products found</h3>
          <p className="text-gray-400">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background border border-gray-800 rounded-lg overflow-hidden md:p-6">
      <div className="hide-scroll overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-800 sticky top-0 z-10 rounded-t-lg">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Category
              </th>
              {!isTechnician && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Purchase Price
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Price
              </th>
              {!isTechnician && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Value
                </th>
              )}
              {!isTechnician && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <RealtimeProductTable
              products={products}
              renderProduct={(product, isHighlighted, index) => {
                const stockStatus = getStockStatus(
                  Number(product.inventory?.currentStock || 0),
                );
                const totalValue =
                  Number(product.pricing?.purchasePrice || 0) *
                  Number(product.inventory?.currentStock || 0);

                return (
                  <tr
                    className={`hover:bg-gray-800/50 transition-colors ${
                      isHighlighted ? "bg-blue-900/10" : ""
                    }`}
                  >
                    <td
                      className={`px-4 md:px-6 py-3 md:py-4 whitespace-nowrap ${
                        index === products.length - 1 ? "rounded-bl-lg" : ""
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-white capitalize">
                          {product.name
                            ? product.name
                            : `${product.category?.name || "Unknown Category"} - ${
                                product.brand?.name || "Unknown Brand"
                              }`}
                        </div>
                        {product.description && (
                          <div className="text-sm text-gray-400 truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-600/20 text-blue-400 rounded">
                        {product.category?.name || "Unknown Category"}
                      </span>
                    </td>
                    {!isTechnician && (
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatINR(Number(product.pricing?.purchasePrice || 0))}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${stockStatus.bg} ${stockStatus.color}`}
                      >
                        {product.inventory?.currentStock || 0} {product.pricing?.unit || "units"}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatINR(Number(product.pricing?.sellingPrice || 0))}
                    </td>
                    {!isTechnician && (
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatINR(totalValue)}
                      </td>
                    )}
                    {!isTechnician && (
                      <td
                        className={`px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-right text-sm font-medium ${
                          index === products.length - 1 ? "rounded-br-lg" : ""
                        }`}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditProduct(product)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteProduct(product)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              }}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};
