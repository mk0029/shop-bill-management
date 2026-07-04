"use client";

import { useEffect, useState } from "react";
import { Edit, Trash2, Gift, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OfferWithProduct } from "@/types/offers";

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
  onManageOffer?: (product: any) => void;
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
  onManageOffer,
  isTechnician = false,
}: ProductCardProps) {
  const stock = Number(product.inventory?.currentStock || 0);
  const unit = product.pricing?.unit || "pcs";
  const sellingPrice = Number(product.pricing?.sellingPrice || 0);
  const purchasePrice = Number(product.pricing?.purchasePrice || 0);
  const [offer, setOffer] = useState<OfferWithProduct | null>(null);

  useEffect(() => {
    const productId = product._id || product.productId;
    if (!productId) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/products/${productId}/offers`);
        const data = await res.json();
        if (active && data.success) setOffer(data.data);
      } catch {}
    })();
    return () => { active = false };
  }, [product._id, product.productId]);

  return (
    <div
      onClick={() => onView(product)}
      className={`rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.05] transition-all group cursor-pointer ${
        isHighlighted ? "ring-1 ring-blue-500/30 bg-blue-900/10" : ""
      } ${offer ? "ring-1 ring-cyan-500/20" : ""}`}
    >
      {/* Product name + offer badge */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium text-white truncate min-w-0">
          {product.name ||
            `${product.category?.name || "Unknown"} - ${product.brand?.name || "Brand"}`}
        </h4>
        {offer && (
          <Badge className="shrink-0 border-cyan-500/30 bg-cyan-500/15 text-[9px] text-cyan-300 px-1.5 py-0">
            <Gift className="mr-0.5 h-2.5 w-2.5" />
            Offer
          </Badge>
        )}
      </div>
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
            {onManageOffer && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onManageOffer(product); }}
                className="p-1 rounded text-gray-400 hover:text-cyan-400"
                title={offer ? "Manage Offer" : "Create Offer"}
              >
                <Tag className="w-3.5 h-3.5" />
              </button>
            )}
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
