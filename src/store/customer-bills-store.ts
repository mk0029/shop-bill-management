import { create } from "zustand";

export interface CustomerBillItem {
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  specifications?: string;
}

export interface CustomerBill {
  _id?: string;
  billId?: string;
  billNumber?: string;
  customer?: any;
  items?: CustomerBillItem[];
  serviceType?: string;
  locationType?: string;
  serviceDate?: string;
  homeVisitFee?: number;
  repairFee?: number;
  transportationFee?: number;
  laborCharges?: number;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  paidAmount: number;
  balanceAmount: number;
  status?: string;
  priority?: string;
  notes?: string;
  internalNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CustomerBillsState {
  bills: CustomerBill[];
  loading: boolean;
  error: string | null;
  setBills: (bills: CustomerBill[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
  addOrUpdateBill: (bill: CustomerBill) => void;
  removeBill: (billId: string) => void;
  fetchByIdentifier: (identifier: string, by: "_id" | "customerId" | "secretKey") => Promise<CustomerBill[]>;
  fetchBillsByCustomer: (ids: { _id?: string; customerId?: string; secretKey?: string }) => Promise<CustomerBill[]>;
}

export const useCustomerBillsStore = create<CustomerBillsState>((set) => ({
  bills: [],
  loading: false,
  error: null,

  setBills: (bills) => set({ bills }),
  setLoading: (loading) => set({ loading }),
  setError: (err) => set({ error: err }),

  addOrUpdateBill: (bill) =>
    set((state) => {
      const id = bill._id || bill.billId;
      if (!id) return state;
      const idx = state.bills.findIndex((b) => (b._id || b.billId) === id);
      if (idx >= 0) {
        const updated = [...state.bills];
        updated[idx] = { ...updated[idx], ...bill };
        return { bills: updated };
      }
      return { bills: [bill, ...state.bills] };
    }),

  removeBill: (billId) =>
    set((state) => ({
      bills: state.bills.filter((b) => (b._id || b.billId) !== billId),
    })),

  fetchByIdentifier: async (identifier, by) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/bills/by-customer/${encodeURIComponent(identifier)}?by=${by}`);
      if (!res.ok) throw new Error("Failed to fetch bills");
      const data = await res.json();
      const bills = Array.isArray(data?.bills) ? (data.bills as CustomerBill[]) : [];
      console.log(`[CustomerBillsStore] fetchByIdentifier by=${by} id=${identifier} -> ${bills.length} bills`);
      set({ bills, loading: false });
      return bills;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to fetch bills", loading: false, bills: [] });
      return [];
    }
  },

  fetchBillsByCustomer: async ({ _id, customerId, secretKey }) => {
    set({ loading: true, error: null });
    try {
      const candidates: Array<{ by: "_id" | "customerId" | "secretKey"; id: string }> = [];
      if (_id) candidates.push({ by: "_id", id: _id });
      if (customerId) candidates.push({ by: "customerId", id: customerId });
      if (secretKey) candidates.push({ by: "secretKey", id: secretKey });

      for (const c of candidates) {
        const res = await fetch(`/api/bills/by-customer/${encodeURIComponent(c.id)}?by=${c.by}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.bills) && data.bills.length > 0) {
            const bills = data.bills as CustomerBill[];
            console.log(`[CustomerBillsStore] fetchBillsByCustomer hit by=${c.by} id=${c.id} -> ${bills.length} bills`);
            set({ bills, loading: false });
            return bills;
          }
        }
      }

      console.log(`[CustomerBillsStore] fetchBillsByCustomer no bills found for provided identifiers`);
      set({ bills: [], loading: false });
      return [];
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to fetch bills", loading: false, bills: [] });
      return [];
    }
  },
}));
