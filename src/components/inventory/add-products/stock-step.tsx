"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Package, AlertTriangle, CheckCircle, XCircle, Bell } from "lucide-react";
import { safeNumber, getStockStatus } from "@/lib/inventory-helpers";
import type { InventoryFormData } from "@/hooks/use-multiple-inventory-form";

interface StockStepProps {
  formData: InventoryFormData;
  errors: Record<string, string>;
  onInputChange: (field: string, value: string) => void;
}

export function StockStep({ formData, errors, onInputChange }: StockStepProps) {
  const currentStock = safeNumber(formData.currentStock);
  const minimumStock = safeNumber(formData.minimumStock);
  const stockStatus = getStockStatus(currentStock, minimumStock);

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

  const StatusIcon = stockStatus.variant === "success" ? CheckCircle
    : stockStatus.variant === "warning" ? AlertTriangle
    : XCircle;

  const statusColors = {
    success: { bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)", text: "rgba(52,211,153,0.9)" },
    warning: { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)", text: "rgba(251,191,36,0.9)" },
    destructive: { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)", text: "rgba(248,113,113,0.9)" },
    default: { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.15)", text: "rgba(148,163,184,0.7)" },
  };

  const sc = statusColors[stockStatus.variant] || statusColors.default;

  return (
    <div className="space-y-5">
      {/* Stock Health Preview */}
      <div style={glassCardStyle} className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Package className="w-5 h-5" style={{ color: "rgba(56,189,248,0.6)" }} />
          <h3 className="text-white font-semibold text-base">Stock Health</h3>
        </div>

        <div
          className="flex items-center gap-3 p-4 rounded-xl mb-5"
          style={{
            background: sc.bg,
            border: `1px solid ${sc.border}`,
          }}
        >
          <StatusIcon className="w-6 h-6" style={{ color: sc.text }} />
          <div>
            <p className="font-medium" style={{ color: sc.text }}>{stockStatus.label}</p>
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.7)" }}>
              {currentStock} units in stock{minimumStock > 0 ? `, min: ${minimumStock}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Stock Configuration */}
      <div style={glassCardStyle} className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Package className="w-5 h-5" style={{ color: "rgba(56,189,248,0.6)" }} />
          <h3 className="text-white font-semibold text-base">Stock Configuration</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentStock" className="text-sm text-slate-300">
              Current Stock <span className="text-red-400">*</span>
            </Label>
            <Input
              id="currentStock"
              type="number"
              min="0"
              step="1"
              value={formData.currentStock}
              onChange={(e) => onInputChange("currentStock", e.target.value)}
              placeholder="Enter current stock"
              style={glassInputStyle}
            />
            {errors.currentStock && (
              <p className="text-xs text-red-400 mt-1">{errors.currentStock}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="minimumStock" className="text-sm text-slate-300">
              Minimum Stock
            </Label>
            <Input
              id="minimumStock"
              type="number"
              min="0"
              step="1"
              value={formData.minimumStock}
              onChange={(e) => onInputChange("minimumStock", e.target.value)}
              placeholder="e.g. 10"
              style={glassInputStyle}
            />
            {errors.minimumStock && (
              <p className="text-xs text-red-400 mt-1">{errors.minimumStock}</p>
            )}
          </div>
        </div>

        {/* Low Stock Alert Toggle */}
        <div className="flex items-center justify-between mt-5 p-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4" style={{ color: "rgba(148,163,184,0.6)" }} />
            <div>
              <Label htmlFor="lowStockAlert" className="text-sm text-slate-300 cursor-pointer">
                Low Stock Alert
              </Label>
              <p className="text-xs text-slate-500">Notify when stock falls below minimum</p>
            </div>
          </div>
          <Switch id="lowStockAlert" />
        </div>
      </div>
    </div>
  );
}
