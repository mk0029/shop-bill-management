"use client";

import { useEffect } from "react";
import { useSanityRealtimeStore } from "../../store/sanity-realtime-store";
import { useNotificationStore } from "../../store/notification-store";
import { useAuthStore } from "../../store/auth-store";

export default function NotificationsBridge() {
  const { on, connect, disconnect } = useSanityRealtimeStore();
  const { add } = useNotificationStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Only connect for admins - customers don't need these notifications
    const auth = useAuthStore.getState();
    if (auth.role !== "admin") {
      return;
    }

    connect();

    // Helper function to check if user should receive notification
    const shouldNotifyUser = (targetCustomerId?: string) => {
      const auth = useAuthStore.getState();
      const user = auth.user as {
        id?: string;
        _id?: string;
        role?: string;
      } | null;
      const userId = user?._id || user?.id;
      const userRole = user?.role;

      // Admins get all notifications
      if (userRole === "admin") return true;

      // Customers only get notifications for their own data
      if (userRole === "customer") {
        return targetCustomerId && userId && targetCustomerId === userId;
      }

      return false;
    };

    // Bill created
    on(
      "bill:created",
      (bill: {
        _id?: string;
        billNumber?: string;
        customer?: { _id?: string; name?: string };
        totalAmount?: number;
      }) => {
        const customerId = bill?.customer?._id;
        if (!shouldNotifyUser(customerId)) return;

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
              const justCreatedHere = fresh.some(
                (x) => x.id === String(bill?._id),
              );
              if (justCreatedHere) return; // suppress self toast
            }
          }
        } catch {}
        add({
          type: "billing",
          title: `New bill #${bill?.billNumber ?? ""}`.trim(),
          body: `${bill?.customer?.name ?? "Customer"} • ₹${(bill?.totalAmount ?? 0).toLocaleString()}`,
          meta: { billId: bill?._id, userId: customerId },
        });
      },
    );

    // Bill updated (e.g., payment status)
    on(
      "bill:updated",
      ({
        billId,
        updates,
        customerId,
      }: {
        billId: string;
        updates?: {
          paymentStatus?: string;
          status?: string;
          billNumber?: string;
        };
        customerId?: string;
      }) => {
        if (!shouldNotifyUser(customerId)) return;

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
              const justUpdatedHere = fresh.some(
                (x) => x.id === String(billId),
              );
              if (justUpdatedHere) return; // suppress self toast
            }
          }
        } catch {}

        const status = updates?.paymentStatus || updates?.status;
        add({
          type: "billing",
          title:
            `Bill updated ${updates?.billNumber ? `#${updates.billNumber}` : ""}`.trim(),
          body: status ? `Status: ${status}` : `Bill ${billId} updated`,
          meta: { billId, userId: customerId },
        });
      },
    );

    // Inventory low stock (admin only)
    on(
      "inventory:low_stock",
      (p: {
        productName?: string;
        productId?: string;
        currentStock?: number;
        minimumStock?: number;
      }) => {
        if (!shouldNotifyUser()) return; // Only admins should get inventory notifications

        // De-duplicate rapid/repeat low-stock toasts for the same product + stock level
        try {
          if (typeof window !== "undefined") {
            const key = "recentLowStockEvents";
            const raw = window.sessionStorage.getItem(key);
            const now = Date.now();
            type Entry = { id: string; stock: number; t: number };
            const list: Entry[] = raw ? JSON.parse(raw) : [];
            const fresh = list.filter((x) => now - x.t < 10 * 60_000); // keep last 10 minutes
            const id = String(p?.productId ?? "");
            const stock = Number(p?.currentStock ?? NaN);
            const existing = fresh.find((x) => x.id === id);
            // Suppress if we've already notified for the same stock level recently
            if (
              existing &&
              Number.isFinite(stock) &&
              existing.stock === stock
            ) {
              window.sessionStorage.setItem(key, JSON.stringify(fresh));
              return;
            }
            // Update tracker: notify only when stock decreases further or no entry exists
            if (Number.isFinite(stock)) {
              const updated = [
                ...fresh.filter((x) => x.id !== id),
                { id, stock, t: now },
              ];
              window.sessionStorage.setItem(key, JSON.stringify(updated));
            } else {
              window.sessionStorage.setItem(key, JSON.stringify(fresh));
            }
          }
        } catch {}

        add({
          type: "inventory",
          title: `Low stock: ${p?.productName ?? p?.productId}`,
          body: `Current: ${p?.currentStock} • Minimum: ${p?.minimumStock}`,
          meta: { productId: p?.productId },
        });
      },
    );

    // Payment created
    on(
      "payment:created",
      (payment: {
        _id?: string;
        amount?: number;
        totalAmount?: number;
        billNumber?: string;
        customerId?: string;
      }) => {
        const customerId = payment?.customerId;
        if (!shouldNotifyUser(customerId)) return;

        add({
          type: "payment",
          title: `Payment received`,
          body: `₹${(payment?.amount ?? payment?.totalAmount ?? 0).toLocaleString()} for bill ${payment?.billNumber ?? ""}`.trim(),
          meta: { paymentId: payment?._id, userId: customerId },
        });
      },
    );
    // Customer Registration Request created (admin only)
    on(
      "customerRequest:created",
      (req: { _id?: string; name?: string; email?: string; phone?: string; requestId?: string }) => {
        if (!shouldNotifyUser()) return;
        add({
          type: "system",
          title: "New Customer Registration Request",
          body: `${req.name ?? "A customer"} has submitted a new registration request.`,
          meta: {
            eventType: "customer.request.created",
            userId: undefined,
            requestId: req.requestId || req._id,
            route: { pathname: "/admin/customers", query: { openRequests: "true" } },
          },
        });
      },
    );

    // Customer Registration Request updated (e.g., approved/rejected — remove in-app notification)
    on(
      "customerRequest:updated",
      (ev: { _id?: string; status?: string; id?: string }) => {
        const id = ev?._id || ev?.id;
        if (!id) return;
        const status = ev?.status;
        if (status && status !== "pending") {
          const removeWhere = useNotificationStore.getState().removeWhere;
          removeWhere((n) => {
            const meta = n.meta || {};
            return String(meta.requestId) === id;
          });
        }
      },
    );

    // Customer Registration Request deleted (remove in-app notifications)
    on(
      "customerRequest:deleted",
      (ev: { id?: string }) => {
        const id = ev?.id;
        if (!id) return;
        const removeWhere = useNotificationStore.getState().removeWhere;
        removeWhere((n) => {
          const meta = n.meta || {};
          return String(meta.requestId) === id;
        });
      },
    );

    return () => {
      disconnect();
    };
  }, [on, add, connect, disconnect, isAuthenticated]);

  return null;
}
