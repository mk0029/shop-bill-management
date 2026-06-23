"use client";

import { Edit, Trash2 } from "lucide-react";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

interface ProductCardProps {
  product: any;
  isHighlighted?: boolean;
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
  onView: (product: any) => void;
  isTechnician?: boolean;
}

function getStockDot(stock: number) {
  if (stock === 0) return "bg-red-500";
  if (stock < 10) return "bg-yellow-500";
  return "bg-green-500";
}

export default function ProductCard({
  product,
  isHighlighted,
  onEdit,
  onDelete,
  onView,
  isTechnician = false,
}: ProductCardProps) {
  const stock = Number(product.inventory?.currentStock || 0);
  const unit = product.pricing?.unit || "pcs";
  const sellingPrice = Number(product.pricing?.sellingPrice || 0);
  const purchasePrice = Number(product.pricing?.purchasePrice || 0);

  return (
    <div
      onClick={() => onView(product)}
      className={`rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.05] transition-all group cursor-pointer ${
        isHighlighted ? "ring-1 ring-blue-500/30 bg-blue-900/10" : ""
      }`}
    >
      {/* Product name */}
      <h4 className="text-xs font-medium text-white truncate">
        {product.name ||
          `${product.category?.name || "Unknown"} - ${product.brand?.name || "Brand"}`}
      </h4>
      {product.brand?.name && product.name && (
        <p className="text-[10px] text-gray-500 truncate mt-0.5">{product.brand.name}</p>
      )}

      {/* Stock + price row */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${getStockDot(stock)}`} />
          <span className="text-[11px] text-gray-300">
            {stock} {unit}
          </span>
        </div>
        <span className="text-sm font-semibold text-white">
          {formatINR(sellingPrice)}
        </span>
      </div>

      {/* Cost + actions row */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-gray-500">
          {!isTechnician && purchasePrice > 0 ? `cost ${formatINR(purchasePrice)}` : ""}
        </span>
        {!isTechnician && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(product); }}
              className="p-1 rounded text-gray-400 hover:text-blue-400"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(product); }}
              className="p-1 rounded text-gray-400 hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
