"use client";

import { useEffect } from "react";
import { useSanityRealtimeStore } from "@/store/sanity-realtime-store";
import { useNotificationStore } from "@/store/notification-store";

export default function NotificationsBridge() {
  const { on, connect } = useSanityRealtimeStore();
  const { add } = useNotificationStore();

  useEffect(() => {
    connect();

    // Bill created
    on("bill:created", (bill: any) => {
      try {
        if (typeof window !== "undefined") {
          const key = "recentCreatedBillIds";
          const raw = window.sessionStorage.getItem(key);
          if (raw) {
            const list: { id: string; t: number }[] = JSON.parse(raw);
            const now = Date.now();
            const fresh = list.filter((x) => now - x.t < 60_000);
            // Save pruned list back to avoid growth
            window.sessionStorage.setItem(key, JSON.stringify(fresh));
            const justCreatedHere = fresh.some((x) => x.id === String(bill?._id));
            if (justCreatedHere) return; // suppress self toast
          }
        }
      } catch {}
      add({
        type: "billing",
        title: `New bill #${bill?.billNumber ?? ""}`.trim(),
        body: `${bill?.customer?.name ?? "Customer"} • ₹${(bill?.totalAmount ?? 0).toLocaleString()}`,
        meta: { billId: bill?._id },
      });
    });

    // Bill updated (e.g., payment status)
    on("bill:updated", ({ billId, updates }: any) => {
      // Suppress if this tab recently updated this bill
      try {
        if (typeof window !== "undefined") {
          const key = "recentUpdatedBillIds";
          const raw = window.sessionStorage.getItem(key);
          if (raw) {
            const list: { id: string; t: number }[] = JSON.parse(raw);
            const now = Date.now();
            const fresh = list.filter((x) => now - x.t < 60_000);
            window.sessionStorage.setItem(key, JSON.stringify(fresh));
            const justUpdatedHere = fresh.some((x) => x.id === String(billId));
            if (justUpdatedHere) return; // suppress self toast
          }
        }
      } catch {}

      const status = updates?.paymentStatus || updates?.status;
      add({
        type: "billing",
        title: `Bill updated ${updates?.billNumber ? `#${updates.billNumber}` : ""}`.trim(),
        body: status ? `Status: ${status}` : `Bill ${billId} updated`,
        meta: { billId },
      });
    });

    // Inventory low stock
    on("inventory:low_stock", (p: any) => {
      add({
        type: "inventory",
        title: `Low stock: ${p?.productName ?? p?.productId}`,
        body: `Current: ${p?.currentStock} • Minimum: ${p?.minimumStock}`,
        meta: { productId: p?.productId },
      });
    });

    // Payment created
    on("payment:created", (payment: any) => {
      add({
        type: "payment",
        title: `Payment received`,
        body: `₹${(payment?.amount ?? payment?.totalAmount ?? 0).toLocaleString()} for bill ${payment?.billNumber ?? ""}`.trim(),
        meta: { paymentId: payment?._id },
      });
    });
  }, [on, add, connect]);

  return null;
}
