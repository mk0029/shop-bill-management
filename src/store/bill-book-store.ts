import { create } from "zustand";
import { useAuthStore } from "@/store/auth-store";
import { persist } from "zustand/middleware";
import { queueBillMessage } from "@/lib/offline-queue";

export type BillMeta = {
  _id: string;
  billId: string;
  billNumber: string;
  createdAt: string;
  status: string;
  serviceType?: string;
  locationType?: string;
  subtotal?: number;
  paidAmount?: number;
  balanceAmount?: number;
  totalAmount?: number;
  customer?: { _id: string; name?: string } | { _ref: string };
};

export type BillSummary = {
  totalBills: number;
  totalPaid: number;
  totalOutstanding: number;
  latestBillDate: string | null;
};

export type BillMessage = {
  _id: string;
  bill: { _ref: string } | string;
  sender: { _ref: string } | string;
  recipient: { _ref: string } | string;
  content: string;
  attachments?: unknown[];
  status: "sent" | "delivered" | "seen";
  createdAt: string;
  updatedAt: string;
  isEncrypted: boolean;
  optimistic?: boolean;
  localId?: string;
};

interface BillBookState {
  isLoading: boolean;
  error: string | null;
  bills: BillMeta[];
  messagesByBillId: Record<string, BillMessage[]>;
  summary: BillSummary | null;

  fetchBillBook: (userId: string) => Promise<void>;
  fetchAllMessages: (userId: string) => Promise<void>;
  fetchBillMessages: (billId: string) => Promise<void>;
  sendMessage: (
    billId: string,
    payload: { content: string; attachments?: File[]; recipientId: string }
  ) => Promise<void>;
  subscribeRealtime: (userId: string) => void;
  addOrUpdateMessage: (billId: string, msg: BillMessage) => void;
}

export const useBillBookStore = create<BillBookState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      error: null,
      bills: [],
      messagesByBillId: {},
      summary: null,

      fetchBillBook: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const [listRes, summaryRes] = await Promise.all([
            fetch(`/api/bill-book/user/${encodeURIComponent(userId)}/list`).then((r) => r.json()),
            fetch(`/api/bill-book/user/${encodeURIComponent(userId)}/summary`).then((r) => r.json()),
          ]);
          if (!listRes?.success) throw new Error(listRes?.error || "Failed to load bill book");
          if (!summaryRes?.success) throw new Error(summaryRes?.error || "Failed to load summary");
          set({ bills: listRes.data || [], summary: summaryRes.data || null, isLoading: false });
        } catch (e: any) {
          set({ error: e?.message || "Failed to load bill book", isLoading: false });
        }
      },

      fetchAllMessages: async (userId: string) => {
        try {
          const res = await fetch(`/api/bill-book/user/${encodeURIComponent(userId)}/messages`).then((r) => r.json());
          if (!res?.success) throw new Error(res?.error || "Failed to load messages");
          const list: BillMessage[] = res.data || [];
          const grouped: Record<string, BillMessage[]> = {};
          for (const m of list) {
            const billRef = typeof m.bill === 'string' ? m.bill : (m.bill as any)?._ref;
            if (!billRef) continue;
            if (!grouped[billRef]) grouped[billRef] = [];
            grouped[billRef].push(m);
          }
          // sort each by createdAt
          Object.keys(grouped).forEach((k) => {
            grouped[k].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
          set((s) => ({ messagesByBillId: { ...s.messagesByBillId, ...grouped } }));
        } catch (e: any) {
          set({ error: e?.message || "Failed to load messages" });
        }
      },

      fetchBillMessages: async (billId: string) => {
        try {
          const res = await fetch(`/api/bill-book/bill/${encodeURIComponent(billId)}/messages`).then((r) => r.json());
          if (!res?.success) throw new Error(res?.error || "Failed to load messages");
          set((s) => ({ messagesByBillId: { ...s.messagesByBillId, [billId]: res.data || [] } }));
        } catch (e: any) {
          set({ error: e?.message || "Failed to load messages" });
        }
      },

      sendMessage: async (billId, payload) => {
        const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const optimistic: BillMessage = {
          _id: localId,
          bill: billId,
          sender: "self",
          recipient: payload.recipientId,
          content: payload.content,
          attachments: [],
          status: "sent",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isEncrypted: false,
          optimistic: true,
          localId,
        };
        get().addOrUpdateMessage(billId, optimistic);

        try {
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            await queueBillMessage({ billId, content: payload.content, recipientId: payload.recipientId });
            return;
          }
          const senderId = (() => {
            try {
              const s = useAuthStore.getState();
              return (s?.user as any)?.id || (s?.user as any)?._id || undefined;
            } catch { return undefined; }
          })();
          const res = await fetch(`/api/bill-book/bill/${encodeURIComponent(billId)}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: payload.content, recipientId: payload.recipientId, senderId }),
          }).then((r) => r.json());
          if (!res?.success) throw new Error(res?.error || "Failed to send message");
          const saved: BillMessage = res.data;
          // replace optimistic with saved
          set((s) => {
            const list = s.messagesByBillId[billId] || [];
            // Remove any optimistic with same localId, and any duplicate saved with same _id
            const filtered = list.filter(
              (m) => !("localId" in m && m.localId === optimistic.localId) && m._id !== saved._id
            );
            const next = [...filtered, saved];
            return { messagesByBillId: { ...s.messagesByBillId, [billId]: next } };
          });
        } catch (e: any) {
          try {
            await queueBillMessage({ billId, content: payload.content, recipientId: payload.recipientId });
          } catch {}
          set({ error: e?.message || "Failed to send message" });
        }
      },

      addOrUpdateMessage: (billId, msg) => {
        set((s) => {
          const list = s.messagesByBillId[billId] || [];
          const idx = list.findIndex((m) => m._id === msg._id || ("localId" in m && "localId" in msg && m.localId === msg.localId));
          const next = [...list];
          if (idx >= 0) next[idx] = msg; else next.push(msg);
          // keep sorted by createdAt
          next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return { messagesByBillId: { ...s.messagesByBillId, [billId]: next } };
        });
      },

      subscribeRealtime: (userId: string) => {
        // Reuse global sanity realtime through data-store; this is a placeholder for local listeners if needed later
        // No-op here because data-store will push billMessage updates via handleRealtimeUpdate extension.
        void userId;
      },
    }),
    {
      name: "bill-book-storage",
      partialize: (s) => ({
        // persist messages and last summary for quick UX
        messagesByBillId: s.messagesByBillId,
        summary: s.summary,
      }),
    }
  )
);
