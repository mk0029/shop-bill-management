"use client";

import { Edit3, Copy, Trash2, Package, AlertTriangle, CheckCircle, XCircle, DollarSign, Layers } from "lucide-react";
import { safeNumber, formatCurrency, getStockStatus } from "@/lib/inventory-helpers";
import type { InventoryFormData } from "@/hooks/use-multiple-inventory-form";

const statusColors: Record<string, { bg: string; border: string; text: string; icon: typeof CheckCircle }> = {
  draft: { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.15)", text: "rgba(148,163,184,0.7)", icon: Package },
  ready: { bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.15)", text: "rgba(52,211,153,0.8)", icon: CheckCircle },
  missing_price: { bg: "rgba(251,146,60,0.08)", border: "rgba(251,146,60,0.15)", text: "rgba(251,146,60,0.8)", icon: AlertTriangle },
  low_stock: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.15)", text: "rgba(251,191,36,0.8)", icon: AlertTriangle },
};

function getCardStatus(formData: InventoryFormData): { label: string; colors: typeof statusColors["draft"] } {
  const hasName = !!formData.productName;
  const hasCategory = !!formData.category;
  const hasBrand = !!formData.brand;
  const hasSellingPrice = safeNumber(formData.sellingPrice) > 0;
  const hasStock = safeNumber(formData.currentStock) >= 0;
  const minStock = safeNumber(formData.minimumStock);
  const curStock = safeNumber(formData.currentStock);

  if (!hasName || !hasCategory || !hasBrand) {
    return { label: "Draft", colors: statusColors.draft };
  }
  if (!hasSellingPrice) {
    return { label: "Missing Price", colors: statusColors.missing_price };
  }
  if (hasStock && curStock <= minStock) {
    return { label: "Low Stock", colors: statusColors.low_stock };
  }
  return { label: "Ready", colors: statusColors.ready };
}

interface ProductCardProps {
  formData: InventoryFormData;
  index: number;
  hasErrors: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  categories: { _id: string; name: string }[];
  brands: { _id: string; name: string }[];
}

export function ProductCard({
  formData,
  index,
  hasErrors,
  onEdit,
  onDuplicate,
  onRemove,
  categories,
  brands,
}: ProductCardProps) {
  const status = getCardStatus(formData);
  const categoryName = categories.find((c) => c._id === formData.category)?.name || "";
  const brandName = brands.find((b) => b._id === formData.brand)?.name || "";
  const sellingPrice = safeNumber(formData.sellingPrice);
  const currentStock = safeNumber(formData.currentStock);

  const StatusIcon = status.colors.icon;

  return (
    <div
      onClick={onEdit}
      className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:translate-y-[-2px]"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: hasErrors
          ? "1px solid rgba(248,113,113,0.3)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: hasErrors
          ? "0 0 0 1px rgba(248,113,113,0.2), 0 8px 32px rgba(0,0,0,0.2)"
          : "0 8px 32px rgba(0,0,0,0.2)",
      }}
    >
      {/* Card shine */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-semibold text-base truncate">
              {formData.productName || `Product #${index + 1}`}
            </h3>
            {(categoryName || brandName) && (
              <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
                {[categoryName, brandName].filter(Boolean).join(" \u00B7 ")}
              </p>
            )}
          </div>

          {/* Status chip */}
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap"
            style={{
              background: status.colors.bg,
              border: `1px solid ${status.colors.border}`,
              color: status.colors.text,
            }}
          >
            <StatusIcon className="w-2.5 h-2.5" />
            {status.label}
          </span>
        </div>

        {/* Details */}
        <div className="flex items-center gap-4 text-sm">
          {sellingPrice > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" style={{ color: "rgba(52,211,153,0.6)" }} />
              <span className="font-medium text-white">{formatCurrency(sellingPrice)}</span>
            </div>
          )}
          {currentStock >= 0 && (
            <div className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" style={{ color: "rgba(148,163,184,0.5)" }} />
              <span style={{ color: "rgba(148,163,184,0.7)" }}>
                Stock: {currentStock} {formData.unit || "pcs"}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(148,163,184,0.8)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLElement).style.color = "rgba(148,163,184,0.8)";
            }}
          >
            <Edit3 className="w-3 h-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(148,163,184,0.8)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLElement).style.color = "rgba(148,163,184,0.8)";
            }}
          >
            <Copy className="w-3 h-3" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all ml-auto"
            style={{
              background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.12)",
              color: "rgba(248,113,113,0.6)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.12)";
              (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.9)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.06)";
              (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.6)";
            }}
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
        </div>
      </div>

      {/* Error indicator */}
      {hasErrors && (
        <div className="absolute top-2 right-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
      )}
    </div>
  );
}
