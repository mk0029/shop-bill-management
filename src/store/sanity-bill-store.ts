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
  repairCharges: number;
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
  fetchBills: () => Promise<void>;
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

  // Fetch bills from Sanity
  fetchBills: async () => {
    set({ loading: true, error: null });

    try {
      const bills = await sanityClient.fetch(queries.bills);
      set({ bills: bills || [], loading: false });
      console.log("✅ Fetched bills:", bills?.length || 0);
    } catch (error) {
      console.error("❌ Error fetching bills:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to fetch bills",
        loading: false,
      });
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
      console.log("✅ Bill created in Sanity:", result.billNumber);

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

      console.log("✅ Bill updated in Sanity:", result.billNumber);
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
      console.log("✅ Bill deleted from Sanity:", billId);
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
      console.log("🔔 Real-time: Bill created", bill.billNumber);
      set((state) => ({
        bills: [bill, ...state.bills.filter((b) => b._id !== bill._id)],
      }));
    });

    on(
      "bill:updated",
      ({ billId, updates }: { billId: string; updates: Partial<Bill> }) => {
        console.log("🔔 Real-time: Bill updated", billId);
        set((state) => ({
          bills: state.bills.map((bill) =>
            bill._id === billId ? { ...bill, ...updates } : bill
          ),
        }));
      }
    );

    on("bill:deleted", ({ billId }: { billId: string }) => {
      console.log("🔔 Real-time: Bill deleted", billId);
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
