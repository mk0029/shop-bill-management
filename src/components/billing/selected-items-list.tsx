"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { useLocaleStore } from "@/store/locale-store";

const glassCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

const glassItemStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "16px",
};

interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  category: string;
  brand: string;
  specifications: string;
  unit: string;
  itemType?: "standard" | "rewinding" | "custom";
  maxStock?: number;
}

interface SelectedItemsListProps {
  selectedItems: BillItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearAll: () => void;
}

export const SelectedItemsList = ({
  selectedItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
}: SelectedItemsListProps) => {
  const { currency } = useLocaleStore();

  const [localQty, setLocalQty] = React.useState<Record<string, string>>({});

  const isDecimalCategory = (category?: string) => /wire|pipe/i.test(category || "");
  const getStepMin = (category?: string) =>
    isDecimalCategory(category)
      ? { step: 0.25, min: 0.25 }
      : { step: 1, min: 1 };

  const clampToStep = (value: number, step: number, min: number, isDecimal: boolean) => {
    let v = value;
    if (isDecimal) {
      v = Math.round(v / step) * step;
      v = Math.round(v * 100) / 100;
    } else {
      v = Math.round(v);
    }
    return Math.max(min, v);
  };

  React.useEffect(() => {
    const next: Record<string, string> = {};
    for (const it of selectedItems) {
      next[it.id] = localQty[it.id] ?? String(it.quantity);
    }
    setLocalQty(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItems]);

  if (selectedItems.length === 0) return null;

  return (
    <div style={glassCardStyle} className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" style={{ color: "rgba(56,189,248,0.6)" }} />
          <h4 className="font-medium text-white text-sm">
            Selected Items ({selectedItems.length})
          </h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-red-400 hover:text-red-300 text-[11px] h-7 px-2"
        >
          Clear All
        </Button>
      </div>

      <div className="space-y-3">
        {selectedItems.map((item) => {
          const { step, min } = getStepMin(item.category);
          const decimal = isDecimalCategory(item.category);
          const current = parseFloat(
            (localQty[item.id] ?? String(item.quantity)) || String(item.quantity)
          );

          return (
            <div key={item.id} style={glassItemStyle} className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white text-xs truncate" title={item.name}>
                      {item.name}
                    </p>
                    {item.category && (
                      <span
                        className="px-1.5 py-0.5 text-[10px] rounded whitespace-nowrap"
                        style={{
                          background: "rgba(56,189,248,0.1)",
                          border: "1px solid rgba(56,189,248,0.15)",
                          color: "rgba(56,189,248,0.7)",
                        }}
                      >
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>
                    {[item.brand, item.specifications].filter(Boolean).join(" \u00B7 ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium" style={{ color: "rgba(56,189,248,0.7)" }}>
                    {currency}{item.price} each
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const next = clampToStep(
                        (isNaN(current) ? item.quantity : current) - step,
                        step, min, decimal
                      );
                      onUpdateQuantity(item.id, next);
                      setLocalQty((p) => ({ ...p, [item.id]: String(next) }));
                    }}
                    className="h-7 w-7"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Minus className="w-3.5 h-3.5" style={{ color: "rgba(148,163,184,0.6)" }} />
                  </Button>
                  <Input
                    type="number"
                    value={localQty[item.id] ?? String(item.quantity)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setLocalQty((prev) => ({ ...prev, [item.id]: raw }));
                        return;
                      }
                      const v = parseFloat(raw);
                      if (isNaN(v)) {
                        setLocalQty((prev) => ({ ...prev, [item.id]: raw }));
                        return;
                      }
                      const safe = clampToStep(v, step, min, decimal);
                      onUpdateQuantity(item.id, safe);
                      setLocalQty((prev) => ({ ...prev, [item.id]: String(safe) }));
                    }}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      if (raw === "") {
                        setLocalQty((prev) => ({ ...prev, [item.id]: String(item.quantity) }));
                        return;
                      }
                      const v = parseFloat(raw);
                      const safe = isNaN(v) ? item.quantity : clampToStep(v, step, min, decimal);
                      onUpdateQuantity(item.id, safe);
                      setLocalQty((prev) => ({ ...prev, [item.id]: String(safe) }));
                    }}
                    step={step}
                    max={typeof item.maxStock === "number" ? item.maxStock : undefined}
                    inputMode={decimal ? "decimal" : "numeric"}
                    className="h-7 w-20 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={typeof item.maxStock === "number" ? current >= item.maxStock : false}
                    onClick={() => {
                      const next = clampToStep(
                        (isNaN(current) ? item.quantity : current) + step,
                        step, min, decimal
                      );
                      onUpdateQuantity(item.id, next);
                      setLocalQty((p) => ({ ...p, [item.id]: String(next) }));
                    }}
                    className="h-7 w-7"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" style={{ color: "rgba(148,163,184,0.6)" }} />
                  </Button>
                  <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                    {item.unit || "pcs"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right leading-tight">
                    <p className="font-semibold text-white text-xs">
                      {currency}{Number(item.total).toFixed(2)}
                    </p>
                    <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                      {item.quantity} x {currency}{item.price}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-7 w-7 p-0"
                    style={{ color: "rgba(248,113,113,0.5)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.9)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.5)";
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
