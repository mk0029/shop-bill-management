import { create } from "zustand";
import { sanityClient, queries } from "@/lib/sanity";
import { useSanityRealtimeStore } from "./sanity-realtime-store";

export interface BillItem {
  product: string;
  productName: string;
  category?: string;
  brand?: string;
  specifications?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

export interface Bill {
  _id?: string;
  billId: string;
  billNumber: string;
  customer: string;
  customerAddress: string;
  serviceType: string;
  locationType: string;
  items: BillItem[];
  serviceDate: string;
  completionDate?: string;
  technician?: string;
  homeVisitFee: number;
  // Primary field in DB
  repairFee: number;
  // Optional legacy alias for older documents
  repairCharges?: number;
  transportationFee: number;
  laborCharges: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  paidAmount: number;
  balanceAmount: number;
  paymentDate?: string;
  notes?: string;
  internalNotes?: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

interface BillState {
  bills: Bill[];
  loading: boolean;
  error: string | null;

  // Sanity-based actions
  fetchBills: (customerId?: string) => Promise<void>;
  fetchBillsByCustomer: (customerId: string) => Promise<Bill[]>;
  createBill: (
    billData: Omit<Bill, "_id" | "createdAt" | "updatedAt">
  ) => Promise<Bill | null>;
  updateBill: (billId: string, updates: Partial<Bill>) => Promise<boolean>;
  deleteBill: (billId: string) => Promise<boolean>;

  // Local state management
  setBills: (bills: Bill[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addBill: (bill: Bill) => void;

  // Real-time actions
  initializeRealtime: () => void;
  cleanupRealtime: () => void;
}

export const useSanityBillStore = create<BillState>((set, get) => ({
  bills: [],
  loading: false,
  error: null,

  // Fetch all bills or bills for a specific customer
  fetchBills: async (customerId?: string) => {
    set({ loading: true, error: null });

    try {
      let bills;
      if (customerId) {
        bills = await sanityClient.fetch(queries.customerBills(customerId));
      } else {
        bills = await sanityClient.fetch(queries.bills);
      }
      set({ bills: bills || [], loading: false });
    } catch (error) {
      console.error("❌ Error fetching bills:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to fetch bills",
        loading: false,
      });
    }
  },

  // Fetch bills for a specific customer (via server API to include drafts)
  fetchBillsByCustomer: async (customerId: string) => {
    set({ loading: true, error: null });

    try {
      let bills: Bill[] = [];

      // Try by _id first, then by customerId
      const attempts: Array<{ by: "_id" | "customerId"; id: string }> = [
        { by: "_id", id: customerId },
        { by: "customerId", id: customerId },
      ];

      for (const attempt of attempts) {
        const res = await fetch(`/api/bills/by-customer/${encodeURIComponent(attempt.id)}?by=${attempt.by}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.bills) && data.bills.length > 0) {
            bills = data.bills as Bill[];
            break;
          }
        }
      }

      // Final fallback: client-side query + filter (published only)
      if (bills.length === 0) {
        try {
          const query = queries.customerBills(customerId);
          const published = await sanityClient.fetch(query);
          if (Array.isArray(published)) bills = published;
        } catch {
          // ignore
        }
      }

      set({ bills: bills || [], loading: false });
      return bills || [];
    } catch (error) {
      console.error("❌ Error fetching customer bills:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to fetch customer bills",
        loading: false,
      });
      return [];
    }
  },

  // Create a new bill in Sanity
  createBill: async (billData) => {
    set({ loading: true, error: null });

    try {
      const newBill = {
        _type: "bill",
        ...billData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await sanityClient.create(newBill);
      // The real-time listener will automatically update the local state
      set({ loading: false });
      return result as Bill;
    } catch (error) {
      console.error("❌ Error creating bill:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to create bill",
        loading: false,
      });
      return null;
    }
  },

  // Update a bill in Sanity
  updateBill: async (billId, updates) => {
    try {
      // Fetch previous bill snapshot for change detection and targeting
      let prev: Partial<Bill> & { _id?: string; billNumber?: string; customer?: any } | null = null;
      try {
        prev = await sanityClient.fetch(
          `*[_type == "bill" && _id == $id][0]{
            _id,
            billNumber,
            paymentStatus,
            status,
            customer->{ _id }
          }`,
          { id: billId }
        );
      } catch {}

      const result = await sanityClient
        .patch(billId)
        .set({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .commit();
      // The real-time listener will automatically update the local state
      try {
        if (typeof window !== 'undefined') {
          // Mark recent update to suppress self-toasts if needed
          try {
            const key = 'recentUpdatedBillIds';
            const arr = JSON.parse(window.sessionStorage.getItem(key) || '[]');
            const next = [{ id: String((result as any)?._id ?? billId), t: Date.now() }, ...arr].slice(0, 20);
            window.sessionStorage.setItem(key, JSON.stringify(next));
          } catch {}

          // Determine customer id
          const customerId: string | null = (result as any)?.customer?._ref || prev?.customer?._id || null;

          // Notify customer: paymentStatus change
          const prevStatus = (prev as any)?.paymentStatus;
          const nextStatus = (result as any)?.paymentStatus ?? (updates as any)?.paymentStatus;
          if (customerId && prevStatus !== nextStatus) {
            fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: 'Bill updated',
                body: `Status: ${String(nextStatus ?? 'updated')}`,
                userIds: [customerId],
                data: { billId: String((result as any)?._id ?? billId) },
                sound: 'default',
              }),
            }).catch(() => {});
          }

          // Always notify customer generically
          if (customerId) {
            const billNo: string = (result as any)?.billNumber ?? prev?.billNumber ?? '';
            fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: 'Bill updated',
                body: billNo ? `Bill ${billNo} was updated` : 'Your bill was updated',
                userIds: [customerId],
                data: { billId: String((result as any)?._id ?? billId), event: 'bill-updated' },
                sound: 'default',
              }),
            }).catch(() => {});
          }

          // Admin-wide notification excluding actor
          try {
            const actorId = (function getActorId(){
              try {
                const remember = window.localStorage.getItem('auth-remember') === 'true';
                const raw = remember
                  ? window.localStorage.getItem('auth-storage') ?? window.sessionStorage.getItem('auth-storage')
                  : window.sessionStorage.getItem('auth-storage') ?? window.localStorage.getItem('auth-storage');
                if (!raw) return null as string | null;
                const parsed: any = JSON.parse(raw);
                const user = parsed?.state?.user;
                return (user?.id as string) || (user?._id as string) || null;
              } catch { return null as string | null; }
            })();

            const billNo: string = (result as any)?.billNumber ?? prev?.billNumber ?? '';
            const changeSummary = (() => {
              const parts: string[] = [];
              const keysToCheck = ['status', 'paymentStatus'];
              for (const k of keysToCheck) {
                const before = (prev as any)?.[k];
                const after = (result as any)?.[k] ?? (updates as any)?.[k];
                if (after != null && before !== after) parts.push(`${k}: ${before ?? 'n/a'} → ${after}`);
              }
              return parts.length ? parts.join(', ') : 'Details updated';
            })();

            fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audience: 'admins',
                title: 'Bill updated',
                body: billNo ? `Bill ${billNo} • ${changeSummary}` : changeSummary,
                data: { billId: String((result as any)?._id ?? billId), event: 'bill-updated' },
                excludeUserIds: actorId ? [actorId] : undefined,
                // Exclude current device
                excludeTokens: await (async () => {
                  try {
                    if (typeof window === 'undefined') return undefined
                    const mod = await import('@/lib/fcm-client')
                    if (typeof mod.getTokenWithoutRegister === 'function') {
                      const t = await mod.getTokenWithoutRegister()
                      return t ? [t] : undefined
                    }
                  } catch {}
                  return undefined
                })(),
              }),
            }).catch(() => {});
          } catch {}
        }
      } catch {}

      return true;
    } catch (error) {
      console.error("❌ Error updating bill:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to update bill",
      });
      return false;
    }
  },

  // Delete a bill in Sanity
  deleteBill: async (billId) => {
    try {
      await sanityClient.delete(billId);
      // The real-time listener will automatically update the local state
      return true;
    } catch (error) {
      console.error("❌ Error deleting bill:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to delete bill",
      });
      return false;
    }
  },

  // Local state management
  setBills: (bills) => set({ bills }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Add bill to local state (for realtime updates)
  addBill: (bill) => {
    set((state) => ({
      bills: [bill, ...state.bills.filter((b) => b._id !== bill._id)],
    }));
  },

  // Initialize real-time listeners
  initializeRealtime: () => {
    const { on } = useSanityRealtimeStore.getState();

    // Listen for real-time bill events from Sanity
    on("bill:created", (bill: Bill) => {
      set((state) => ({
        bills: [bill, ...state.bills.filter((b) => b._id !== bill._id)],
      }));
    });

    on(
      "bill:updated",
      ({ billId, updates }: { billId: string; updates: Partial<Bill> }) => {
        set((state) => ({
          bills: state.bills.map((bill) =>
            bill._id === billId ? { ...bill, ...updates } : bill
          ),
        }));
      }
    );

    on("bill:deleted", ({ billId }: { billId: string }) => {
      set((state) => ({
        bills: state.bills.filter((bill) => bill._id !== billId),
      }));
    });
  },

  // Cleanup real-time listeners
  cleanupRealtime: () => {
    const { off } = useSanityRealtimeStore.getState();
    off("bill:created");
    off("bill:updated");
    off("bill:deleted");
  },
}));
