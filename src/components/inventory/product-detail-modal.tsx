"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit, Trash2, Package, Tag, ShoppingCart, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventoryStore } from "@/store/inventory-store";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

interface ProductDetailModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
  isTechnician?: boolean;
}

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isTechnician = false,
}: ProductDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { updateProductDetails } = useInventoryStore();
  const [editForm, setEditForm] = useState({
    name: "",
    purchasePrice: "",
    sellingPrice: "",
    stockToAdd: "",
  });

  useEffect(() => {
    if (product) {
      setEditForm({
        name: product.name || "",
        purchasePrice: product.pricing?.purchasePrice?.toString() || "",
        sellingPrice: product.pricing?.sellingPrice?.toString() || "",
        stockToAdd: "0",
      });
      setIsEditing(false);
    }
  }, [product]);

  const handleSave = async () => {
    if (!product) return;
    setIsSaving(true);
    try {
      const success = await updateProductDetails(product._id, {
        name: editForm.name,
        pricing: {
          purchasePrice: parseFloat(editForm.purchasePrice) || undefined,
          sellingPrice: parseFloat(editForm.sellingPrice) || undefined,
        },
        stockToAdd: parseInt(editForm.stockToAdd, 10) || 0,
      });
      if (success) {
        setIsEditing(false);
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!product) return null;

  const stock = Number(product.inventory?.currentStock || 0);
  const unit = product.pricing?.unit || "pcs";
  const sellingPrice = Number(product.pricing?.sellingPrice || 0);
  const purchasePrice = Number(product.pricing?.purchasePrice || 0);
  const totalValue = purchasePrice * stock;

  const stockColor =
    stock === 0
      ? "text-red-400"
      : stock < 10
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
            <h3 className="text-white font-semibold truncate">
              {product.name || `${product.category?.name} - ${product.brand?.name}`}
            </h3>
            <p className="text-xs text-gray-400">
              {product.category?.name || "Unknown Category"}
              {product.brand?.name && ` · ${product.brand.name}`}
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
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Product Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-white/[0.04] border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Selling Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.sellingPrice}
                  onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                  className="bg-white/[0.04] border-white/10 text-white"
                />
              </div>
              {!isTechnician && (
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Purchase Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.purchasePrice}
                    onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })}
                    className="bg-white/[0.04] border-white/10 text-white"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Add Stock</Label>
              <Input
                type="number"
                value={editForm.stockToAdd}
                onChange={(e) => setEditForm({ ...editForm, stockToAdd: e.target.value })}
                className="bg-white/[0.04] border-white/10 text-white"
                placeholder="Enter quantity to add"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                <div className="flex items-center gap-1.5 text-gray-400 text-[10px] sm:text-xs mb-1">
                  <ShoppingCart className="w-3 h-3" />
                  Selling Price
                </div>
                <p className="text-sm sm:text-base font-bold text-white">{formatINR(sellingPrice)}</p>
              </div>
              {!isTechnician && (
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 text-[10px] sm:text-xs mb-1">
                    <Tag className="w-3 h-3" />
                    Purchase Price
                  </div>
                  <p className="text-sm sm:text-base font-bold text-white">{formatINR(purchasePrice)}</p>
                </div>
              )}
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                <div className="flex items-center gap-1.5 text-gray-400 text-[10px] sm:text-xs mb-1">
                  <Package className="w-3 h-3" />
                  Stock
                </div>
                <p className={`text-sm sm:text-base font-bold ${stockColor}`}>
                  {stock} {unit}
                </p>
              </div>
              {!isTechnician && (
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 text-[10px] sm:text-xs mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Stock Value
                  </div>
                  <p className="text-sm sm:text-base font-bold text-purple-400">{formatINR(totalValue)}</p>
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                <p className="text-xs text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-200">{product.description}</p>
              </div>
            )}

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                <p className="text-xs text-gray-400 mb-2">Specifications</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-[10px] text-gray-500 capitalize">{key}</p>
                      <p className="text-xs text-gray-200">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06] shrink-0">
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-500">
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            {!isTechnician && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex-1 gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
            {!isTechnician && (
              <Button
                variant="outline"
                onClick={() => {
                  onDelete(product);
                  onClose();
                }}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-800/50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </BaseGlassModal>
  );
}
