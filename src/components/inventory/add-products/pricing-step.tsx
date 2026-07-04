"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, TrendingUp, AlertTriangle, Calculator } from "lucide-react";
import { currency, safeNumber, calculatePurchasePrice, calculateProfit, calculateMargin, formatCurrency } from "@/lib/inventory-helpers";
import type { InventoryFormData } from "@/hooks/use-multiple-inventory-form";

interface PricingStepProps {
  formData: InventoryFormData;
  errors: Record<string, string>;
  onInputChange: (field: string, value: string) => void;
}

export function PricingStep({ formData, errors, onInputChange }: PricingStepProps) {
  const itemCount = safeNumber(formData.currentStock);
  const totalAmount = safeNumber(formData.purchaseTotalAmount);
  const autoPurchasePrice = calculatePurchasePrice(totalAmount, itemCount);
  const sellingPrice = safeNumber(formData.sellingPrice);

  const useAutoPurchase = itemCount > 0 && totalAmount > 0;
  const displayPurchasePrice = useAutoPurchase ? autoPurchasePrice : safeNumber(formData.purchasePrice);

  const profit = calculateProfit(sellingPrice, displayPurchasePrice);
  const margin = calculateMargin(sellingPrice, displayPurchasePrice);
  const totalValue = sellingPrice * itemCount;

  const isLoss = sellingPrice > 0 && displayPurchasePrice > 0 && sellingPrice < displayPurchasePrice;

  const glassCardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
  };

  const glassInputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(16px)",
    borderRadius: "12px",
  };

  const handleItemsChange = (value: string) => {
    onInputChange("currentStock", value);
  };

  const handleTotalChange = (value: string) => {
    onInputChange("purchaseTotalAmount", value);
  };

  return (
    <div className="space-y-5">
      {/* Quick Price Calculator */}
      <div style={glassCardStyle} className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Calculator className="w-5 h-5" style={{ color: "rgba(56,189,248,0.6)" }} />
          <h3 className="text-white font-semibold text-base">Quick Price Calculator</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalItems" className="text-sm text-slate-300">
              Total Items Count
            </Label>
            <Input
              id="totalItems"
              type="number"
              min="0"
              step="1"
              value={formData.currentStock}
              onChange={(e) => handleItemsChange(e.target.value)}
              placeholder="e.g. 10"
              style={glassInputStyle}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalAmount" className="text-sm text-slate-300">
              Total Purchase Amount ({currency})
            </Label>
            <Input
              id="totalAmount"
              type="number"
              min="0"
              step="0.01"
              value={formData.purchaseTotalAmount ?? ""}
              onChange={(e) => handleTotalChange(e.target.value)}
              placeholder="e.g. 500"
              style={glassInputStyle}
            />
          </div>
        </div>
      </div>

      {/* Prices */}
      <div style={glassCardStyle} className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <DollarSign className="w-5 h-5" style={{ color: "rgba(56,189,248,0.6)" }} />
          <h3 className="text-white font-semibold text-base">Pricing</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Purchase Price (internal) */}
          <div className="space-y-2">
            <Label htmlFor="purchasePrice" className="text-sm text-slate-400 flex items-center gap-1.5">
              Purchase Price ({currency})
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                background: "rgba(148,163,184,0.1)",
                border: "1px solid rgba(148,163,184,0.15)",
                color: "rgba(148,163,184,0.6)",
              }}>
                Internal
              </span>
            </Label>
            <div className="relative">
              <Input
                id="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                value={useAutoPurchase ? autoPurchasePrice.toFixed(2) : formData.purchasePrice}
                onChange={(e) => onInputChange("purchasePrice", e.target.value)}
                placeholder="Auto-calculated"
                readOnly={useAutoPurchase}
                style={{
                  ...glassInputStyle,
                  opacity: useAutoPurchase ? 0.6 : 1,
                }}
              />
              {useAutoPurchase && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                  Auto
                </span>
              )}
            </div>
            {errors.purchasePrice && (
              <p className="text-xs text-red-400 mt-1">{errors.purchasePrice}</p>
            )}
          </div>

          {/* Selling Price (customer-facing) */}
          <div className="space-y-2">
            <Label htmlFor="sellingPrice" className="text-sm text-white flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: "rgba(56,189,248,0.7)" }} />
              Selling Price ({currency})
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                background: "rgba(56,189,248,0.12)",
                border: "1px solid rgba(56,189,248,0.2)",
                color: "rgba(56,189,248,0.8)",
              }}>
                Billing
              </span>
            </Label>
            <Input
              id="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.sellingPrice}
              onChange={(e) => onInputChange("sellingPrice", e.target.value)}
              placeholder="Enter selling price"
              style={{
                ...glassInputStyle,
                border: "1px solid rgba(56,189,248,0.25)",
              }}
            />
            {errors.sellingPrice && (
              <p className="text-xs text-red-400 mt-1">{errors.sellingPrice}</p>
            )}
          </div>
        </div>
      </div>

      {/* Profit Analysis */}
      <div style={glassCardStyle} className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5" style={{ color: sellingPrice > 0 && isLoss ? "rgba(251,146,60,0.6)" : "rgba(16,185,129,0.6)" }} />
          <h3 className="text-white font-semibold text-base">Profit Analysis</h3>
        </div>

        {isLoss && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl text-sm"
            style={{
              background: "rgba(251,146,60,0.08)",
              border: "1px solid rgba(251,146,60,0.2)",
              color: "rgba(251,146,60,0.9)",
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Selling price is below purchase price.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-slate-400 mb-1">Profit per unit</p>
            <p className="text-lg font-semibold" style={{
              color: sellingPrice > 0 && profit >= 0 ? "rgba(52,211,153,0.9)" : "rgba(148,163,184,0.5)",
            }}>
              {sellingPrice > 0 && displayPurchasePrice > 0 ? formatCurrency(profit) : "\u2014"}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-slate-400 mb-1">Margin</p>
            <p className="text-lg font-semibold" style={{
              color: margin != null && margin >= 0 ? "rgba(96,165,250,0.9)" : "rgba(148,163,184,0.5)",
            }}>
              {margin != null ? `${margin.toFixed(1)}%` : "\u2014"}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-slate-400 mb-1">Total value</p>
            <p className="text-lg font-semibold text-white">
              {sellingPrice > 0 && itemCount > 0 ? formatCurrency(totalValue) : "\u2014"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
