"use client";

import { X, Edit, Trash2, Package, Tag, ShoppingCart, TrendingUp, Loader2, DollarSign, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { SanityImage } from "@/components/ui/sanity-image";
import { Badge } from "@/components/ui/badge";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

interface ShopProductDetailModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
}

export default function ShopProductDetailModal({
  product,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: ShopProductDetailModalProps) {
  if (!product) return null;

  const stock = Number(product.stockCount || 0);
  const unit = product.pricing?.unit || "pcs";
  const sellingPrice = Number(product.pricing?.sellingPrice || 0);
  const buyerPrice = Number(product.pricing?.buyerPrice || 0);
  const mrp = Number(product.pricing?.mrp || 0);
  const discount = mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
  const profit = sellingPrice - buyerPrice;
  const profitMargin = sellingPrice > 0 ? Math.round((profit / sellingPrice) * 100) : 0;

  const stockColor =
    stock === 0
      ? "text-red-400"
      : stock <= 5
        ? "text-yellow-400"
        : "text-green-400";

  return (
    <BaseGlassModal isOpen={isOpen} onClose={onClose} showCloseButton={false} mobileType="modal" size="lg" zIndex={220}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-600/15 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-semibold truncate">{product.name}</h3>
            <p className="text-xs text-gray-400">
              {product.category?.name || "Unknown Category"}
              {product.brand && ` \u00B7 ${product.brand}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1">
        <div className="space-y-4">
          {/* Image */}
          {product.images?.[0]?.asset?._ref && (
            <div className="rounded-xl overflow-hidden bg-white/[0.03] border border-white/5">
              <div className="aspect-video relative">
                <SanityImage ref={product.images[0].asset._ref} alt={product.name} className="object-contain w-full h-full" />
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-[10px] sm:text-xs mb-1">
                <ShoppingCart className="w-3 h-3" />
                Selling Price
              </div>
              <p className="text-sm sm:text-base font-bold text-white">{formatINR(sellingPrice)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-[10px] sm:text-xs mb-1">
                <DollarSign className="w-3 h-3" />
                Buyer Cost
              </div>
              <p className="text-sm sm:text-base font-bold text-gray-300">{buyerPrice > 0 ? formatINR(buyerPrice) : "--"}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-[10px] sm:text-xs mb-1">
                <Package className="w-3 h-3" />
                Stock
              </div>
              <p className={`text-sm sm:text-base font-bold ${stockColor}`}>
                {stock} {unit}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-[10px] sm:text-xs mb-1">
                <TrendingUp className="w-3 h-3" />
                Profit
              </div>
              <p className={`text-sm sm:text-base font-bold ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                {buyerPrice > 0 ? `${formatINR(profit)} (${profitMargin}%)` : "--"}
              </p>
            </div>
          </div>

          {/* Discount badge */}
          {mrp > 0 && discount > 0 && (
            <div className="rounded-xl bg-green-600/10 border border-green-600/20 p-3 flex items-center gap-2">
              <Percent className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">
                {discount}% off MRP {formatINR(mrp)}
              </span>
            </div>
          )}

          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={product.isActive ? "default" : "secondary"}>
              {product.isActive ? "Active" : "Draft"}
            </Badge>
            {product.isFeatured && <Badge className="bg-purple-600/20 text-purple-300 border-purple-600/30">Featured</Badge>}
            {product.isNewArrival && <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-600/30">New Arrival</Badge>}
            {!product.inStock && <Badge className="bg-red-600/20 text-red-300 border-red-600/30">Out of Stock</Badge>}
            {product.stockCount > 0 && product.stockCount <= (product.lowStockThreshold || 5) && (
              <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-600/30">Low Stock</Badge>
            )}
          </div>

          {/* Description */}
          {(product.shortDescription || product.description) && (
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
              {product.shortDescription && (
                <>
                  <p className="text-xs text-gray-400 mb-1">Short Description</p>
                  <p className="text-sm text-gray-200 mb-3">{product.shortDescription}</p>
                </>
              )}
              {product.description && (
                <>
                  <p className="text-xs text-gray-400 mb-1">Description</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{product.description}</p>
                </>
              )}
            </div>
          )}

          {/* Extra Images */}
          {product.extraImages && product.extraImages.length > 0 && (
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
              <p className="text-xs text-gray-400 mb-2">Additional Images ({product.extraImages.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {product.extraImages.map((img: any, i: number) =>
                  img?.asset?._ref ? (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-white/[0.02]">
                      <SanityImage ref={img.asset._ref} alt={`${product.name} ${i + 1}`} className="object-cover w-full h-full" />
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* MRP info */}
          {mrp > 0 && (
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
              <p className="text-xs text-gray-400 mb-1">Price Info</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">MRP: </span>
                  <span className="text-gray-300 line-through">{formatINR(mrp)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Selling: </span>
                  <span className="text-white">{formatINR(sellingPrice)}</span>
                </div>
                {buyerPrice > 0 && (
                  <div>
                    <span className="text-gray-500">Buyer: </span>
                    <span className="text-gray-300">{formatINR(buyerPrice)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div>
                    <span className="text-gray-500">Discount: </span>
                    <span className="text-green-400">{discount}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06] shrink-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { onEdit(product); onClose(); }}
            className="flex-1 gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              onDelete(product);
              onClose();
            }}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-800/50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </BaseGlassModal>
  );
}
