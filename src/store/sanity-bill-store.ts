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
      const result = await sanityClient
        .patch(billId)
        .set({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .commit();
      // The real-time listener will automatically update the local state
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
