"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import * as toolRentalApi from "@/lib/tool-rental-api";
import type { ToolRental } from "@/lib/tool-rental-service";
import { formatDayDateTime } from "@/lib/date-time";
import EmptyState from "@/components/ui/empty-state";
import { PackageSearch } from "lucide-react";

function formatINR(value: number) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(iso?: string) {
  if (!iso) return "-";
  return formatDayDateTime(iso);
}

function getRemainingText(r: ToolRental) {
  if (r.rentalStatus === "returned") return "Returned";
  const now = Date.now();
  const exp = new Date(r.expectedReturnTime).getTime();
  const diff = exp - now;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / (60 * 60 * 1000));
  const m = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
  return diff >= 0 ? `${h}h ${m}m left` : `${h}h ${m}m overdue`;
}

export default function CustomerRentedItemsClient() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [rentals, setRentals] = useState<ToolRental[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const all = await toolRentalApi.getToolRentals();
      const matchIds = new Set([
        String((user as any)?.id || ""),
        String((user as any)?._id || ""),
        String((user as any)?.customerId || ""),
      ].filter(Boolean));

      const mine = (all || []).filter((r) => {
        const cid = String(r.customerId || "");
        const cref = String(r.customerRefId || "");
        return matchIds.has(cid) || matchIds.has(cref);
      });
      setRentals(mine);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [user]);

  const sorted = useMemo(() => {
    return [...rentals].sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());
  }, [rentals]);

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Rented Items</h1>
        <p className="text-sm text-gray-400 mt-1">See all your rented tools, payment status, and return details</p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-gray-400 backdrop-blur-xl">Loading rented items...</div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          eyebrow="Tool rental desk"
          title="No rented tools right now"
          description="When the shop assigns rented tools to your account, you will see return time, payment status, rent amount, and complete history here."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => {
            const statusClass =
              r.rentalStatus === "active"
                ? "bg-green-900/40 text-green-300"
                : r.rentalStatus === "overdue"
                  ? "bg-red-900/40 text-red-300"
                  : r.rentalStatus === "returned"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-gray-800 text-gray-300";

            const total = Number(r.currentTotalAmount || r.totalAmount || 0);
            return (
              <div key={r._id} className="rounded-xl border border-gray-800 bg-gray-900/58 p-4 space-y-2 backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusClass}`}>{r.rentalStatus}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/40 text-blue-300">{r.paymentStatus}</span>
                  <span className="text-xs text-gray-400">{getRemainingText(r)}</span>
                </div>

                <p className="text-white font-medium">{r.toolName} [{r.toolCode}]</p>
                <p className="text-sm text-gray-300">Duration: {r.durationValue} {r.durationType}</p>
                <p className="text-xs text-gray-400">Start: {formatDateTime(r.rentStartTime)}</p>
                <p className="text-xs text-gray-400">Expected Return: {formatDateTime(r.expectedReturnTime)}</p>
                <p className="text-xs text-gray-400">Actual Return: {formatDateTime(r.actualReturnTime)}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="rounded border border-gray-800 bg-gray-950/60 p-2">
                    <p className="text-[11px] text-gray-400">Rent</p>
                    <p className="text-sm text-white">{formatINR(r.rentAmount)}</p>
                  </div>
                  <div className="rounded border border-gray-800 bg-gray-950/60 p-2">
                    <p className="text-[11px] text-gray-400">Extra</p>
                    <p className="text-sm text-white">{formatINR(r.extraChargeAmount || 0)}</p>
                  </div>
                  <div className="rounded border border-gray-800 bg-gray-950/60 p-2">
                    <p className="text-[11px] text-gray-400">Total</p>
                    <p className="text-sm text-white">{formatINR(total)}</p>
                  </div>
                  <div className="rounded border border-gray-800 bg-gray-950/60 p-2">
                    <p className="text-[11px] text-gray-400">Paid</p>
                    <p className="text-sm text-white">{formatINR(r.paidAmount || 0)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
