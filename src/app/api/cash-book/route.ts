import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { sanityApiService } from "@/lib/sanity-api-service";
import { syncBillPaymentsToCashBook, syncSingleBillPayment } from "@/lib/bill-payment-sync";
import { notificationService } from "@/lib/notification-service";

export const runtime = "nodejs";

/**
 * API endpoint to sync cash book entries from bill and inventory changes
 * This can be called from Sanity webhooks or manually
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, documentId, document } = body;

    const actorUserId = String(
      (body?.actorUserId as string | undefined) ||
        req.headers.get('x-user-id') ||
        'system'
    ).trim() || 'system'

    switch (type) {
      case 'bill':
        await handleBillSync(documentId, document, actorUserId);
        break;
      
      case 'stockTransaction':
        await handleInventorySync(documentId, document, actorUserId);
        break;
      
      default:
    }

    return NextResponse.json({ success: true, message: 'Cash book synced successfully' });
  } catch (error: any) {
    console.error('❌ Cash book sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync cash book', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle bill synchronization
 */
async function handleBillSync(billId: string, bill: any, actorUserId: string) {
  if (!bill) return;

  // Only sync if bill is paid or partial and has a customer
  if (['paid', 'partial'].includes(bill.paymentStatus) && bill.customer) {
    const result = await syncSingleBillPayment(billId);

    if (result.success) {

      // Notify admins (excluding sender when actorUserId is an admin)
      try {
        const billNumber = String(bill?.billNumber || '').trim()
        const amount = Number(bill?.paidAmount || 0)
        const customerId = (() => {
          const c = bill?.customer
          if (!c) return undefined
          if (typeof c === 'string') return String(c)
          if (typeof c === 'object' && typeof c._ref === 'string') return String(c._ref)
          if (typeof c === 'object' && typeof c._id === 'string') return String(c._id)
          return undefined
        })()

        await notificationService.emit({
          type: 'cashbook_entry',
          actorUserId,
          data: {
            billId: String(billId),
            ...(customerId ? { customerId } : {}),
            route: '/admin/cash-book/history',
            extra: {
              title: 'Cashbook entry',
              body: `Bill payment${billNumber ? ` • ${billNumber}` : ''}${amount > 0 ? ` • ₹${amount}` : ''}`,
            },
          },
        })
      } catch (e) {
        console.error('[Notify] cashbook_entry emit failed (bill sync)', e)
      }
    } else {
      console.error('❌ Failed to sync bill payment:', result.message);
    }
  }
}

/**
 * Handle inventory synchronization
 */
async function handleInventorySync(transactionId: string, transaction: any, actorUserId: string) {
  if (!transaction) return;

  const { type, totalAmount, product } = transaction;
  
  // Create debit entries for inventory movements (except purchases)
  const debitTypes = ['sale', 'adjustment', 'damage', 'return'];
  
  if (debitTypes.includes(type) && totalAmount > 0) {
    const result = await sanityApiService.cashBook.createEntry({
      userName: 'System',
      amount: totalAmount,
      type: 'debit',
      source: 'Manual',
      notes: `Inventory ${type}: ${product?.name || 'Item'}`
    });

    if (result.success) {
      // Notify admins (excluding sender when actorUserId is an admin)
      try {
        await notificationService.emit({
          type: 'cashbook_entry',
          actorUserId,
          data: {
            route: '/admin/cash-book/history',
            extra: {
              title: 'Cashbook entry',
              body: `Inventory ${String(type)} • ₹${Number(totalAmount)}`,
            },
          },
        })
      } catch (e) {
        console.error('[Notify] cashbook_entry emit failed (inventory sync)', e)
      }
    } else {
      console.error('❌ Failed to create cash book entry for inventory:', result.error);
    }
  }
}

/**
 * Manual sync endpoint to sync existing data
 */
export async function GET(req: Request) {
  try {
    // Use the new sync service for bill payments
    const syncResult = await syncBillPaymentsToCashBook();

    // Sync existing stock transactions (legacy functionality)
    const transactions = await sanityClient.fetch(`
      *[_type == "stockTransaction" && type in ["sale", "adjustment", "damage", "return"] && totalAmount > 0] {
        _id,
        type,
        totalAmount,
        product->{name}
      }
    `);

    let syncedTransactions = 0;
    for (const transaction of transactions) {
      await handleInventorySync(transaction._id, transaction, 'system');
      syncedTransactions++;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Manual cash book sync completed',
      billSync: {
        syncedCount: syncResult.syncedCount,
        skippedCount: syncResult.skippedCount,
        errors: syncResult.errors.length
      },
      inventorySync: {
        syncedTransactions
      },
      details: syncResult.details
    });
  } catch (error: any) {
    console.error('❌ Manual sync error:', error);
    return NextResponse.json(
      { error: 'Failed to perform manual sync', details: error.message },
      { status: 500 }
    );
  }
}
