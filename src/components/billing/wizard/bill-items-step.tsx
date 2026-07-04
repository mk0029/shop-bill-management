"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, Minus, Trash2, PackagePlus } from "lucide-react";
import { formatCurrency } from "@/lib/inventory-helpers";

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

interface BillItemsStepProps {
  selectedItems: BillItem[];
  onUpdateQuantity: (
    itemId: string,
    quantity: number,
    maxStock?: number,
  ) => void;
  onRemoveItem: (itemId: string) => void;
  onClearAll: () => void;
  onOpenItemSelection: () => void;
  onOpenManualItem: () => void;
  categories: any[];
}

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

export function BillItemsStep({
  selectedItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
  onOpenItemSelection,
  onOpenManualItem,
}: BillItemsStepProps) {
  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onOpenItemSelection}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl transition-all"
          style={{
            background: "rgba(56,189,248,0.1)",
            border: "1px solid rgba(56,189,248,0.2)",
            color: "rgba(56,189,248,0.9)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(56,189,248,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(56,189,248,0.1)";
          }}
        >
          <PackagePlus className="w-4 h-4" />
          <span className="text-sm font-medium">Browse Inventory</span>
        </button>
        <button
          type="button"
          onClick={onOpenManualItem}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(148,163,184,0.8)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.06)";
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Custom Item</span>
        </button>
      </div>

      {/* Items list */}
      {selectedItems.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.08)",
          }}
        >
          <ShoppingCart
            className="w-10 h-10 mb-3"
            style={{ color: "rgba(148,163,184,0.3)" }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: "rgba(148,163,184,0.5)" }}
          >
            No items added yet
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "rgba(148,163,184,0.3)" }}
          >
            Browse inventory or add a custom item
          </p>
        </div>
      ) : (
        <div style={glassCardStyle} className="p-3 sm:p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart
                className="w-4 h-4"
                style={{ color: "rgba(56,189,248,0.6)" }}
              />
              <span className="text-white text-sm font-medium">
                {selectedItems.length} item
                {selectedItems.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs px-2 py-1 rounded-lg transition-all"
              style={{
                color: "rgba(248,113,113,0.6)",
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.12)",
              }}
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2">
            {selectedItems.map((item) => (
              <div key={item.id} style={glassItemStyle} className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate">
                      {item.name}
                    </p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "rgba(148,163,184,0.4)" }}
                    >
                      {[item.brand, item.specifications]
                        .filter(Boolean)
                        .join(" \u00B7 ")}
                    </p>
                  </div>
                  <p
                    className="text-xs font-medium shrink-0"
                    style={{ color: "rgba(56,189,248,0.7)" }}
                  >
                    {formatCurrency(item.price)}/ea
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1 rounded-lg shrink-0"
                    style={{ color: "rgba(248,113,113,0.4)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const dec = /wire|pipe/i.test(item.category || "")
                          ? 0.25
                          : 1;
                        const next = Math.max(dec, item.quantity - dec);
                        onUpdateQuantity(item.id, next, item.maxStock);
                      }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <Minus
                        className="w-3 h-3"
                        style={{ color: "rgba(148,163,184,0.5)" }}
                      />
                    </button>
                    <span className="text-white text-xs font-medium min-w-[24px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const inc = /wire|pipe/i.test(item.category || "")
                          ? 0.25
                          : 1;
                        const next = item.quantity + inc;
                        onUpdateQuantity(item.id, next, item.maxStock);
                      }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <Plus
                        className="w-3 h-3"
                        style={{ color: "rgba(148,163,184,0.5)" }}
                      />
                    </button>
                    <span
                      className="text-[10px] ml-1"
                      style={{ color: "rgba(148,163,184,0.3)" }}
                    >
                      {item.unit || "pcs"}
                    </span>
                  </div>
                  <p className="text-white text-xs font-semibold">
                    {formatCurrency(item.total)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
