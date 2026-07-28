"use client";

import { Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

function getStockDot(stock: number) {
  if (stock === 0) return "bg-red-500";
  if (stock <= 5) return "bg-yellow-500";
  return "bg-green-500";
}

interface ShopProductCardProps {
  product: any;
  onEdit: (p: any) => void;
  onDelete: (p: any) => void;
  onView: (p: any) => void;
}

export default function ShopProductCard({
  product,
  onEdit,
  onDelete,
  onView,
}: ShopProductCardProps) {
  const stock = product.stockCount ?? 0;
  const sellingPrice = Number(product.pricing?.sellingPrice || 0);
  const buyerPrice = Number(product.pricing?.buyerPrice || 0);

  return (
    <div
      onClick={() => onView(product)}
      className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.05] transition-all group cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium text-white truncate min-w-0">
          {product.name}
        </h4>
        <Badge
          variant={product.isActive ? "default" : "secondary"}
          className="shrink-0 text-[9px] px-1.5 py-0"
        >
          {product.isActive ? "Live" : "Draft"}
        </Badge>
      </div>
      {product.category?.name && (
        <p className="text-[10px] text-gray-500 truncate mt-0.5">{product.category.name}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${getStockDot(stock)}`} />
          <span className="text-[11px] text-gray-300">
            {stock} {product.pricing?.unit || "pcs"}
          </span>
        </div>
        <span className="text-sm font-semibold text-white">
          {formatINR(sellingPrice)}
        </span>
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-gray-500">
          {buyerPrice > 0 ? `cost ${formatINR(buyerPrice)}` : ""}
        </span>
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
      </div>
    </div>
  );
}
