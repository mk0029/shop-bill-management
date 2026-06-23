"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Product } from "@/store/inventory-store";
import { AlertTriangle, X } from "lucide-react";

interface InventoryDialogsProps {
  showDeleteDialog: boolean;
  showEditDialog: boolean;
  selectedProduct: Product | null;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onEditCancel: () => void;
}

export const InventoryDialogs = ({
  showDeleteDialog,
  showEditDialog,
  selectedProduct,
  onDeleteConfirm,
  onDeleteCancel,
  onEditCancel,
}: InventoryDialogsProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[230] flex items-center justify-center p-3"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onDeleteCancel}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative bg-gray-900 border border-white/[0.08] rounded-xl w-full max-w-sm shadow-2xl backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
            >
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
                <Button
                  variant="destructive"
                  onClick={onDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-500"
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit dialog is handled by ProductDetailModal now */}
    </>
  );
};
