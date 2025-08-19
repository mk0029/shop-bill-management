"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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

      {selectedItems.map((item) => (
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
              {/* Subtle brand/spec, single line truncated */}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                className="h-6 w-6 p-0 text-[11px]">
                -
              </Button>
              <span className="text-white font-medium w-7 text-center text-xs">
                {item.quantity}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="h-6 w-6 p-0 text-[11px]">
                +
              </Button>
              <span className="text-[10px] text-gray-400 ml-1">Qty</span>
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
                size="sm"
                onClick={() => onRemoveItem(item.id)}
                className="text-red-400 hover:text-red-300 h-7 w-7 p-0">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
