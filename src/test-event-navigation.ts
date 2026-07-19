import { buildEventHref, shouldOpenAsModal } from './lib/event-navigation';
import { AppNotification } from './store/notification-store';

// Test cases for different event types
const testNotifications: AppNotification[] = [
  {
    id: '1',
    type: 'billing',
    title: 'Bill Created',
    body: 'New bill #BILL-123 created for John Doe',
    createdAt: new Date().toISOString(),
    meta: {
      billId: 'bill-123',
      entityType: 'bill',
      event: 'bill_created'
    }
  },
  {
    id: '2',
    type: 'billing',
    title: 'Bill Updated',
    body: 'Bill #BILL-456 has been updated',
    createdAt: new Date().toISOString(),
    meta: {
      billId: 'bill-456',
      entityType: 'bill',
      event: 'bill_updated'
    }
  },
  {
    id: '3',
    type: 'payment',
    title: 'Debit Recorded',
    body: 'Debit transaction recorded',
    createdAt: new Date().toISOString(),
    meta: {
      transactionId: 'txn-789',
      entityType: 'transaction',
      event: 'debit_recorded'
    }
  },
  {
    id: '4',
    type: 'payment',
    title: 'Credit Recorded',
    body: 'Credit transaction recorded',
    createdAt: new Date().toISOString(),
    meta: {
      transactionId: 'txn-101',
      entityType: 'transaction',
      event: 'credit_recorded'
    }
  },
  {
    id: '5',
    type: 'system',
    title: 'New Customer Added',
    body: 'New customer Jane Smith has been added',
    createdAt: new Date().toISOString(),
    meta: {
      customerId: 'cust-202',
      entityType: 'customer',
      event: 'new_customer_added'
    }
  },
  {
    id: '6',
    type: 'inventory',
    title: 'Inventory Purchase',
    body: 'New inventory items purchased',
    createdAt: new Date().toISOString(),
    meta: {
      inventoryId: 'inv-303',
      entityType: 'inventory',
      event: 'inventory_purchase'
    }
  },
  {
    id: '7',
    type: 'system',
    title: 'Shop is Open',
    body: 'The shop is now available for business',
    createdAt: new Date().toISOString(),
    meta: {
      type: 'shop_status'
    }
  }
];

// Run tests
testNotifications.forEach((notification) => {
  buildEventHref(notification);
  shouldOpenAsModal(notification);
});
