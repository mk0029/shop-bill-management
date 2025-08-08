import React from "react";
import { Button } from "@/components/ui/button";
import { Minus, Trash2, FileText } from "lucide-react";
import { useLocaleStore } from "@/store/locale-store";
import { BillItem } from "@/types";

interface SelectedItemsListProps {
  items: BillItem[];
  onQuantityUpdate: (itemId: string, quantity: number) => void;
  onItemRemove: (itemId: string) => void;
}

export function SelectedItemsList({
  items,
  onQuantityUpdate,
  onItemRemove,
}: SelectedItemsListProps) {
  const { currency } = useLocaleStore();

  if (items.length === 0) {
    return (
      <div className="text-center py-6 sm:py-8 text-gray-400">
        <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm sm:text-base">No items selected</p>
        <p className="text-xs sm:text-sm">
          Click on items from above to add them
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-60 overflow-y-auto">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-800 rounded border border-gray-700"
        >
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs sm:text-sm font-medium truncate">
              {item.name}
            </p>
            <p className="text-gray-400 text-xs">
              {currency}
              {item.price} each
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onQuantityUpdate(item.id, item.quantity - 1)}
                className="hover:bg-gray-700 h-8 w-8 p-0"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="text-white w-8 text-center font-medium">
                {item.quantity}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onQuantityUpdate(item.id, item.quantity + 1)}
                className="hover:bg-gray-700 h-8 w-8 p-0"
              >
                <span className="text-sm">+</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-white font-medium text-sm">
                {currency}
                {item.total.toLocaleString()}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onItemRemove(item.id)}
                className="hover:bg-red-900/20 text-red-400 h-8 w-8 p-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SelectedItemsList;
