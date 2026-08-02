/**
 * Service to sync bill payments to cash book
 * Extracts payments from paid and partial bills and creates cash book entries
 */

import { sanityApiService, billPaymentNotes } from './sanity-api-service';
import { sanityClient } from './sanity';

function ensureUTC(dateStr: string | undefined | null): string {
  if (!dateStr) return new Date().toISOString();
  const s = String(dateStr).trim();
  if (/Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) return s;
  return s + "Z";
}

export interface BillPaymentData {
  billId: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  paymentStatus: 'paid' | 'partial';
  paymentDate?: string;
  lastPaymentDate?: string;
  billDate?: string; // Add bill creation date
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  skippedCount: number;
  errors: string[];
  details: {
    billNumber: string;
    amount: number;
    status: string;
    action: 'created' | 'skipped' | 'error';
    message?: string;
  }[];
}

/**
 * Get all bills with paid or partial payment status
 */
export async function getBillsWithPayments(): Promise<BillPaymentData[]> {
  try {
    const query = `*[_type == "bill" && paymentStatus in ["paid", "partial"]] {
      _id,
      billNumber,
      paymentStatus,
      paymentDate,
      lastPaymentDate,
      totalAmount,
      paidAmount,
      balanceAmount,
      customer->{
        _id,
        name,
        phone
      },
      createdAt, // This will be used as billDate
      updatedAt
    } | order(paymentDate desc, lastPaymentDate desc, updatedAt desc)`;

    const bills = await sanityClient.fetch(query);
    
    return bills.map((bill: any) => ({
      billId: bill._id,
      billNumber: bill.billNumber,
      customerId: bill.customer?._id || '',
      customerName: bill.customer?.name || 'Unknown Customer',
      customerPhone: bill.customer?.phone,
      amount: bill.paidAmount || 0,
      paymentStatus: bill.paymentStatus,
      paymentDate: ensureUTC(bill.paymentDate),
      lastPaymentDate: ensureUTC(bill.lastPaymentDate),
      billDate: ensureUTC(bill.createdAt),
      totalAmount: bill.totalAmount || 0,
      paidAmount: bill.paidAmount || 0,
      balanceAmount: bill.balanceAmount ?? 0,
    }));
  } catch (error) {
    console.error('Error fetching bills with payments:', error);
    return [];
  }
}

/**
 * Check if a cash book entry already exists for a specific bill
 */
export async function checkCashBookEntryExists(billId: string): Promise<boolean> {
  try {
    const query = `*[_type == "cashBookEntry" && bill._ref == $billId][0] {
      _id
    }`;
    
    const entry = await sanityClient.fetch(query, { billId });
    return !!entry;
  } catch (error) {
    console.error('Error checking cash book entry:', error);
    return false;
  }
}

/**
 * Create cash book entry from bill payment
 */
export async function createCashBookEntryFromBill(billData: BillPaymentData): Promise<{ success: boolean; message: string }> {
  try {
    const existingEntry = await checkCashBookEntryExists(billData.billId);
    if (existingEntry) {
      return {
        success: false,
        message: `Cash book entry already exists for bill ${billData.billNumber}`
      };
    }

    const entryDate = billData.paymentDate ||
                      billData.lastPaymentDate ||
                      billData.billDate ||
                      new Date().toISOString();

    const normalizedDate = ensureUTC(entryDate);

    const notes = billPaymentNotes({
      billNumber: billData.billNumber,
      paymentStatus: billData.paymentStatus,
    });

    const entryData: any = {
      user: {
        _type: "reference",
        _ref: billData.customerId
      },
      userName: billData.customerName,
      customerName: billData.customerName,
      customerId: billData.customerId,
      amount: billData.amount,
      totalAmount: billData.totalAmount,
      billTotal: billData.totalAmount,
      type: 'credit' as const,
      source: "Bill Payment" as const,
      notes,
      bill: {
        _type: "reference",
        _ref: billData.billId
      },
      createdAt: normalizedDate,
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityApiService.cashBook.createEntry(entryData);
    
    if (result.success) {
      return { 
        success: true, 
        message: `Cash book entry created for bill ${billData.billNumber}` 
      };
    } else {
      return { 
        success: false, 
        message: result.error || 'Failed to create cash book entry' 
      };
    }
  } catch (error) {
    console.error('Error creating cash book entry from bill:', error);
    return { 
      success: false, 
      message: 'Error creating cash book entry' 
    };
  }
}

/**
 * Sync all bill payments to cash book
 * This is the main function to call for syncing payments
 */
export async function syncBillPaymentsToCashBook(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    skippedCount: 0,
    errors: [],
    details: []
  };

  try {
    // Get all bills with payments
    const billsWithPayments = await getBillsWithPayments();
    
    if (billsWithPayments.length === 0) {
      result.details.push({
        billNumber: 'N/A',
        amount: 0,
        status: 'N/A',
        action: 'skipped',
        message: 'No bills with payments found'
      });
      return result;
    }

    // Process each bill
    for (const bill of billsWithPayments) {
      try {
        // Check if entry already exists
        const entryExists = await checkCashBookEntryExists(bill.billId);
        
        if (entryExists) {
          result.skippedCount++;
          result.details.push({
            billNumber: bill.billNumber,
            amount: bill.amount,
            status: bill.paymentStatus,
            action: 'skipped',
            message: 'Cash book entry already exists'
          });
          continue;
        }

        // Create cash book entry
        const entryResult = await createCashBookEntryFromBill(bill);
        
        if (entryResult.success) {
          result.syncedCount++;
          result.details.push({
            billNumber: bill.billNumber,
            amount: bill.amount,
            status: bill.paymentStatus,
            action: 'created',
            message: entryResult.message
          });
        } else {
          result.errors.push(entryResult.message);
          result.details.push({
            billNumber: bill.billNumber,
            amount: bill.amount,
            status: bill.paymentStatus,
            action: 'error',
            message: entryResult.message
          });
        }
      } catch (error) {
        const errorMessage = `Error processing bill ${bill.billNumber}: ${error}`;
        result.errors.push(errorMessage);
        result.details.push({
          billNumber: bill.billNumber,
          amount: bill.amount,
          status: bill.paymentStatus,
          action: 'error',
          message: errorMessage
        });
      }
    }

    // Determine overall success
    result.success = result.errors.length === 0 && result.syncedCount > 0;
    
    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${error}`);
    return result;
  }
}

/**
 * Sync a single bill payment to cash book
 * Useful for real-time sync when a bill payment is updated
 */
export async function syncSingleBillPayment(billId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get the specific bill
    const query = `*[_type == "bill" && _id == $billId && paymentStatus in ["paid", "partial"]][0] {
      _id,
      billNumber,
      paymentStatus,
      paymentDate,
      lastPaymentDate,
      totalAmount,
      paidAmount,
      balanceAmount,
      customer->{
        _id,
        name,
        phone
      },
      createdAt // Add createdAt for billDate
    }`;
    
    const bill = await sanityClient.fetch(query, { billId });
    
    if (!bill) {
      return { 
        success: false, 
        message: 'Bill not found or not in paid/partial status' 
      };
    }

    // Check if entry already exists
    const entryExists = await checkCashBookEntryExists(billId);
    
    if (entryExists) {
      return { 
        success: false, 
        message: 'Cash book entry already exists for this bill' 
      };
    }

    // Create bill payment data
    const billData: BillPaymentData = {
      billId: bill._id,
      billNumber: bill.billNumber,
      customerId: bill.customer?._id || '',
      customerName: bill.customer?.name || 'Unknown Customer',
      customerPhone: bill.customer?.phone,
      amount: bill.paidAmount || 0,
      paymentStatus: bill.paymentStatus,
      paymentDate: ensureUTC(bill.paymentDate),
      lastPaymentDate: ensureUTC(bill.lastPaymentDate),
      billDate: ensureUTC(bill.createdAt),
      totalAmount: bill.totalAmount || 0,
      paidAmount: bill.paidAmount || 0,
      balanceAmount: bill.balanceAmount ?? 0,
    };

    // Create cash book entry
    return await createCashBookEntryFromBill(billData);
  } catch (error) {
    console.error('Error syncing single bill payment:', error);
    return { 
      success: false, 
      message: `Error syncing bill payment: ${error}` 
    };
  }
}

/**
 * Get sync statistics
 */
export async function getSyncStatistics(): Promise<{
  totalBillsWithPayments: number;
  syncedEntries: number;
  pendingSync: number;
}> {
  try {
    // Get bills with payments
    const billsWithPayments = await getBillsWithPayments();
    
    // Get existing cash book entries from bill payments
    const entriesQuery = `*[_type == "cashBookEntry" && source == "Bill Payment"] {
      _id,
      bill->{_id}
    }`;
    
    const existingEntries = await sanityClient.fetch(entriesQuery);
    const syncedBillIds = existingEntries.map((entry: any) => entry.bill?._id).filter(Boolean);
    
    return {
      totalBillsWithPayments: billsWithPayments.length,
      syncedEntries: syncedBillIds.length,
      pendingSync: billsWithPayments.length - syncedBillIds.length
    };
  } catch (error) {
    console.error('Error getting sync statistics:', error);
    return {
      totalBillsWithPayments: 0,
      syncedEntries: 0,
      pendingSync: 0
    };
  }
}
