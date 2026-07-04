import { sanityClient } from "./sanity";
import type { ApiResponse } from "./sanity-api-service";
import { getCookie } from "@/lib/cookies";

function getActorUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = getCookie('auth-storage');
    if (!raw) return null;
    const parsedUnknown: unknown = JSON.parse(raw);
    const parsed = typeof parsedUnknown === 'object' && parsedUnknown !== null ? (parsedUnknown as any) : null;
    const user = parsed?.state?.user as any;
    return (user?.id as string) || (user?._id as string) || null;
  } catch {
    return null;
  }
}

export const customerCashbookService = {
  async createCashbook(data: { customerId: string; name: string; notes?: string }): Promise<ApiResponse<any>> {
    try {
      const doc = {
        _type: 'customerCashbook',
        customer: { _type: 'reference', _ref: data.customerId },
        name: data.name,
        notes: data.notes || '',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const created = await sanityClient.create(doc);
      return { success: true, data: created };
    } catch (error) {
      console.error('Error creating customer cashbook:', error);
      return { success: false, error: 'Failed to create customer cashbook' };
    }
  },

  async getCashbooksByCustomer(customerId: string): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "customerCashbook" && customer._ref == $customerId] | order(updatedAt desc)`;
      const data = await sanityClient.fetch(query, { customerId });
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching customer cashbooks:', error);
      return { success: false, error: 'Failed to fetch customer cashbooks' };
    }
  },

  async getCashbookById(cashbookId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "customerCashbook" && _id == $id][0]{
        _id,
        name,
        status,
        notes,
        customer->{ _id, name, phone }
      }`;
      const data = await sanityClient.fetch(query, { id: cashbookId });
      if (!data) return { success: false, error: 'Cashbook not found' };
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching cashbook:', error);
      return { success: false, error: 'Failed to fetch cashbook' };
    }
  },

  async addItem(item: {
    cashbookId: string;
    customerId?: string;
    productId?: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    unit?: string;
    specifications?: string;
    category?: string;
    brand?: string;
    notes?: string;
    createdAt?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const actorUserId = getActorUserId();
      if (!actorUserId) return { success: false, error: 'Missing actorUserId' };
      const res = await fetch('/api/mutations/cashbook/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorUserId, item }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        return { success: false, error: json?.error || 'Failed to add cashbook item' }
      }
      return { success: true, data: json?.data }
    } catch (error) {
      console.error('Error adding cashbook item:', error);
      return { success: false, error: 'Failed to add cashbook item' };
    }
  },

  async getItems(cashbookId: string): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "cashbookItem" && cashbook._ref == $cashbookId] | order(createdAt asc)`;
      const data = await sanityClient.fetch(query, { cashbookId });
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching cashbook items:', error);
      return { success: false, error: 'Failed to fetch cashbook items' };
    }
  },

  async getPendingItems(cashbookId: string): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "cashbookItem" && cashbook._ref == $cashbookId && !defined(bill)] | order(createdAt asc)`;
      const data = await sanityClient.fetch(query, { cashbookId });
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching pending cashbook items:', error);
      return { success: false, error: 'Failed to fetch pending items' };
    }
  },

  async getBilledItems(cashbookId: string): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "cashbookItem" && cashbook._ref == $cashbookId && defined(bill)] | order(createdAt asc)`;
      const data = await sanityClient.fetch(query, { cashbookId });
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching billed cashbook items:', error);
      return { success: false, error: 'Failed to fetch billed items' };
    }
  },

  async convertPendingItemsToBill(params: {
    cashbookId: string;
    customerId: string;
    serviceType?: string;
    locationType?: string;
    notes?: string;
    visitingCharges?: number;
    repairFee?: number;
    paymentStatus?: 'pending' | 'partial' | 'paid';
    paidAmount?: number;
  }): Promise<ApiResponse<{ bill: any; count: number }>> {
    try {
      const actorUserId = getActorUserId();
      if (!actorUserId) return { success: false, error: 'Missing actorUserId' };
      const res = await fetch('/api/mutations/cashbook/convert-to-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorUserId, params }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        return { success: false, error: json?.error || 'Failed to convert items to bill' }
      }
      return { success: true, data: json?.data }
    } catch (error) {
      console.error('Error converting cashbook items to bill:', error);
      return { success: false, error: 'Failed to convert items to bill' };
    }
  },
};
