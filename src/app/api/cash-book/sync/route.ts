import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { sanityApiService } from "@/lib/sanity-api-service";

export const runtime = "nodejs";

/**
 * API endpoint to sync cash book entries from bill and inventory changes
 * This can be called from Sanity webhooks or manually
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, documentId, document } = body;

    console.log('🔄 Cash book sync API called:', { type, documentId });

    switch (type) {
      case 'bill':
        await handleBillSync(documentId, document);
        break;
      
      case 'stockTransaction':
        await handleInventorySync(documentId, document);
        break;
      
      default:
        console.log('⚠️ Unknown document type:', type);
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
async function handleBillSync(billId: string, bill: any) {
  if (!bill) return;

  const paidAmount = Number(bill.paidAmount || 0);
  
  if (paidAmount > 0 && bill.customer) {
    console.log('💰 Creating cash book entry for bill:', billId);
    
    const result = await sanityApiService.cashBook.createEntryFromBillPayment({
      billId: billId,
      userId: bill.customer._ref || bill.customer._id,
      userName: bill.customer.name || 'Customer',
      amount: paidAmount,
      paymentType: 'credit'
    });

    if (result.success) {
      console.log('✅ Cash book entry created for bill payment');
    } else {
      console.error('❌ Failed to create cash book entry for bill:', result.error);
    }
  }
}

/**
 * Handle inventory synchronization
 */
async function handleInventorySync(transactionId: string, transaction: any) {
  if (!transaction) return;

  const { type, totalAmount, product } = transaction;
  
  // Create debit entries for inventory movements (except purchases)
  const debitTypes = ['sale', 'adjustment', 'damage', 'return'];
  
  if (debitTypes.includes(type) && totalAmount > 0) {
    console.log('📦 Creating cash book entry for inventory:', transactionId);
    
    const result = await sanityApiService.cashBook.createEntry({
      userName: 'System',
      amount: totalAmount,
      type: 'debit',
      source: 'Manual',
      notes: `Inventory ${type}: ${product?.name || 'Item'}`
    });

    if (result.success) {
      console.log('✅ Cash book entry created for inventory transaction');
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
    console.log('🔄 Starting manual cash book sync...');

    // Sync all existing bills with payments
    const bills = await sanityClient.fetch(`
      *[_type == "bill" && paidAmount > 0 && defined(customer)] {
        _id,
        billNumber,
        paidAmount,
        customer->{_id, name}
      }
    `);

    console.log(`📄 Found ${bills.length} bills with payments`);

    for (const bill of bills) {
      await handleBillSync(bill._id, bill);
    }

    // Sync existing stock transactions
    const transactions = await sanityClient.fetch(`
      *[_type == "stockTransaction" && type in ["sale", "adjustment", "damage", "return"] && totalAmount > 0] {
        _id,
        type,
        totalAmount,
        product->{name}
      }
    `);

    console.log(`📦 Found ${transactions.length} inventory transactions`);

    for (const transaction of transactions) {
      await handleInventorySync(transaction._id, transaction);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Manual cash book sync completed',
      billsProcessed: bills.length,
      transactionsProcessed: transactions.length
    });
  } catch (error: any) {
    console.error('❌ Manual sync error:', error);
    return NextResponse.json(
      { error: 'Failed to perform manual sync', details: error.message },
      { status: 500 }
    );
  }
}
