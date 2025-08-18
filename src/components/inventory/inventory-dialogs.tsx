import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Product } from "@/store/inventory-store";
import { DynamicSpecificationFields } from "@/components/forms/dynamic-specification-fields";

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
  selectedProduct: Product | null;
  onDeleteConfirm: () => void;
  onEditSave: (product: Product) => void;
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
  const [editFormData, setEditFormData] = useState<Product | null>(null);

  useEffect(() => {
    if (selectedProduct) {
      setEditFormData({
        ...selectedProduct,
        inventory: {
          ...selectedProduct.inventory,
          currentStock: 0,
        },
      });
    } else {
      setEditFormData(null);
    }
  }, [selectedProduct]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData) return;
    onEditSave(editFormData);
  };

  const handleInputChange = (
    field: string,
    value: string,
    parentField?: string
  ) => {
    setEditFormData((prev: any) => {
      if (parentField) {
        return {
          ...prev,
          [parentField]: {
            ...prev[parentField],
            [field]: value,
          },
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSpecificationChange = (field: string, value: string) => {
    setEditFormData(
      (prev) =>
        ({
          ...prev,
          specifications: { ...prev?.specifications, [field]: value },
        } as Product)
    );
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
              {(selectedProduct as any)?.name ||
                `${(selectedProduct as any)?.category} - ${(selectedProduct as any)?.brand}`}
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
            <div className="space-y-2">
              <Label className="text-gray-300">Product Name</Label>
              <Input
                value={editFormData?.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Purchase Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData?.pricing?.purchasePrice || ""}
                  onChange={(e) =>
                    handleInputChange("purchasePrice", e.target.value, "pricing")
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Selling Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData?.pricing?.sellingPrice || ""}
                  onChange={(e) =>
                    handleInputChange("sellingPrice", e.target.value, "pricing")
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Current Stock</Label>
              <Input
                type="number"
                value={editFormData?.inventory?.currentStock || ""}
                onChange={(e) =>
                  handleInputChange("currentStock", e.target.value, "inventory")
                }
                className="bg-gray-800 border-gray-700 text-white"
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
