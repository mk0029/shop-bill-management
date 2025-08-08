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
      <div className="text-center py-8 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No items selected</p>
        <p className="text-sm">Click on items from the left to add them</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700"
        >
          <div className="flex-1">
            <p className="text-white text-sm">{item.name}</p>
            <p className="text-gray-400 text-xs">
              {currency}
              {item.price} each
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onQuantityUpdate(item.id, item.quantity - 1)}
              className="hover:bg-gray-700"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-white w-8 text-center">{item.quantity}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onQuantityUpdate(item.id, item.quantity + 1)}
              className="hover:bg-gray-700"
            >
              +
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onItemRemove(item.id)}
              className="hover:bg-red-900/20 text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-white font-medium w-20 text-right">
            {currency}
            {item.total.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

export default SelectedItemsList;
