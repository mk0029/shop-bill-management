"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Dropdown } from "@/components/ui/dropdown";
import { useProducts } from "@/hooks/use-sanity-data";
import { customerCashbookService } from "@/lib/customer-cashbook-service";
import { stockApi } from "@/lib/inventory-api";
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
  const [mode, setMode] = useState<"charge" | "inventory">("inventory");
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [note, setNote] = useState<string>("");
  // Charge fields
  const [chargeType, setChargeType] = useState<string>("labour");
  const [chargeLabel, setChargeLabel] = useState<string>("");
  const [chargeAmount, setChargeAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<
    Array<{ product: any; qty: number }>
  >([]);
  const [totalAmount, setTotalAmount] = useState<string>("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [] as any[];
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

  const addInventoryItem = async () => {
    // If multiple selected items, add all in a single attempt
    if (selectedItems.length > 0) {
      const override = Number(totalAmount);
      const defaultsTotal = selectedItems.reduce((sum, si) => {
        const rate = si.product?.pricing?.sellingPrice ?? 0;
        const q = Math.max(1, Number(si.qty) || 1);
        return sum + q * rate;
      }, 0);
      const scale =
        override > 0 && defaultsTotal > 0 ? override / defaultsTotal : 1;
      setSubmitting(true);
      try {
        for (const si of selectedItems) {
          const p = si.product;
          const q = Math.max(1, Number(si.qty) || 1);
          const baseRate = p?.pricing?.sellingPrice ?? 0;
          const effRate = Math.max(0, baseRate * scale);
          const u = p?.pricing?.unit ?? "";
          const res = await customerCashbookService.addItem({
            cashbookId,
            customerId,
            productId: p._id,
            itemName: p.name,
            quantity: q,
            unitPrice: effRate,
            unit: u,
            notes: note,
          });
          if (!res.success) {
            toast.error(res.error || `Failed to add ${p.name}`);
            continue;
          }
          try {
            await stockApi.createStockTransaction({
              productId: p._id,
              type: "sale",
              quantity: q,
              unitPrice: effRate,
              notes: `Cashbook sale to book ${cashbookId}`,
            });
          } catch {}
        }
        toast.success("Items added & stock deducted");
        setOpen(false);
        setSearch("");
        setSelectedItems([]);
        setSelectedProductId("");
        setQuantity("1");
        setNote("");
        setTotalAmount("");
        onAdded?.();
      } catch (e) {
        toast.error("Failed to add item");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    // Single item fallback
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
        // Deduct stock via stock transaction (sale)
        try {
          await stockApi.createStockTransaction({
            productId: selectedProduct._id,
            type: "sale",
            quantity: qty,
            unitPrice: selectedProduct?.pricing?.sellingPrice ?? unitPrice ?? 0,
            notes: `Cashbook sale to book ${cashbookId}`,
          });
        } catch {}
        toast.success("Item added & stock deducted");
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

  const addCharge = async () => {
    const label = chargeLabel?.trim() || chargeType;
    const amt = Number(chargeAmount);
    if (!label) return toast.error("Enter note");
    if (!amt || amt < 0) return toast.error("Enter amount");
    setSubmitting(true);
    try {
      const res = await customerCashbookService.addItem({
        cashbookId,
        customerId,
        itemName: label,
        quantity: 1,
        unitPrice: amt,
        unit: "",
        notes: chargeType,
      });
      if (!res.success) {
        toast.error(res.error || "Failed to add charge");
      } else {
        toast.success("Charge added");
        setOpen(false);
        setChargeLabel("");
        setChargeAmount("");
        setNote("");
        onAdded?.();
      }
    } catch {
      toast.error("Failed to add charge");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        Add Items / Notes
      </Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add to Cashbook"
      >
        <div className="space-y-4">
          {/* Mode switch */}
          <div className="flex gap-2">
            <Button
              variant={mode === "inventory" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("inventory")}
            >
              Inventory Item
            </Button>
            <Button
              variant={mode === "charge" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("charge")}
            >
              Charge
            </Button>
          </div>

          {mode === "charge" ? (
            <>
              <div className="space-y-1">
                <Label className="text-gray-300">Type</Label>
                <Dropdown
                  options={[
                    { value: "labour", label: "Labour Charge" },
                    { value: "repair", label: "Repair Fee" },
                    { value: "visiting", label: "Visiting Fee" },
                    { value: "other", label: "Other" },
                  ]}
                  value={chargeType}
                  onValueChange={(v) => setChargeType(v)}
                  placeholder="Select type"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Note</Label>
                <Input
                  value={chargeLabel}
                  onChange={(e) => setChargeLabel(e.target.value)}
                  placeholder="e.g. Fan installation"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Amount</Label>
                <Input
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  placeholder="e.g. 250"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addCharge} disabled={submitting}>
                  Add
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-gray-300">Search item</Label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or brand"
                />
                {filtered.length > 0 && (
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-800 rounded border border-gray-800">
                    {filtered.map((p: any) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => {
                          setSelectedItems((prev) => {
                            if (prev.some((x) => x.product._id === p._id))
                              return prev;
                            return [...prev, { product: p, qty: 1 }];
                          });
                          setSearch("");
                        }}
                        className={`w-full text-left p-2 hover:bg-gray-800`}
                      >
                        <div className="text-gray-200 font-medium">
                          {p.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          ₹{p.pricing?.sellingPrice} • {p.brand?.name || ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedItems.length > 0 && (
                <div className="space-y-2">
                  {selectedItems.map((si, idx) => (
                    <div
                      key={si.product._id}
                      className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded p-2"
                    >
                      <div className="text-gray-200">
                        <div className="font-medium text-sm">
                          {si.product.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          ₹{si.product?.pricing?.sellingPrice} •{" "}
                          {si.product?.brand?.name || ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setSelectedItems((prev) => {
                              const next = [...prev];
                              next[idx] = {
                                ...next[idx],
                                qty: Math.max(1, (next[idx].qty || 1) - 1),
                              };
                              return next;
                            })
                          }
                        >
                          -
                        </Button>
                        <div className="min-w-10 text-center text-white">
                          {si.qty}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setSelectedItems((prev) => {
                              const next = [...prev];
                              next[idx] = {
                                ...next[idx],
                                qty: (next[idx].qty || 1) + 1,
                              };
                              return next;
                            })
                          }
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setSelectedItems((prev) =>
                              prev.filter(
                                (x) => x.product._id !== si.product._id,
                              ),
                            )
                          }
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-gray-300">Note</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Add a note for this point"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Total Amount</Label>
                <Input
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="Optional overall total to add"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={addInventoryItem}
                  disabled={
                    submitting ||
                    (selectedItems.length === 0 && !selectedProduct)
                  }
                >
                  Add
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
