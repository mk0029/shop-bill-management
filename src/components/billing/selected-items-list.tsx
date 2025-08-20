"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus } from "lucide-react";
import { useLocaleStore } from "@/store/locale-store";

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

  // Local input state to allow intermediate editing (e.g., clearing the field)
  const [localQty, setLocalQty] = React.useState<Record<string, string>>({});

  // Helpers
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

  // Sync local input state whenever items list changes
  React.useEffect(() => {
    const next: Record<string, string> = {};
    for (const it of selectedItems) {
      // Keep existing local value if present; otherwise use item.quantity
      next[it.id] = localQty[it.id] ?? String(it.quantity);
    }
    setLocalQty(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItems]);

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white text-sm">
          Selected Items ({selectedItems.length})
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-red-400 hover:text-red-300 text-[11px] h-7 px-2">
          Clear All
        </Button>
      </div>

      {selectedItems.map((item) =>
      {
        
        return (
        <div
          key={item.id}
          className="p-2 bg-gray-800 rounded-md border border-gray-700">
          {/* Top row: Name + category, Price each */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-white text-xs truncate" title={item.name}>
                  {item.name}
                </p>
                {item.category && (
                  <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] rounded whitespace-nowrap">
                    {item.category}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 truncate">
                {[item.brand, item.specifications].filter(Boolean).join(" • ")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-blue-400 font-medium leading-none">
                {currency}
                {item.price} each
              </p>
            </div>
          </div>

          {/* Bottom row: Qty controls + total + delete */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(() => {
                const { step, min } = getStepMin(item.category);
                const decimal = isDecimalCategory(item.category);
                const current = parseFloat(
                  (localQty[item.id] ?? String(item.quantity)) || String(item.quantity)
                );
                if (decimal) {
                  return (
                    <>
                     
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
                          const v = parseFloat(raw);
                          const safe = isNaN(v)
                            ? item.quantity
                            : clampToStep(v, step, min, decimal);
                          onUpdateQuantity(item.id, safe);
                          setLocalQty((prev) => ({ ...prev, [item.id]: String(safe) }));
                        }}
                        step={step}
                        max={typeof item.maxStock === "number" ? item.maxStock : undefined}
                        inputMode={decimal ? "decimal" : "numeric"}
                        className="h-7 w-20 bg-gray-800 border-gray-700 text-white text-xs text-center rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                  
                      <span className="text-[10px] text-gray-400 ml-1">Qty</span>
                    </>
                  );
                }
                // Non-decimal: show +/- controls with step 1
                return (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const current = parseFloat(
                          (localQty[item.id] ?? String(item.quantity)) || String(item.quantity)
                        );
                        const next = clampToStep((isNaN(current) ? item.quantity : current) - step, step, min, decimal);
                        onUpdateQuantity(item.id, next);
                        setLocalQty((p) => ({ ...p, [item.id]: String(next) }));
                      }}
                      className="h-7 w-7"
                    >
                      <Minus className="w-3.5 h-3.5" />
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
                        const safe = isNaN(v)
                          ? item.quantity
                          : clampToStep(v, step, min, decimal);
                        onUpdateQuantity(item.id, safe);
                        setLocalQty((prev) => ({ ...prev, [item.id]: String(safe) }));
                      }}
                      step={step}
                      max={typeof item.maxStock === "number" ? item.maxStock : undefined}
                      inputMode={decimal ? "decimal" : "numeric"}
                      className="h-7 w-20 bg-gray-800 border-gray-700 text-white text-xs text-center rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={typeof item.maxStock === "number" ? current >= item.maxStock : false}
                      onClick={() => {
                        const current = parseFloat(
                          (localQty[item.id] ?? String(item.quantity)) || String(item.quantity)
                        );
                        const next = clampToStep((isNaN(current) ? item.quantity : current) + step, step, min, decimal);
                        onUpdateQuantity(item.id, next);
                        setLocalQty((p) => ({ ...p, [item.id]: String(next) }));
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] text-gray-400 ml-1">Qty</span>
                  </>
                );
              })()}
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right leading-tight">
                <p className="font-semibold text-white text-xs">
                  {currency}
                  {item.total}
                </p>
                <p className="text-[10px] text-gray-400">
                  {item.quantity} × {currency}
                  {item.price}
                </p>
              </div>
              <Button
                variant="ghost"
                // size=""
                onClick={() => onRemoveItem(item.id)}
                className="text-red-400 hover:text-red-300 h-7 w-7 p-0">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )})}
    </div>
  );
};
