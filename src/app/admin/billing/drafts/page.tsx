"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RealtimeBillList } from "@/components/realtime/realtime-bill-list";
import { useBills } from "@/hooks/use-sanity-data";
import { billApiService } from "@/lib/sanity-api-service";
import { FileText, Search, Trash2, CheckCircle2 } from "lucide-react";

export default function DraftBillsPage() {
  const router = useRouter();
  const { bills } = useBills();
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Prefetch create route to reduce navigation latency
  useEffect(() => {
    router.prefetch?.("/admin/billing/create");
  }, [router]);

  const draftBills = useMemo(() => {
    return bills.filter((b: any) => (b.status || "").toLowerCase() === "draft");
  }, [bills]);

  const handleDeleteBill = useCallback(async (bill: any) => {
    if (!bill?._id) return;
    const ok = window.confirm("Delete this draft bill permanently?");
    if (!ok) return;
    try {
      setDeletingId(bill._id);
      const res = await billApiService.deleteBill(bill._id);
      if (!res.success) {
        alert(res.error || "Failed to delete draft");
      }
      // Realtime store should update automatically; no manual state needed
    } catch (e) {
      console.error("Failed to delete draft bill", e);
      alert("Failed to delete draft bill");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleCompleteDraft = useCallback(
    async (bill: any) => {
      if (!bill) return;

      try {
        setNavigatingId(bill._id);

        // Map bill -> useBillForm local autosave payload (lightweight and sync)
        const mappedItems = (bill.items || []).map((item: any) => {
          const isCustom = !!item.isCustom;
          const isRewinding = !!item.isRewinding;
          const productId = !isCustom && !isRewinding
            ? item.product?._id || item.product?._ref || item.productId || ""
            : undefined;
          const price = Number(item.unitPrice || 0);
          const qty = Number(item.quantity || 1);
          return {
            id: productId || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: item.productName || item.name || "Item",
            price,
            quantity: qty,
            total: price * qty,
            category: item.category || "",
            brand: item.brand || "",
            specifications: item.specifications || "",
            unit: item.unit || "pcs",
            itemType: isCustom ? "custom" : isRewinding ? "rewinding" : "standard",
          } as const;
        });

        const formData = {
          customerId: bill.customer?._id || bill.customer?._ref || "",
          serviceType: bill.serviceType || "sale",
          location: bill.locationType || "shop",
          billDate: bill.serviceDate
            ? new Date(bill.serviceDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          dueDate: "",
          notes: bill.notes || "",
          repairFee: Number(bill.repairFee || bill.repairCharges || 0),
          homeVisitFee: Number(bill.homeVisitFee || 0),
          laborCharges: Number(bill.laborCharges || 0),
          isMarkAsPaid: false,
          enablePartialPayment: false,
          partialPaymentAmount: 0,
        };

        const payload = {
          formData,
          selectedItems: mappedItems,
          draftId: bill._id,
          updatedAt: Date.now(),
        };

        if (typeof window !== "undefined") {
          // write payload first to ensure target page can restore immediately
          localStorage.setItem("bill_create_autosave", JSON.stringify(payload));
        }

        // Navigate immediately without blocking UI
        startTransition(() => {
          router.push("/admin/billing/create");
        });
      } catch (e) {
        console.error("Failed to prepare draft for completion", e);
        alert("Failed to open draft in editor");
        setNavigatingId(null);
      }
    },
    [router, startTransition]
  );

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
        <Button onClick={() => router.push("/admin/billing/create")}>
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
            Draft Bills
          </h2>
          <div className="max-h-[600px] overflow-y-auto">
            <RealtimeBillList
              initialBills={draftBills}
              searchTerm={searchTerm}
              filterStatus="draft"
              onDeleteBill={handleDeleteBill}
              onCompleteDraft={handleCompleteDraft}
              showNewBillAnimation={false}
            />
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
