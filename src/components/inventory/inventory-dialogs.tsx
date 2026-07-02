"use client";

import { Button } from "@/components/ui/button";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { AlertTriangle } from "lucide-react";

interface InventoryDialogsProps {
  showDeleteDialog: boolean;
  showEditDialog: boolean;
  selectedProduct: any | null;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onEditCancel: () => void;
}

export const InventoryDialogs = ({
  showDeleteDialog,
  selectedProduct,
  onDeleteConfirm,
  onDeleteCancel,
}: InventoryDialogsProps) => {
  return (
    <BaseGlassModal isOpen={showDeleteDialog} onClose={onDeleteCancel} showCloseButton={false} mobileType="modal" size="sm" zIndex={230}>
      <div className="p-5 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Delete Product</h3>
        <p className="text-sm text-gray-400">
          Are you sure you want to delete{" "}
          <span className="text-white font-medium">
            {(selectedProduct as any)?.name ||
              `${(selectedProduct as any)?.category?.name || "Unknown"} - ${(selectedProduct as any)?.brand?.name || "Unknown"}`}
          </span>
          ? This action cannot be undone.
        </p>
      </div>
      <div className="flex gap-3 p-4 pt-0">
        <Button variant="outline" onClick={onDeleteCancel} className="flex-1">
          Cancel
        </Button>
        <Button variant="destructive" onClick={onDeleteConfirm} className="flex-1">
          Delete
        </Button>
      </div>
    </BaseGlassModal>
  );
};
