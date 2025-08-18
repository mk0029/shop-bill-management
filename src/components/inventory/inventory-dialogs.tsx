import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Product, useInventoryStore } from "@/store/inventory-store";

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
  const { updateProductDetails } = useInventoryStore();
  const [editFormData, setEditFormData] = useState({
    name: "",
    purchasePrice: "",
    sellingPrice: "",
    stockToAdd: "",
  });

  useEffect(() => {
    if (selectedProduct) {
      setEditFormData({
        name: selectedProduct.name || "",
        purchasePrice: selectedProduct.pricing?.purchasePrice?.toString() || "",
        sellingPrice: selectedProduct.pricing?.sellingPrice?.toString() || "",
        stockToAdd: "0",
      });
    }
  }, [selectedProduct]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const success = await updateProductDetails(selectedProduct._id, {
      name: editFormData.name,
      pricing: {
        purchasePrice: parseFloat(editFormData.purchasePrice) || undefined,
        sellingPrice: parseFloat(editFormData.sellingPrice) || undefined,
      },
      stockToAdd: parseInt(editFormData.stockToAdd, 10) || 0,
    });

    if (success) {
      onEditCancel(); // Close dialog on success
    }
  };

  const handleInputChange = (
    field: keyof typeof editFormData,
    value: string
  ) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
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
                value={editFormData.name}
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
                  value={editFormData.purchasePrice}
                  onChange={(e) =>
                    handleInputChange("purchasePrice", e.target.value)
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Selling Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.sellingPrice}
                  onChange={(e) =>
                    handleInputChange("sellingPrice", e.target.value)
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Add Stock</Label>
              <Input
                type="number"
                value={editFormData.stockToAdd}
                onChange={(e) => handleInputChange("stockToAdd", e.target.value)}
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
