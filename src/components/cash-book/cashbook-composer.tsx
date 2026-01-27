"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { SelectField } from "@/components/ui/select";
import { customerCashbookService } from "@/lib/customer-cashbook-service";
import { stockApi } from "@/lib/inventory-api";
import { sanityClient } from "@/lib/sanity";
import { toast } from "sonner";
import { ItemSelectionSection } from "@/components/billing/item-selection-section";
import { ItemSelectionModal } from "@/components/billing/item-selection-modal";
import { SelectedItemsList } from "@/components/billing/selected-items-list";
import { useProducts, useCategories, useBrands } from "@/hooks/use-sanity-data";
import { useItemSelection } from "@/hooks/use-item-selection";
import { RefreshCw, MoreVertical, ArrowLeft, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Heading from "../ui/common/Heading";
import ResponsiveAccordion from "../ui/responsive-accordion";

interface Props {
  cashbookId: string;
  customerId?: string;
  initialName?: string;
  initialNotes?: string;
}

export default function CashbookComposer({
  cashbookId,
  customerId,
  initialName = "",
  initialNotes = "",
}: Props) {
  const storageKey = `cashbook_draft_${cashbookId}`;
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes || "");
  const [items, setItems] = useState<any[]>([]);
  const [openNoteModal, setOpenNoteModal] = useState(false);
  const [noteType, setNoteType] = useState<string>("");
  const [noteLabel, setNoteLabel] = useState<string>("");
  const [noteAmount, setNoteAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [confirmBillOpen, setConfirmBillOpen] = useState(false);

  const { activeProducts, isLoading: productsLoading } = useProducts();
  const { categories } = useCategories();
  const { brands } = useBrands();
  const {
    itemSelectionModal,
    openItemSelectionModal,
    closeItemSelectionModal,
    updateSpecificationFilter,
    filterItemsBySpecifications,
  } = useItemSelection();

  const [selectedSaleItems, setSelectedSaleItems] = useState<
    Record<
      string,
      {
        name: string;
        price: number;
        qty: number;
        maxQty: number;
        category?: string;
        brand?: string;
        specifications?: string;
        unit?: string;
      }
    >
  >({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.name) setName(draft.name);
        if (typeof draft?.notes === "string") setNotes(draft.notes);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const payload = { name, notes };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [name, notes, storageKey]);

  const loadItems = useCallback(async () => {
    try {
      const q = `*[_type == "cashbookItem" && cashbook._ref == $ref] | order(createdAt asc)`;
      const its = await sanityClient.fetch(q, { ref: cashbookId });
      setItems(Array.isArray(its) ? its : []);
    } catch {}
  }, [cashbookId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const pending = useMemo(() => items.filter((i) => !i.bill), [items]);
  const billed = useMemo(() => items.filter((i) => i.bill), [items]);

  const filteredItems = filterItemsBySpecifications(activeProducts);

  const onAddSaleItem = (p: any) => {
    setSelectedSaleItems((prev) => {
      const next = { ...prev } as typeof prev;
      const available = Number(p?.inventory?.currentStock ?? 0) || 0;
      const defaultPrice = Number(p?.pricing?.sellingPrice || 0) || 0;
      if (available <= 0) {
        toast.error(`${p?.name ?? "Item"} is out of stock`);
        return prev;
      }
      const existing = next[p._id];
      if (existing) {
        const newQty = Math.min(existing.qty + 1, available);
        next[p._id] = { ...existing, qty: newQty };
      } else {
        next[p._id] = {
          name: p.name,
          price: defaultPrice,
          qty: 1,
          maxQty: available,
          category: p.category?.name || "",
          brand: p.brand?.name || "",
          specifications: p.specifications || "",
          unit: p.unit || "",
        };
      }
      return next;
    });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setSelectedSaleItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const clamped = Math.max(
        1,
        Math.min(current.maxQty, Number(quantity) || 1),
      );
      return { ...prev, [itemId]: { ...current, qty: clamped } };
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedSaleItems((prev) => {
      if (!prev[itemId]) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleClearAll = () => setSelectedSaleItems({});

  // Totals must be computed via hooks at the component level (never inside callbacks)
  const saleTotal = useMemo(
    () =>
      Object.values(selectedSaleItems).reduce(
        (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
        0,
      ),
    [selectedSaleItems],
  );

  const chargeTotal = useMemo(() => {
    const n = Number(noteAmount);
    return n > 0 ? n : 0;
  }, [noteAmount]);

  const grandTotal = useMemo(
    () => saleTotal + chargeTotal,
    [saleTotal, chargeTotal],
  );

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0);
  };

  const submitItemsAndCharge = async () => {
    const saleItems = Object.entries(selectedSaleItems);
    const hasNote = (noteLabel?.trim() || "") && Number(noteAmount) > 0;
    if (saleItems.length === 0 && !hasNote) {
      toast.error("Select items or enter a charge");
      return;
    }
    try {
      setIsSubmitting(true);
      for (const [productId, it] of saleItems) {
        const qty = Number(it.qty) || 0;
        const price = Number(it.price) || 0;
        if (qty <= 0 || price < 0) continue;
        await customerCashbookService.addItem({
          cashbookId,
          customerId,
          productId,
          itemName: it.name,
          quantity: qty,
          unitPrice: price,
          unit: it.unit || "",
          specifications: it.specifications || "",
          category: it.category || "",
          brand: it.brand || "",
          notes: "inventory",
        });
        try {
          await stockApi.createStockTransaction({
            productId,
            type: "sale",
            quantity: qty,
            unitPrice: price,
            notes: `Sold via Customer Cashbook ${cashbookId}`,
            updateInventory: true,
          });
        } catch {}
      }
      if (hasNote) {
        await customerCashbookService.addItem({
          cashbookId,
          customerId,
          itemName: noteLabel.trim(),
          quantity: 1,
          unitPrice: Number(noteAmount),
          unit: "",
          notes: noteType,
        });
      }
      toast.success("Added");
      setOpenNoteModal(false);
      setNoteLabel("");
      setNoteAmount("");
      setSelectedSaleItems({});
      await loadItems();
    } catch (e) {
      toast.error("Failed to add");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert pending items to bill (component scope)
  const convertPendingToBill = async () => {
    if (!customerId) {
      toast.error("Customer is required to create a bill");
      return;
    }
    if (pending.length === 0) {
      toast.error("No pending items to add to bill");
      return;
    }
    try {
      setIsConverting(true);
      const res = await customerCashbookService.convertPendingItemsToBill({
        cashbookId,
        customerId,
        paymentStatus: "pending",
        notes: notes || "",
        homeVisitFee: 0,
        repairFee: 0,
        paidAmount: 0,
      });
      if (res.success) {
        toast.success("Items added to bill");
        await loadItems();
      } else {
        toast.error(res.error || "Failed to add to bill");
      }
    } catch (e) {
      toast.error("Failed to add to bill");
    } finally {
      setIsConverting(false);
    }
  };

  // Remove a billed link from item
  const removeFromBill = async (it: any) => {
    try {
      await sanityClient
        .patch(it._id)
        .unset(["bill"])
        .set({ locked: false, updatedAt: new Date().toISOString() })
        .commit();
      toast.success("Removed from bill");
      setMenuOpenId(null);
      await loadItems();
    } catch {
      toast.error("Failed to remove");
    }
  };

  // Delete a pending item (with inventory revert if applicable)
  const deletePendingItem = async (it: any) => {
    const qty = Number(it.quantity) || 0;
    const unitRate = Number(it.unitPrice) || 0;
    const prodRef = (it.product &&
      ((it.product as any)?._ref || it.product)) as string | undefined;
    setSaving(true);
    try {
      // Delete the cashbook item
      await sanityClient.delete(it._id);

      // Revert inventory if this was linked to a product
      if (prodRef && qty > 0) {
        try {
          await stockApi.createStockTransaction({
            productId: prodRef,
            type: "return",
            quantity: qty,
            unitPrice: unitRate,
            notes: `Cashbook item ${it._id} deleted`,
            updateInventory: true,
          });
        } catch {}
      }

      // Notify admins on cashbook item deletion
      toast.success("Item deleted");
      await loadItems();
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex justify-between">
        {" "}
        <Link href="/admin/cashbooks">
          <Button
            variant="secondary"
            className="px-4"
            size="icon"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-gray-300" />
            &nbsp; <span className="hidden sm:inline-block">Back</span>
          </Button>
        </Link>{" "}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setConfirmBillOpen(true)}
            disabled={isConverting || pending.length === 0 || !customerId}
          >
            {isConverting ? "Adding Bill..." : "Add to Bill"}
          </Button>
          <Button onClick={() => setOpenNoteModal(true)}>Add Items</Button>
        </div>
      </div>
      <ResponsiveAccordion
        removePX
        desktopCollapsible
        title={
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Heading as="h4" className="text-gray-300">
                  {initialName}
                </Heading>
              </div>
            </div>
          </div>
        }
      >
        <div className="bg-gray-900 rounded-lg px-2 py-3 sm:p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-gray-300">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes..."
            />
          </div>
          <div className="rounded-lg px-2 py-3 sm:p-4 bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 shadow-sm max-h-[50dvh] flex flex-col overflow-hidden">
            <h2 className="text-blue-300 text-sm font-semibold tracking-wide mb-3">
              Billed Items
            </h2>
            {billed.length === 0 && (
              <div className="text-gray-500 text-sm italic">
                No billed items
              </div>
            )}
            <ul className="flex grow h-full overflow-auto -mx-1 flex-wrap space-y-2">
              {billed.map((it) => (
                <li
                  key={it._id}
                  className="px-1  w-full sm:w-6/12 md:4/12 xl:w-3/12"
                >
                  <div className="py-3 px-3 flex items-center justify-between h-full hover:bg-gray-900/80 border border-white/50 border-solid rounded-md relative ">
                    {" "}
                    <div className="text-gray-200">
                      <div className="font-semibold flex items-center gap-2">
                        {it.itemName}
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-[10px]"
                        >
                          Added
                        </Badge>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {it.quantity} ×{" "}
                        {formatCurrency(Number(it.unitPrice) || 0)} •{" "}
                        {formatCurrency(Number(it.totalPrice) || 0)}
                      </div>
                    </div>
                    <div className="relative">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setMenuOpenId(menuOpenId === it._id ? null : it._id)
                        }
                      >
                        <MoreVertical className="w-4 h-4 text-gray-300" />
                      </Button>
                      {menuOpenId === it._id && (
                        <div className="absolute  flex items-center right-0 top-1/2 -translate-y-1/2 w-40 bg-gray-900 border border-gray-700 rounded-md shadow-md z-10">
                          <button
                            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
                            onClick={() => removeFromBill(it)}
                          >
                            Remove from Bill
                          </button>
                          <span
                            className="inline-block pr-1"
                            onClick={() => {
                              setMenuOpenId("");
                            }}
                          >
                            <XIcon className="size-5" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ResponsiveAccordion>

      <div className="flex flex-col sm:gap-3 xl:gap-6 max-h-[88dvh] rounded-lg p-4 bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 shadow-sm">
        <h2 className="text-blue-300 text-basse sm:text-lg font-semibold tracking-wide mb-3">
          Pending Items
        </h2>
        {pending.length === 0 && (
          <div className="text-gray-400 text-sm sm:text-base">
            No pending items
          </div>
        )}
        <ul className="divide-y divide-gray-800  h-full  overflow-auto flex flex-col grow">
          {pending.map((it) => (
            <li
              key={it._id}
              className="py-3 px-3 flex items-center justify-between gap-3 hover:bg-gray-900/40 rounded-md"
              title="Right-click to delete"
              onContextMenu={(e) => {
                e.preventDefault();
                setDeleteTarget(it);
                setDeleteDialogOpen(true);
              }}
            >
              <div className="text-gray-100">
                <div className="font-semibold flex items-center gap-2">
                  {it.itemName}
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[10px] border-yellow-300 text-yellow-300"
                  >
                    Not Added
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  {formatCurrency(Number(it.unitPrice) || 0)} each
                </div>
              </div>

              <div className="text-right text-blue-300 font-semibold w-28 text-lg md:text-xl">
                {formatCurrency(Number(it.totalPrice) || 0)}
              </div>
            </li>
          ))}
        </ul>
        {pending.length > 0 && (
          <div className="mt-3 border-t border-gray-800 pt-3 flex items-center justify-between">
            <div className="text-base sm:text-lg text-gray-400">Subtotal</div>
            <div className="text-white font-semibold text-xl sm:text-2xl">
              {formatCurrency(
                pending.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0),
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Add to Bill */}
      <Modal
        isOpen={confirmBillOpen}
        onClose={() => setConfirmBillOpen(false)}
        title="Add Items to Bill"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            Convert {pending.length} pending item
            {pending.length === 1 ? "" : "s"} into a bill?
          </p>
          {pending.length > 0 && (
            <div className="text-xs text-gray-400 flex items-center justify-between">
              <span>Subtotal</span>
              <span className="text-white font-semibold">
                {formatCurrency(
                  pending.reduce(
                    (s, it) => s + (Number(it.totalPrice) || 0),
                    0,
                  ),
                )}
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmBillOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await convertPendingToBill();
                setConfirmBillOpen(false);
              }}
              disabled={isConverting}
            >
              {isConverting ? "Adding..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={openNoteModal}
        onClose={() => setOpenNoteModal(false)}
        title="Add Items / Charges"
      >
        <div className="p-0 grid grid-cols-1 gap-4">
          <div className="space-y-3">
            <ResponsiveAccordion
              title="Select Item"
              desktopCollapsible
              className="!px-0"
            >
              {" "}
              <div className="-mx-3">
                {" "}
                <ItemSelectionSection
                  searcItemsClass="max-h-[100px]"
                  searcHeaderClass="mb-2"
                  searcCardClass="-mt-2"
                  categories={categories}
                  activeProducts={activeProducts}
                  productsLoading={productsLoading}
                  onOpenItemModal={(category) =>
                    openItemSelectionModal(category)
                  }
                />
              </div>
            </ResponsiveAccordion>
          </div>

          <div className="space-y-3">
            {Object.entries(selectedSaleItems).length > 0 && (
              <>
                {" "}
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium">Selected Items</h4>
                </div>
                <div className="border border-gray-700 rounded-md max-h-[50vh] overflow-auto p-2">
                  <SelectedItemsList
                    selectedItems={Object.entries(selectedSaleItems).map(
                      ([id, it]) => ({
                        id,
                        name: it.name,
                        price: Number(it.price) || 0,
                        quantity: Number(it.qty) || 0,
                        total: (Number(it.qty) || 0) * (Number(it.price) || 0),
                        category: it.category || "",
                        brand: it.brand || "",
                        specifications: it.specifications || "",
                        unit: it.unit || "",
                        maxStock: Number(it.maxQty) || 0,
                      }),
                    )}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onClearAll={handleClearAll}
                  />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label className="text-gray-300">Charge Type</Label>
              <SelectField
                value={noteType}
                onValueChange={(v) => setNoteType(v as string)}
                options={[
                  { value: "repair", label: "Repair Fee" },
                  { value: "visiting", label: "Visiting Fee" },
                  { value: "other", label: "Other" },
                ]}
                placeholder="Select charge type"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Charge Note</Label>
              <Input
                value={noteLabel}
                onChange={(e) => setNoteLabel(e.target.value)}
                placeholder="e.g. Fan installation"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Charge Amount</Label>
              <Input
                value={noteAmount}
                type="number"
                onChange={(e) => setNoteAmount(e.target.value)}
                placeholder="e.g. 250"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-white font-semibold">
                Total: {formatCurrency(grandTotal)}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpenNoteModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitItemsAndCharge}
                  disabled={isSubmitting || !(grandTotal > 0)}
                  className={
                    isSubmitting || !(grandTotal > 0)
                      ? "opacity-80 cursor-not-allowed"
                      : ""
                  }
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Adding...
                    </>
                  ) : (
                    <>Add</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <ItemSelectionModal
          isOpen={itemSelectionModal.isOpen}
          onClose={closeItemSelectionModal}
          selectedCategory={itemSelectionModal.selectedCategory}
          selectedSpecifications={itemSelectionModal.selectedSpecifications}
          onUpdateSpecification={updateSpecificationFilter}
          filteredItems={filteredItems}
          brands={brands}
          onAddItem={onAddSaleItem}
          activeProducts={activeProducts}
        />
      </Modal>
      {/* Delete confirmation popup */}
      <Modal
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
        title="Delete Item"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-white">
              {deleteTarget?.itemName || "this item"}
            </span>
            ?
          </p>
          <p className="text-xs text-gray-400">
            If this item is linked to inventory, its stock will be returned.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (deleteTarget) {
                  await deletePendingItem(deleteTarget);
                }
                setDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
