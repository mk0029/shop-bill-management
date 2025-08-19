"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Search, Trash2 } from "lucide-react";
import { localDraftService, type LocalDraftSummary, type LocalBillDraft } from "@/lib/local-draft-service";
import { useCustomers } from "@/hooks/use-sanity-data";

export default function DraftBillsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<LocalDraftSummary[]>([]);
  const { getUserById } = useCustomers();
  const [details, setDetails] = useState<Record<string, {
    billerName: string;
    phone?: string;
    serviceType: string;
    itemCount: number;
    total: number;
    billDate?: string;
  }>>({});

  // Prefetch create route to reduce navigation latency
  useEffect(() => {
    router.prefetch?.("/admin/billing/create");
  }, [router]);

  // Load local drafts on mount and when storage changes
  const loadDrafts = useCallback(() => {
    setDrafts(localDraftService.list());
  }, []);

  useEffect(() => {
    loadDrafts();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("billing:drafts:v1")) loadDrafts();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadDrafts]);

  // Compute per-draft details (biller name, totals) whenever drafts or customers change
  useEffect(() => {
    const map: Record<string, {
      billerName: string;
      phone?: string;
      serviceType: string;
      itemCount: number;
      total: number;
      billDate?: string;
    }> = {};
    for (const s of drafts) {
      const d = localDraftService.get(s.id);
      if (!d) continue;
      const fd = d.formData || {};
      const cust = fd.customerId ? getUserById?.(fd.customerId) : undefined;
      const billerName = cust?.name || "Unknown";
      const phone = cust?.phone;
      const serviceType = (fd.serviceType as string) || "sale";
      const itemCount = (d.selectedItems || []).length;
      const itemsTotal = (d.selectedItems || []).reduce((sum, it) => sum + (Number(it.total) || 0), 0);
      const fees = Number(fd.repairFee || 0) + Number(fd.homeVisitFee || 0) + Number(fd.laborCharges || 0);
      const total = itemsTotal + fees;
      const billDate = fd.billDate as string | undefined;
      map[s.id] = { billerName, phone, serviceType, itemCount, total, billDate };
    }
    setDetails(map);
  }, [drafts, getUserById]);

  const fmtCurrency = useCallback((n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0), []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter((d) => {
      const det = details[d.id];
      return (
        d.title.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        (det?.billerName?.toLowerCase?.().includes(q)) ||
        (det?.serviceType?.toLowerCase?.().includes(q)) ||
        (det?.phone?.toLowerCase?.().includes(q))
      );
    });
  }, [drafts, details, searchTerm]);

  const handleDeleteDraft = useCallback((id: string) => {
    const ok = window.confirm("Delete this draft permanently from this browser?");
    if (!ok) return;
    try {
      setDeletingId(id);
      localDraftService.remove(id);
      loadDrafts();
    } finally {
      setDeletingId(null);
    }
  }, [loadDrafts]);

  const handleOpenDraft = useCallback((id: string) => {
    const draft = localDraftService.get(id) as LocalBillDraft | null;
    if (!draft) return;
    try {
      setNavigatingId(id);
      const payload = {
        formData: draft.formData,
        selectedItems: draft.selectedItems,
        draftId: draft.id,
        updatedAt: Date.now(),
        fromDraft: true,
      };
      localStorage.setItem("bill_create_autosave", JSON.stringify(payload));
      startTransition(() => router.push("/admin/billing/create"));
    } catch (e) {
      console.error("Failed to open draft", e);
      alert("Failed to open draft");
      setNavigatingId(null);
    }
  }, [router, startTransition]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="h-6 w-6 sm:w-8 sm:h-8 text-blue-400" />
            Draft Bills
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">Manage and complete your saved draft bills</p>
        </div>
        <Button onClick={() => { try { localStorage.setItem("bill_create_skip_restore", "1"); } catch {} ; router.push("/admin/billing/create"); }}>
          Create New Bill
        </Button>
      </div>

      <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search drafts by customer name or bill number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
        </div>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <div className="p-4 md:p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Local Drafts
          </h2>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-800">
            {filtered.length === 0 ? (
              <p className="text-gray-400 text-sm">No local drafts found.</p>
            ) : (
              filtered.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{d.title}</p>
                    <p className="text-gray-300 text-sm truncate">
                      {details[d.id]?.billerName || "Unknown"} • {details[d.id]?.serviceType || "sale"} • {details[d.id]?.itemCount ?? 0} items • {fmtCurrency(details[d.id]?.total ?? 0)}
                    </p>
                    <p className="text-gray-500 text-xs truncate">
                      {details[d.id]?.phone ? `${details[d.id]?.phone} • ` : ""}
                      {details[d.id]?.billDate ? `Bill Date: ${details[d.id]?.billDate} • ` : ""}
                      Updated: {new Date(d.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => handleOpenDraft(d.id)}>Open</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteDraft(d.id)} disabled={deletingId === d.id}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          {deletingId && (
            <p className="text-sm text-gray-400 mt-3">Deleting draft...</p>
          )}
        </div>
      </Card>

      {(navigatingId || isPending) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-gray-900 border border-gray-800">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-white text-sm">Opening draft...</p>
          </div>
        </div>
      )}
    </div>
  );
}
