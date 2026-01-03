// Manual Cash Book Sync Script
// Run this script to sync all existing bills and inventory transactions to cash book

const { createClient } = require('@sanity/client');

// Initialize Sanity client
const client = createClient({
  projectId: 'idji8ni7',
  dataset: process.env.SANITY_STUDIO_DATASET || 'live-shop',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
});

/**
 * Create a cash book entry
 */
async function createCashBookEntry(entryData) {
  try {
    const newEntry = {
      _type: 'cashBookEntry',
      userName: entryData.userName || 'System',
      amount: entryData.amount,
      type: entryData.type,
      source: entryData.source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(entryData.bill && { bill: { _type: 'reference', _ref: entryData.bill } }),
      ...(entryData.user && { user: { _type: 'reference', _ref: entryData.user } }),
      ...(entryData.notes && { notes: entryData.notes }),
    };

    const created = await client.create(newEntry);
    console.log('✅ Created cash book entry:', created._id);
    return created;
  } catch (error) {
    console.error('❌ Failed to create cash book entry:', error.message);
    return null;
  }
}

/**
 * Sync all bills with payments
 */
async function syncBills() {
  console.log('📄 Syncing bills with payments...');
  
  try {
    const bills = await client.fetch(`
      *[_type == "bill" && paidAmount > 0 && defined(customer)] {
        _id,
        billNumber,
        paidAmount,
        customer->{_id, name}
      }
    `);

    console.log(`Found ${bills.length} bills with payments`);

    let synced = 0;
    for (const bill of bills) {
      // Check if cash book entry already exists for this bill
      const existingEntry = await client.fetch(`
        *[_type == "cashBookEntry" && bill._ref == $billId][0]
      `, { billId: bill._id });

      if (!existingEntry) {
        const result = await createCashBookEntry({
          userName: bill.customer.name || 'Customer',
          amount: bill.paidAmount,
          type: 'credit',
          source: 'Bill Payment',
          bill: bill._id,
          user: bill.customer._id,
          notes: `Bill payment for ${bill.billNumber || 'Bill #' + bill._id.slice(-6)}`,
        });
        
        if (result) synced++;
      } else {
        console.log(`⚠️ Cash book entry already exists for bill ${bill._id}`);
      }
    }

    console.log(`✅ Synced ${synced} bills to cash book`);
    return synced;
  } catch (error) {
    console.error('❌ Error syncing bills:', error);
    return 0;
  }
}

/**
 * Sync all inventory transactions
 */
async function syncInventoryTransactions() {
  console.log('📦 Syncing inventory transactions...');
  
  try {
    const transactions = await client.fetch(`
      *[_type == "stockTransaction" && type in ["sale", "adjustment", "damage", "return"] && totalAmount > 0] {
        _id,
        type,
        totalAmount,
        product->{name}
      }
    `);

    console.log(`Found ${transactions.length} inventory transactions`);

    let synced = 0;
    for (const transaction of transactions) {
      const result = await createCashBookEntry({
        userName: 'System',
        amount: transaction.totalAmount,
        type: 'debit',
        source: 'Manual',
        notes: `Inventory ${transaction.type}: ${transaction.product?.name || 'Item'}`,
      });
      
      if (result) synced++;
    }

    console.log(`✅ Synced ${synced} inventory transactions to cash book`);
    return synced;
  } catch (error) {
    console.error('❌ Error syncing inventory transactions:', error);
    return 0;
  }
}

/**
 * Main sync function
 */
async function main() {
  console.log('🔄 Starting Cash Book Sync...');
  
  try {
    const billsSynced = await syncBills();
    const transactionsSynced = await syncInventoryTransactions();
    
    console.log('🎉 Cash Book Sync Complete!');
    console.log(`📄 Bills synced: ${billsSynced}`);
    console.log(`📦 Inventory transactions synced: ${transactionsSynced}`);
    console.log(`📊 Total entries created: ${billsSynced + transactionsSynced}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
if (require.main === module) {
  main();
}

module.exports = {
  syncBills,
  syncInventoryTransactions,
  main
};
