import React from "react";
import { useLocaleStore } from "@/store/locale-store";
import { Item } from "@/types";

interface AvailableItemsListProps {
  items: Item[];
  onItemAdd: (item: Item) => void;
}

export function AvailableItemsList({
  items,
  onItemAdd,
}: AvailableItemsListProps) {
  const { currency } = useLocaleStore();

  return (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
        Add Items
      </label>
      <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 border border-gray-700 touch-manipulation min-h-[52px]"
            onClick={() => onItemAdd(item)}>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs sm:text-sm font-medium truncate">
                {item.name}
              </p>
              <p className="text-gray-400 text-xs truncate">
                {(item.category as any)?.name || "No Category"}
              </p>
            </div>
            <p className="text-white font-medium text-sm ml-2">
              {currency}
              {item.price}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AvailableItemsList;
