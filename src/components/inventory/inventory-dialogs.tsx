import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Simple Dialog Components
const Dialog = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => (
  <div
    className={`fixed inset-0 z-50 flex items-center justify-center ${
      open ? "block" : "hidden"
    }`}>
    <div
      className="fixed inset-0 bg-black/50"
      onClick={() => onOpenChange(false)}
    />
    <div className="relative z-50 w-full max-w-lg rounded-lg bg-gray-900 border border-gray-800 p-6 shadow-lg">
      {children}
    </div>
  </div>
);

const DialogContent = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-4">{children}</div>
);

const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">{children}</div>
);

const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-white">{children}</h2>
);

interface InventoryDialogsProps {
  showDeleteDialog: boolean;
  showEditDialog: boolean;
  selectedProduct: any;
  onDeleteConfirm: () => void;
  onEditSave: (product: any) => void;
  onDeleteCancel: () => void;
  onEditCancel: () => void;
}

export const InventoryDialogs = ({
  showDeleteDialog,
  showEditDialog,
  selectedProduct,
  onDeleteConfirm,
  onEditSave,
  onDeleteCancel,
  onEditCancel,
}: InventoryDialogsProps) => {
  const [editFormData, setEditFormData] = useState(selectedProduct || {});

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEditSave(editFormData);
  };

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={onDeleteCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete "
              {selectedProduct?.name ||
                `${selectedProduct?.category} - ${selectedProduct?.brand}`}
              "? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onDeleteCancel}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={onDeleteConfirm}
                className="bg-red-600 hover:bg-red-700">
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={onEditCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Purchase Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.purchasePrice || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      purchasePrice: e.target.value,
                    }))
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Selling Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.sellingPrice || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      sellingPrice: e.target.value,
                    }))
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Current Stock</Label>
              <Input
                type="number"
                value={editFormData.currentStock || ""}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    currentStock: e.target.value,
                  }))
                }
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <textarea
                value={editFormData.description || ""}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Product description..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onEditCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
