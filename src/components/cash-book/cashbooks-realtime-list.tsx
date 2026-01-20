"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { sanityClient } from "@/lib/sanity";
import { stockApi } from "@/lib/inventory-api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MoreVertical } from "lucide-react";

interface Book {
  _id: string;
  name?: string;
  status?: string;
  notes?: string;
  updatedAt?: string;
  _updatedAt?: string;
  customer?: { _id: string; name?: string; phone?: string };
}

interface Props {
  initial: Book[];
}

export default function CashbooksRealtimeList({ initial }: Props) {
  const [books, setBooks] = useState<Book[]>(initial || []);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [target, setTarget] = useState<Book | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    book: Book | null;
  }>({ open: false, x: 0, y: 0, book: null });
  const [returnInventory, setReturnInventory] = useState(true);

  useEffect(() => {
    const sub = sanityClient
      .listen(
        '*[_type == "customerCashbook"]{ _id, name, status, notes, updatedAt, _updatedAt, customer->{ _id, name, phone } }',
        {},
        { includeResult: true },
      )
      .subscribe((msg: any) => {
        const doc = msg.result as Book | undefined;
        if (!doc || !doc._id) return;
        setBooks((prev) => {
          const others = prev.filter((b) => b._id !== doc._id);
          const next = [doc, ...others];
          // sort by updated time desc
          return next.sort((a, b) => {
            const at = new Date(a.updatedAt || a._updatedAt || 0).getTime();
            const bt = new Date(b.updatedAt || b._updatedAt || 0).getTime();
            return bt - at;
          });
        });
      });

    return () => sub.unsubscribe();
  }, []);

  const content = useMemo(() => {
    if (!books || books.length === 0) {
      return <div className="text-gray-400">No cashbooks found.</div>;
    }
    return books.map((b) => {
      const linkId = b._id?.startsWith("drafts.") ? b._id.slice(7) : b._id;
      return (
        <Link key={b._id} href={`/admin/cashbooks/${linkId}`}>
          <Card
            className="cursor-pointer hover:bg-gray-800 transition-colors"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpenId(null);
              setCtxMenu({ open: true, x: e.clientX, y: e.clientY, book: b });
            }}
          >
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between gap-2">
                <span className="truncate">
                  {b.name || b.customer?.name || "Cashbook"}
                </span>
                <div className="flex items-center gap-2 relative">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      b.status === "open"
                        ? "bg-green-900 text-green-300"
                        : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {b.status || "open"}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === b._id ? null : b._id);
                    }}
                  >
                    <MoreVertical className="w-4 h-4 text-gray-300" />
                  </Button>
                  {menuOpenId === b._id && (
                    <div className="absolute right-0 top-6 w-44 bg-gray-900 border border-gray-700 rounded-md shadow-md z-10">
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTarget(b);
                          setEditName(b.name || "");
                          setEditNotes(b.notes || "");
                          setEditOpen(true);
                          setMenuOpenId(null);
                        }}
                      >
                        Edit name/title
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-gray-800"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTarget(b);
                          setDeleteOpen(true);
                          setMenuOpenId(null);
                        }}
                      >
                        Delete book
                      </button>
                    </div>
                  )}
                </div>
              </CardTitle>
              <div className="text-gray-400 text-sm">
                Customer: {b.customer?.name || "Unknown"}{" "}
                {b.customer?.phone ? `• ${b.customer.phone}` : ""}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                Updated{" "}
                {new Date(
                  b.updatedAt || b._updatedAt || Date.now(),
                ).toLocaleString()}
              </div>
            </CardHeader>
          </Card>
        </Link>
      );
    });
  }, [books]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {content}

      {/* Right-click context menu */}
      {ctxMenu.open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setCtxMenu({ open: false, x: 0, y: 0, book: null })}
          />
          <div
            className="fixed z-50 w-44 bg-gray-900 border border-gray-700 rounded-md shadow-lg"
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
              onClick={() => {
                if (!ctxMenu.book) return;
                setTarget(ctxMenu.book);
                setEditName(ctxMenu.book.name || "");
                setEditNotes(ctxMenu.book.notes || "");
                setEditOpen(true);
                setCtxMenu({ open: false, x: 0, y: 0, book: null });
              }}
            >
              Edit name/title
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-gray-800"
              onClick={() => {
                if (!ctxMenu.book) return;
                setTarget(ctxMenu.book);
                setDeleteOpen(true);
                setCtxMenu({ open: false, x: 0, y: 0, book: null });
              }}
            >
              Delete book
            </button>
          </div>
        </>
      )}

      {/* Edit modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Cashbook"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Cashbook name"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Notes / Title
            </label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              placeholder="Notes or title"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!target) return;
                setBusy(true);
                try {
                  await sanityClient
                    .patch(target._id)
                    .set({
                      name: editName,
                      notes: editNotes,
                      updatedAt: new Date().toISOString(),
                    })
                    .commit();
                  setEditOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              {busy ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Cashbook"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to delete this cashbook?
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={returnInventory}
              onChange={(e) => setReturnInventory(e.target.checked)}
            />
            Return product-linked items to inventory before delete
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!target) return;
                setBusy(true);
                try {
                  // Fetch all items for this cashbook
                  const items = await sanityClient.fetch(
                    `*[_type == "cashbookItem" && cashbook._ref == $ref]{ _id, product, quantity, unitPrice }`,
                    { ref: target._id },
                  );

                  // Optionally return stock for product-linked items
                  if (Array.isArray(items) && returnInventory) {
                    for (const it of items) {
                      const qty = Number(it?.quantity) || 0;
                      const unitRate = Number(it?.unitPrice) || 0;
                      const prodRef =
                        it?.product &&
                        ((it.product as any)?._ref || it.product);
                      if (prodRef && qty > 0) {
                        try {
                          await stockApi.createStockTransaction({
                            productId: String(prodRef),
                            type: "return",
                            quantity: qty,
                            unitPrice: unitRate,
                            notes: `Cashbook ${target._id} deleted - item returned`,
                            updateInventory: true,
                          });
                        } catch {}
                      }
                    }
                  }

                  // Delete all cashbook items in a transaction
                  if (Array.isArray(items) && items.length > 0) {
                    let tx = sanityClient.transaction();
                    for (const it of items) {
                      if (it?._id) tx = tx.delete(it._id);
                    }
                    await tx.commit();
                  }

                  // Finally delete the cashbook itself
                  await sanityClient.delete(target._id);
                  setBooks((prev) => prev.filter((b) => b._id !== target._id));
                  setDeleteOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
