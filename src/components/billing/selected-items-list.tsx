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
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">
          Selected Items ({selectedItems.length})
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-red-400 hover:text-red-300 text-xs">
          Clear All
        </Button>
      </div>

      {selectedItems.map((item) => (
        <div
          key={item.id}
          className="sm:p-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              {item.category === "Rewinding Service" ? (
                <div>
                  <p className="font-medium text-white text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.specifications}</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-white text-sm">{item.name}</p>
                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{item.brand}</p>
                  <p className="text-xs text-gray-400">{item.specifications}</p>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-400 font-medium">
                {currency}
                {item.price} each
              </p>
              <p className="text-xs text-gray-500">Stock available</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="h-6 w-6 sm:w-8 sm:h-8 p-0 text-xs">
                  -
                </Button>
                <span className="text-white font-medium w-8 text-center text-sm">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="h-6 w-6 sm:w-8 sm:h-8 p-0 text-xs">
                  +
                </Button>
              </div>
              <span className="text-xs text-gray-400">Qty</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold text-white text-sm">
                  {currency}
                  {item.total}
                </p>
                <p className="text-xs text-gray-400">
                  {item.quantity} × {currency}
                  {item.price}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveItem(item.id)}
                className="text-red-400 hover:text-red-300">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
