import { AppNotification } from "@/store/notification-store";

export type EventNavigationConfig = {
  pathname: string;
  query?: Record<string, string>;
  isModal: boolean;
};

/**
 * Build navigation destination for system activity events
 * Skip shop status events (Open/Closed/Maintenance)
 */
export function buildEventNavigation(notification: AppNotification): EventNavigationConfig | null {
  const { type, title, body, meta } = notification;
  
  // Skip shop availability status events
  if (isShopStatusEvent(title, body, meta)) {
    return null;
  }

  // Extract event type from title/body/meta
  const eventType = determineEventType(title, body, meta);
  const entityId = extractEntityId(meta);
  const entityType = extractEntityType(meta, eventType);

  if (!eventType) return null;

  // Build navigation based on event type
  switch (eventType) {
    case 'bill_created':
    case 'bill_updated':
      return buildBillNavigation(entityId, entityType) || buildFallbackNavigation('billing');
    
    case 'debit_recorded':
      return buildCashbookNavigation(entityId, 'debit') || buildFallbackNavigation('cashbooks');
    
    case 'credit_recorded':
      return buildCashbookNavigation(entityId, 'credit') || buildFallbackNavigation('cashbooks');
    
    case 'new_customer_added':
      return buildCustomerNavigation(entityId) || buildFallbackNavigation('customers');
    
    case 'inventory_purchase':
    case 'inventory_update':
      return buildInventoryNavigation(entityId, entityType) || buildFallbackNavigation('inventory');
    
    default:
      return null;
  }
}

/**
 * Fallback navigation when entity ID is not available
 */
function buildFallbackNavigation(section: string): EventNavigationConfig {
  return {
    pathname: `/admin/${section}`,
    query: {},
    isModal: false
  };
}

/**
 * Check if this is a shop status event that should be skipped
 */
function isShopStatusEvent(title?: string, body?: string, meta?: any): boolean {
  const shopStatusKeywords = ['shop is', 'available', 'offline', 'open', 'closed', 'maintenance'];
  const checkText = (text?: string) => {
    if (!text) return false;
    return shopStatusKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  };
  
  return (
    meta?.type === 'shop_status' ||
    checkText(title) ||
    checkText(body)
  );
}

/**
 * Determine the event type from notification data
 */
function determineEventType(title?: string, body?: string, meta?: any): string | null {
  const text = `${title || ''} ${body || ''}`.toLowerCase();
  
  // Check meta first - handle different meta structures
  if (meta?.event) return meta.event;
  if (meta?.action) return meta.action;
  if (meta?.type) return meta.type;
  
  // Check if title/body contains event patterns
  if (text.includes('bill created') || text.includes('bill created')) return 'bill_created';
  if (text.includes('bill updated') || text.includes('bill updated')) return 'bill_updated';
  if (text.includes('debit recorded') || text.includes('debit recorded')) return 'debit_recorded';
  if (text.includes('credit recorded') || text.includes('credit recorded')) return 'credit_recorded';
  if (text.includes('new customer added') || text.includes('new customer added')) return 'new_customer_added';
  if (text.includes('inventory purchase') || text.includes('inventory purchase')) return 'inventory_purchase';
  if (text.includes('inventory update') || text.includes('inventory update')) return 'inventory_update';
  
  // Try to extract from notification type
  if (text.includes('bill') || text.includes('billing')) {
    if (text.includes('created')) return 'bill_created';
    if (text.includes('updated')) return 'bill_updated';
  }
  
  return null;
}

/**
 * Extract entity ID from metadata
 */
function extractEntityId(meta?: any): string | null {
  // Try different possible ID fields
  return meta?.billId || 
         meta?.transactionId || 
         meta?.customerId || 
         meta?.inventoryId || 
         meta?.entityId ||
         meta?.id ||
         null;
}

/**
 * Extract entity type from metadata
 */
function extractEntityType(meta?: any, eventType?: string | null): string {
  if (meta?.entityType) return meta.entityType;
  
  // Default entity types based on event type
  switch (eventType) {
    case 'bill_created':
    case 'bill_updated':
      return 'bill';
    case 'debit_recorded':
    case 'credit_recorded':
      return 'transaction';
    case 'new_customer_added':
      return 'customer';
    case 'inventory_purchase':
    case 'inventory_update':
      return 'inventory';
    default:
      return 'unknown';
  }
}

/**
 * Build navigation for bill-related events
 */
function buildBillNavigation(billId?: string | null, entityType?: string): EventNavigationConfig | null {
  if (!billId) {
    // Try to extract bill ID from other sources or generate fallback
    return null;
  }
  
  return {
    pathname: '/admin/billing',
    query: {}, // Use hash instead of query for modal
    isModal: true
  };
}

/**
 * Build navigation for cashbook/transaction events
 */
function buildCashbookNavigation(transactionId: string | null, transactionType: string): EventNavigationConfig | null {
  if (!transactionId) return null;
  
  return {
    pathname: '/admin/cashbooks',
    query: { 
      transaction: transactionId,
      type: transactionType 
    },
    isModal: true
  };
}

/**
 * Build navigation for customer profile events
 */
function buildCustomerNavigation(customerId?: string | null): EventNavigationConfig | null {
  if (!customerId) return null;
  
  return {
    pathname: `/admin/customers/${customerId}`,
    isModal: false
  };
}

/**
 * Build navigation for inventory events
 */
function buildInventoryNavigation(inventoryId?: string | null, entityType?: string): EventNavigationConfig | null {
  if (!inventoryId) return null;
  
  return {
    pathname: `/admin/inventory/edit/${inventoryId}`,
    isModal: false
  };
}

/**
 * Build href string from navigation config
 */
export function buildEventHref(notification: AppNotification): string | null {
  const navigation = buildEventNavigation(notification);
  if (!navigation) return null;
  
  const { pathname, query } = navigation;
  
  // For bills, use hash format to trigger modal
  const eventType = determineEventType(notification.title, notification.body, notification.meta);
  if (eventType === 'bill_created' || eventType === 'bill_updated') {
    const billId = extractEntityId(notification.meta);
    return billId ? `${pathname}#${billId}` : pathname;
  }
  
  if (!query) return pathname;
  
  const queryString = new URLSearchParams(query).toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

/**
 * Check if navigation should open in modal vs full page
 */
export function shouldOpenAsModal(notification: AppNotification): boolean {
  const navigation = buildEventNavigation(notification);
  return navigation?.isModal ?? false;
}
