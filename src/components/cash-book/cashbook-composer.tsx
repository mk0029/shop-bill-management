"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import AddNoteItem from "@/components/cash-book/add-note-item";
import { customerCashbookService } from "@/lib/customer-cashbook-service";
import { stockApi } from "@/lib/inventory-api";
import { sanityClient } from "@/lib/sanity";
import { toast } from "sonner";

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
  const [noteType, setNoteType] = useState<string>("labour");
  const [noteLabel, setNoteLabel] = useState<string>("");
  const [noteAmount, setNoteAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);

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

  const onAddNoteCharge = async () => {
    const label = noteLabel?.trim() || noteType;
    const amt = Number(noteAmount);
    if (!label) return toast.error("Enter note");
    if (!amt || amt < 0) return toast.error("Enter amount");
    setSaving(true);
    try {
      await customerCashbookService.addItem({
        cashbookId,
        customerId,
        itemName: label,
        quantity: 1,
        unitPrice: amt,
        unit: "",
        notes: noteType,
      });
      toast.success("Added");
      setOpenNoteModal(false);
      setNoteLabel("");
      setNoteAmount("");
      await loadItems();
    } catch {
      toast.error("Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const adjustQuantity = async (it: any, delta: number) => {
    const currentQty = Number(it.quantity) || 0;
    const unitRate = Number(it.unitPrice) || 0;
    const nextQty = Math.max(1, currentQty + delta);
    if (nextQty === currentQty) return;
    setSaving(true);
    try {
      await sanityClient
        .patch(it._id)
        .set({
          quantity: nextQty,
          totalPrice: Math.max(0, nextQty * unitRate),
          updatedAt: new Date().toISOString(),
        })
        .commit();

      const prodRef = (it.product &&
        ((it.product as any)._ref || it.product)) as string | undefined;
      const diff = nextQty - currentQty;
      if (prodRef && diff !== 0) {
        try {
          await stockApi.createStockTransaction({
            productId: prodRef,
            type: diff > 0 ? "sale" : "return",
            quantity: Math.abs(diff),
            unitPrice: unitRate,
            notes: `Cashbook item ${it._id} quantity ${diff > 0 ? "+" : "-"}${Math.abs(diff)}`,
          });
        } catch {}
      }
      await loadItems();
    } catch {
      toast.error("Failed to update quantity");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-gray-300">Cashbook Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. RK Wiring Project"
            />
          </div>
        </div>{" "}
        <div className="space-y-1">
          <Label className="text-gray-300">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any notes..."
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => setOpenNoteModal(true)}>Recive Note</Button>
        <AddNoteItem
          cashbookId={cashbookId}
          customerId={customerId}
          onAdded={loadItems}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-lg p-4">
          <h2 className="text-white font-semibold mb-3">Pending Items</h2>
          {pending.length === 0 && (
            <div className="text-gray-400 text-sm">No pending items</div>
          )}
          <ul className="divide-y divide-gray-800">
            {pending.map((it) => (
              <li
                key={it._id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="text-gray-200">
                  <div className="font-medium">{it.itemName}</div>
                  <div className="text-xs text-gray-400">
                    ₹{it.unitPrice} each
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustQuantity(it, -1)}
                  >
                    -
                  </Button>
                  <div className="min-w-10 text-center text-white">
                    {it.quantity}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustQuantity(it, +1)}
                  >
                    +
                  </Button>
                </div>
                <div className="text-xs text-gray-300 w-28 text-right">
                  ₹{it.totalPrice}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <h2 className="text-white font-semibold mb-3">Billed Items</h2>
          {billed.length === 0 && (
            <div className="text-gray-400 text-sm">No billed items</div>
          )}
          <ul className="divide-y divide-gray-800">
            {billed.map((it) => (
              <li
                key={it._id}
                className="py-3 flex items-center justify-between opacity-70"
              >
                <div className="text-gray-200">
                  <div className="font-medium">{it.itemName}</div>
                  <div className="text-xs text-gray-400">
                    {it.quantity} × ₹{it.unitPrice} • ₹{it.totalPrice}
                  </div>
                </div>
                <div className="text-xs text-gray-500">Locked</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Modal
        isOpen={openNoteModal}
        onClose={() => setOpenNoteModal(false)}
        title="Add Note Charge"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-gray-300">Type</Label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100"
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
            >
              <option value="labour">Labour Charge</option>
              <option value="repair">Repair Fee</option>
              <option value="visiting">Visiting Fee</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Note</Label>
            <Input
              value={noteLabel}
              onChange={(e) => setNoteLabel(e.target.value)}
              placeholder="e.g. Fan installation"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Amount</Label>
            <Input
              value={noteAmount}
              onChange={(e) => setNoteAmount(e.target.value)}
              placeholder="e.g. 250"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpenNoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={onAddNoteCharge} disabled={saving}>
              {saving ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
