"use client";

import { Modal } from "@/components/ui/modal";
import { useMemo } from "react";

interface SubcategorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentCategoryName: string | null;
  categories: any[];
  activeProducts: any[];
  onPickSubcategory: (subcategoryName: string) => void;
}

export const SubcategorySelectionModal = ({
  isOpen,
  onClose,
  parentCategoryName,
  categories,
  activeProducts,
  onPickSubcategory,
}: SubcategorySelectionModalProps) => {
  const parent = useMemo(
    () =>
      categories.find(
        (c) => c.name?.toLowerCase() === parentCategoryName?.toLowerCase()
      ),
    [categories, parentCategoryName]
  );

  const subCategories = useMemo(() => {
    if (!parent?._id) return [] as any[];
    return categories.filter((c) => c.parentCategory?._id === parent._id);
  }, [categories, parent]);

  const countFor = (sub: any) =>
    activeProducts.filter(
      (p) => p.category?.name?.toLowerCase() === sub.name?.toLowerCase()
    ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Select ${parentCategoryName} Subcategory`}>
      <div className="space-y-3">
        {subCategories.length === 0 ? (
          <p className="text-sm text-gray-400">
            No subcategories available. Try another category.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {subCategories.map((sub) => (
              <button
                key={sub._id}
                onClick={() => onPickSubcategory(sub.name.toLowerCase())}
                className="text-left p-3 bg-gray-800 border border-gray-700 hover:bg-gray-700 rounded">
                <p className="text-white text-sm font-medium">{sub.name}</p>
                <p className="text-xs text-gray-400">{countFor(sub)} items available</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
