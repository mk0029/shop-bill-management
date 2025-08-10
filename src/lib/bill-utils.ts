/**
 * Utility functions for bill management
 */

export interface BillItem {
  productId?: string;
  productName: string;
  category?: string;
  brand?: string;
  specifications?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

/**
 * Deduplicate bill items by product ID, combining quantities
 */
export function deduplicateBillItems(items: BillItem[]): BillItem[] {
  const itemMap = new Map<string, BillItem>();

  items.forEach((item) => {
    const key = item.productId || `custom-${item.productName}`;

    if (itemMap.has(key)) {
      const existing = itemMap.get(key)!;
      // Combine quantities and recalculate total
      const newQuantity = existing.quantity + item.quantity;
      const newTotalPrice = newQuantity * existing.unitPrice;

      itemMap.set(key, {
        ...existing,
        quantity: newQuantity,
        totalPrice: newTotalPrice,
      });
    } else {
      itemMap.set(key, { ...item });
    }
  });

  return Array.from(itemMap.values());
}

/**
 * Validate bill items for required fields
 */
export function validateBillItems(items: BillItem[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    errors.push("At least one item is required");
    return { isValid: false, errors };
  }

  items.forEach((item, index) => {
    if (!item.productId && !item.productName.toLowerCase().includes('rewinding')) {
      errors.push(`Item ${index + 1}: Product ID is required for standard items`);
    }
    if (!item.productName?.trim()) {
      errors.push(`Item ${index + 1}: Product name is required`);
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
    }
    if (!item.unitPrice || item.unitPrice <= 0) {
      errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate bill totals from items
 */
export function calculateBillTotals(
  items: BillItem[],
  additionalCharges: {
    homeVisitFee?: number;
    repairCharges?: number;
    laborCharges?: number;
    transportationFee?: number;
    taxRate?: number;
    discountAmount?: number;
  } = {}
) {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const homeVisitFee = additionalCharges.homeVisitFee || 0;
  const repairCharges = additionalCharges.repairCharges || 0;
  const laborCharges = additionalCharges.laborCharges || 0;
  const transportationFee = additionalCharges.transportationFee || 0;

  const beforeTax =
    subtotal + homeVisitFee + repairCharges + laborCharges + transportationFee;
  const taxAmount = (beforeTax * (additionalCharges.taxRate || 0)) / 100;
  const discountAmount = additionalCharges.discountAmount || 0;

  const totalAmount = beforeTax + taxAmount - discountAmount;

  return {
    subtotal,
    homeVisitFee,
    repairCharges,
    laborCharges,
    transportationFee,
    taxAmount,
    discountAmount,
    totalAmount,
  };
}

/**
 * Format bill items for display
 */
export function formatBillItemsForDisplay(items: BillItem[]): string {
  return items
    .map(
      (item, index) =>
        `${index + 1}. ${item.productName} x${item.quantity} @ ₹${
          item.unitPrice
        } = ₹${item.totalPrice}`
    )
    .join("\n");
}

/**
 * Check if two bill items are the same product
 */
export function isSameProduct(item1: BillItem, item2: BillItem): boolean {
  return item1.productId === item2.productId;
}

/**
 * Merge bill items with same product ID
 */
export function mergeBillItems(items: BillItem[]): BillItem[] {
  return deduplicateBillItems(items);
}
