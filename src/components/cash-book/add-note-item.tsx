"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { useProducts } from "@/hooks/use-sanity-data";
import { customerCashbookService } from "@/lib/customer-cashbook-service";
import { toast } from "sonner";

interface Props {
  cashbookId: string;
  customerId?: string;
  onAdded?: () => void;
}

export default function AddNoteItem({
  cashbookId,
  customerId,
  onAdded,
}: Props) {
  const { activeProducts } = useProducts();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeProducts.slice(0, 25);
    return activeProducts
      .filter(
        (p: any) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.brand?.name || "").toLowerCase().includes(q),
      )
      .slice(0, 25);
  }, [search, activeProducts]);

  const selectedProduct = useMemo(
    () => activeProducts.find((p: any) => p._id === selectedProductId),
    [selectedProductId, activeProducts],
  );

  const unitPrice: number = selectedProduct?.pricing?.sellingPrice ?? 0;
  const unit: string = selectedProduct?.pricing?.unit ?? "";

  const addItem = async () => {
    if (!selectedProduct) {
      toast.error("Please select an item");
      return;
    }
    const qty = Number(quantity);
    if (!(qty > 0)) {
      toast.error("Enter a valid quantity");
      return;
    }
    setSubmitting(true);
    try {
      const res = await customerCashbookService.addItem({
        cashbookId,
        customerId,
        productId: selectedProduct._id,
        itemName: selectedProduct.name,
        quantity: qty,
        unitPrice: unitPrice,
        unit,
        notes: note,
      });
      if (!res.success) {
        toast.error(res.error || "Failed to add item");
      } else {
        toast.success("Item added to cashbook");
        setOpen(false);
        setSearch("");
        setSelectedProductId("");
        setQuantity("1");
        setNote("");
        onAdded?.();
      }
    } catch (e) {
      toast.error("Failed to add item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        Add Note
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add Note Item">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Search item</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or brand"
            />
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-800 rounded border border-gray-800">
              {filtered.map((p: any) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => setSelectedProductId(p._id)}
                  className={`w-full text-left p-2 hover:bg-gray-800 ${selectedProductId === p._id ? "bg-gray-800" : ""}`}
                >
                  <div className="text-gray-200 font-medium">{p.name}</div>
                  <div className="text-xs text-gray-400">
                    ₹{p.pricing?.sellingPrice} • {p.brand?.name || ""}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-3 text-gray-500 text-sm">No results</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-gray-300">Quantity</Label>
              <Input
                type="number"
                min={"0.0001"}
                step={"0.0001"}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Rate</Label>
              <Input value={unitPrice} disabled />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300">Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a note for this point"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addItem} disabled={submitting || !selectedProduct}>
              Add
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
