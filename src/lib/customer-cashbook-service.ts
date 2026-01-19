import { sanityClient } from "./sanity";
import type { ApiResponse } from "./sanity-api-service";

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
      const totalPrice = Math.max(0, (item.quantity || 0) * (item.unitPrice || 0));
      const doc: any = {
        _type: 'cashbookItem',
        cashbook: { _type: 'reference', _ref: item.cashbookId },
        ...(item.customerId ? { customer: { _type: 'reference', _ref: item.customerId } } : {}),
        ...(item.productId ? { product: { _type: 'reference', _ref: item.productId } } : {}),
        itemName: item.itemName,
        specifications: item.specifications || '',
        category: item.category || '',
        brand: item.brand || '',
        unit: item.unit || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
        notes: item.notes || '',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        locked: false,
      };
      const created = await sanityClient.create(doc);
      try { await sanityClient.patch(item.cashbookId).set({ updatedAt: new Date().toISOString() }).commit(); } catch {}
      return { success: true, data: created };
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
    homeVisitFee?: number;
    repairFee?: number;
    paymentStatus?: 'pending' | 'partial' | 'paid';
    paidAmount?: number;
  }): Promise<ApiResponse<{ bill: any; count: number }>> {
    try {
      const itemsQuery = `*[_type == "cashbookItem" && cashbook._ref == $cashbookId && !defined(bill)]`;
      const pendingItems: any[] = await sanityClient.fetch(itemsQuery, { cashbookId: params.cashbookId });
      if (!pendingItems || pendingItems.length === 0) {
        return { success: false, error: 'No pending items to bill' };
      }

      const billItems = pendingItems.map((ci) => ({
        _type: 'billItem',
        product: ci.product ? { _type: 'reference', _ref: (ci.product as any)._ref || ci.product } : undefined,
        productName: ci.itemName,
        category: ci.category || undefined,
        brand: ci.brand || undefined,
        specifications: ci.specifications || undefined,
        unit: ci.unit || '',
        quantity: Number(ci.quantity) || 0,
        unitPrice: Number(ci.unitPrice) || 0,
        totalPrice: Math.max(
          0,
          Number((((ci as any).totalPrice ?? (ci.quantity * ci.unitPrice)) || 0))
        ),
      }));

      const subtotal = billItems.reduce((sum: number, it: any) => sum + (Number(it.totalPrice) || 0), 0);
      const homeVisitFee = Number(params.homeVisitFee || 0);
      const repairFee = Number(params.repairFee || 0);
      const totalAmount = Math.max(0, subtotal + homeVisitFee + repairFee);
      const paidAmount = Number(params.paidAmount || 0);
      const balanceAmount = Math.max(0, totalAmount - paidAmount);

      const billDoc: any = {
        _type: 'bill',
        billNumber: `BILL_${Date.now()}`,
        customer: { _type: 'reference', _ref: params.customerId },
        serviceType: params.serviceType || '',
        locationType: params.locationType || '',
        items: billItems,
        serviceDate: new Date().toISOString(),
        homeVisitFee,
        repairFee,
        subtotal,
        discount: 0,
        totalAmount,
        paymentStatus: params.paymentStatus || 'pending',
        paidAmount,
        balanceAmount,
        status: 'draft',
        priority: 'medium',
        notes: params.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const tx = sanityClient.transaction();
      tx.create(billDoc);
      const result = await tx.commit();
      const createdBillId = (result as any)?.results?.[0]?.id || (result as any)?._id;

      const patchTx = sanityClient.transaction();
      for (const it of pendingItems) {
        patchTx.patch(it._id, (p: any) => p.set({ bill: { _type: 'reference', _ref: createdBillId }, locked: true, updatedAt: new Date().toISOString() }));
      }
      patchTx.patch(params.cashbookId, (p: any) => p.set({ updatedAt: new Date().toISOString() }));
      await patchTx.commit();

      return { success: true, data: { bill: { _id: createdBillId }, count: pendingItems.length } };
    } catch (error) {
      console.error('Error converting cashbook items to bill:', error);
      return { success: false, error: 'Failed to convert items to bill' };
    }
  },
};
