"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { sanityClient } from "@/lib/sanity";
import { stockApi } from "@/lib/inventory-api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, MoreVertical, Pencil, Trash2, Search, ExternalLink, Clock } from "lucide-react";
import { getAdminCustomerDisplayName } from "@/lib/customer-utils";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [target, setTarget] = useState<Book | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [returnInventory, setReturnInventory] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

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
          return next.sort((a, b) => {
            const at = new Date(a.updatedAt || a._updatedAt || 0).getTime();
            const bt = new Date(b.updatedAt || b._updatedAt || 0).getTime();
            return bt - at;
          });
        });
      });
    return () => sub.unsubscribe();
  }, []);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const q = searchQuery.toLowerCase();
    return books.filter(
      (b) =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.customer?.name || "").toLowerCase().includes(q) ||
        (b.customer?.phone || "").includes(q),
    );
  }, [books, searchQuery]);

  const content = useMemo(() => {
    if (!filteredBooks || filteredBooks.length === 0) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
          <Wallet className="w-12 h-12 text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No cashbooks found</p>
        </div>
      );
    }
    return filteredBooks.map((b) => {
      const linkId = b._id?.startsWith("drafts.") ? b._id.slice(7) : b._id;
      return (
        <div key={b._id} className="group relative rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] transition-all duration-200">
          <Link href={`/admin/cashbooks/${linkId}`} className="block p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold text-sm truncate">{b.name || getAdminCustomerDisplayName(b.customer || {}) || "Cashbook"}</h3>
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    b.status === "open" ? "bg-emerald-900/30 text-emerald-300" : "bg-gray-700/50 text-gray-400"
                  }`}>{b.status || "open"}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {getAdminCustomerDisplayName(b.customer || {}) || "Unknown"}{b.customer?.phone ? ` • ${b.customer.phone}` : ""}
                </p>
                {b.notes && <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{b.notes}</p>}
                <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-600">
                  <Clock className="w-3 h-3" />
                  Updated {new Date(b.updatedAt || b._updatedAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === b._id ? null : b._id); }}
            className="absolute top-3 right-3 p-1 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpenId === b._id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
              <div className="absolute right-2 top-10 z-50 w-40 bg-gray-900 border border-white/[0.08] rounded-lg shadow-xl backdrop-blur-2xl overflow-hidden">
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-white/[0.06] transition-colors"
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    setTarget(b); setEditName(b.name || ""); setEditNotes(b.notes || ""); setEditOpen(true); setMenuOpenId(null);
                  }}
                ><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 transition-colors"
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    setTarget(b); setDeleteOpen(true); setMenuOpenId(null);
                  }}
                ><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </div>
            </>
          )}
        </div>
      );
    });
  }, [filteredBooks]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cashbooks..."
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] pl-9 pr-3 py-2 text-sm text-slate-100 outline-none backdrop-blur-xl placeholder:text-slate-500 focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-300/20 transition-all"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {content}
      </div>

      {/* Edit modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Cashbook">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Cashbook name" className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} placeholder="Notes or title" className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!target) return; setBusy(true);
              try { await sanityClient.patch(target._id).set({ name: editName, notes: editNotes, updatedAt: new Date().toISOString() }).commit(); setEditOpen(false); }
              finally { setBusy(false); }
            }} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Cashbook">
        <div className="space-y-4">
          <p className="text-sm text-gray-300">Are you sure you want to delete this cashbook?</p>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={returnInventory} onChange={(e) => setReturnInventory(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800" />
            Return product-linked items to inventory before delete
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-500" onClick={async () => {
              if (!target) return; setBusy(true);
              try {
                const items = await sanityClient.fetch(`*[_type == "cashbookItem" && cashbook._ref == $ref]{ _id, product, quantity, unitPrice }`, { ref: target._id });
                if (Array.isArray(items) && returnInventory) {
                  for (const it of items) {
                    const qty = Number(it?.quantity) || 0;
                    const unitRate = Number(it?.unitPrice) || 0;
                    const prodRef = it?.product && ((it.product as any)?._ref || it.product);
                    if (prodRef && qty > 0) {
                      try { await stockApi.createStockTransaction({ productId: String(prodRef), type: "return", quantity: qty, unitPrice: unitRate, notes: `Cashbook ${target._id} deleted`, updateInventory: true }); } catch {}
                    }
                  }
                }
                if (Array.isArray(items) && items.length > 0) {
                  let tx = sanityClient.transaction();
                  for (const it of items) { if (it?._id) tx = tx.delete(it._id); }
                  await tx.commit();
                }
                await sanityClient.delete(target._id);
                setBooks((prev) => prev.filter((b) => b._id !== target._id));
                setDeleteOpen(false);
              } finally { setBusy(false); }
            }} disabled={busy}>{busy ? "Deleting..." : "Delete"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
