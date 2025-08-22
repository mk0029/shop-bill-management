import { Button } from "@/components/ui/button";
import { Plus, Package, TrendingUp } from "lucide-react";

// Helper: Currency formatter
const formatCurrency = (amount: number) => {
  if (amount < 1000) return `₹${amount.toFixed(2)}`;
  const k = amount / 1000;
  const decimals = k < 10 ? 2 : k < 100 ? 1 : 0;
  return `₹${k.toFixed(decimals)}K`;
};

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
  const stats = [
    {
      label: "Total Products",
      value: totalProducts,
      icon: <Package className="w-5 h-5 text-blue-400" />,
      bg: "bg-blue-600/20",
      valueClass: "text-white",
    },
    {
      label: "Total Value",
      value: formatCurrency(totalValue),
      subText: "(at purchase price)",
      icon: <TrendingUp className="w-5 h-5 text-purple-400" />,
      bg: "bg-green-600/20",
      valueClass: "text-purple-400",
    },
    {
      label: "Low Stock",
      value: lowStockCount,
      icon: <Package className="w-5 h-5 text-yellow-400" />,
      bg: "bg-yellow-600/20",
      valueClass: "text-white",
    },
    {
      label: "Out of Stock",
      value: outOfStockCount,
      icon: <Package className="w-5 h-5 text-red-400" />,
      bg: "bg-red-600/20",
      valueClass: "text-white",
    },
  ];

  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Inventory Management
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base max-sm:max-w-[80%]">
            Manage your product inventory and stock levels
          </p>
        </div>
        <Button
          onClick={onAddProduct}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="max-sm:hidden"> Add Product</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, subText, icon, bg, valueClass }, i) => (
          <div
            key={i}
            className="bg-gray-900 border border-gray-800 rounded-lg p-3 sm:p-4 flex items-center"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1 sm:p-2 rounded-lg max-sm:hidden ${bg}`}>
                {icon}
              </div>
              <div>
                <p className="text-sm text-gray-400">{label}</p>
                <p className={`text-xl font-semibold ${valueClass}`}>{value}</p>
                {subText && <p className="text-xs text-gray-500">{subText}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
