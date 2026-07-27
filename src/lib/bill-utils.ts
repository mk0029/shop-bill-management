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
  isCustom?: boolean;
  isRewinding?: boolean;
}

export interface RoundFigureDiscountResult {
  shouldApply: boolean;
  discountAmount: number;
  discountReason: string;
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
    // Only require productId for standard items (not custom or rewinding items)
    if (!item.productId && !item.isCustom && !item.isRewinding) {
      errors.push(
        `Item ${index + 1}: Product ID is required for standard items`
      );
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
    visitingCharges?: number;
    // Prefer repairFee; keep repairCharges for backward compatibility
    repairFee?: number;
    repairCharges?: number;
    transportationFee?: number;
    taxRate?: number;
    discount?: number;
  } = {}
) {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const visitingCharges = additionalCharges.visitingCharges || 0;
  const repairCharges =
    (additionalCharges.repairFee ?? additionalCharges.repairCharges) || 0;
  const transportationFee = additionalCharges.transportationFee || 0;

  const beforeTax =
    subtotal + visitingCharges + repairCharges + transportationFee;
  const taxAmount = (beforeTax * (additionalCharges.taxRate || 0)) / 100;
  const discount = additionalCharges.discount || 0;

  const totalAmount = beforeTax + taxAmount - discount;

  return {
    subtotal,
    visitingCharges,
    repairCharges,
    transportationFee,
    taxAmount,
    discount,
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
 * Central payment calculation utilities
 */

export const BILL_EPSILON = 0.01;

export function toMoney(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

export function normalizeMoneyInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", decimal] = cleaned.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "");
  return decimal !== undefined
    ? `${normalizedWhole || "0"}.${decimal.slice(0, 2)}`
    : normalizedWhole;
}

export interface RoundFigureDiscountCalculation {
  shouldApply: boolean;
  discountAmount: number;
  originalRemaining: number;
  paymentAmount: number;
  finalPaidAmount: number;
  finalRemaining: number;
  isFullyPaid: boolean;
}

export function calculateRoundFigureDiscount({
  originalRemaining,
  paymentAmount,
}: {
  originalRemaining: number;
  paymentAmount: number;
}): RoundFigureDiscountCalculation {
  const roundedDownAmount = Math.floor(originalRemaining);
  const difference = roundedDownAmount - paymentAmount;
  
  const result: RoundFigureDiscountCalculation = {
    shouldApply: false,
    discountAmount: 0,
    originalRemaining,
    paymentAmount,
    finalPaidAmount: paymentAmount,
    finalRemaining: originalRemaining,
    isFullyPaid: false,
  };
  
  if (difference > 0 && difference <= 5) {
    result.shouldApply = true;
    result.discountAmount = difference;
    result.finalPaidAmount = roundedDownAmount;
    result.finalRemaining = 0;
    result.isFullyPaid = true;
  } else if (difference <= 0) {
    result.finalPaidAmount = Math.min(paymentAmount, originalRemaining);
    result.finalRemaining = Math.max(0, originalRemaining - result.finalPaidAmount);
    result.isFullyPaid = result.finalRemaining <= BILL_EPSILON;
  } else {
    result.finalPaidAmount = paymentAmount;
    result.finalRemaining = originalRemaining - paymentAmount;
    result.isFullyPaid = result.finalRemaining <= BILL_EPSILON;
  }
  
  return result;
}

export function calculatePaymentValidation({
  grandTotal,
  alreadyPaid,
  discountAmount,
  paymentAmount,
}: {
  grandTotal: number;
  alreadyPaid: number;
  discountAmount: number;
  paymentAmount: number;
}) {
  const originalRemaining = Math.max(0, grandTotal - alreadyPaid);
  const payableAfterDiscount = Math.max(
    0,
    originalRemaining - discountAmount,
  );
  const totalSettlement = paymentAmount + discountAmount;
  const remainingAfterPayment = Math.max(
    0,
    originalRemaining - totalSettlement,
  );

  const discountTooHigh =
    discountAmount > originalRemaining + BILL_EPSILON;
  const invalidAmount = paymentAmount < 0 || discountAmount < 0;
  const hasValidationError =
    invalidAmount || discountTooHigh;
  const billStatus: "paid" | "partial" =
    remainingAfterPayment <= BILL_EPSILON ? "paid" : "partial";

  return {
    originalRemaining,
    payableAfterDiscount,
    totalSettlement,
    remainingAfterPayment,
    discountTooHigh,
    invalidAmount,
    hasValidationError,
    billStatus,
  };
}

export function calculatePaymentWithRoundFigureDiscount({
  grandTotal,
  alreadyPaid,
  discountAmount,
  paymentAmount,
}: {
  grandTotal: number;
  alreadyPaid: number;
  discountAmount: number;
  paymentAmount: number;
}): {
  validation: ReturnType<typeof calculatePaymentValidation>;
  roundFigureDiscount: RoundFigureDiscountCalculation;
} {
  const validation = calculatePaymentValidation({
    grandTotal,
    alreadyPaid,
    discountAmount,
    paymentAmount,
  });
  
  const roundFigureDiscount = calculateRoundFigureDiscount({
    originalRemaining: validation.originalRemaining,
    paymentAmount,
  });
  
  return {
    validation,
    roundFigureDiscount,
  };
}

export function getRoundFigureDiscountApplied({
  originalRemaining,
  paymentAmount,
  existingDiscounts,
}: {
  originalRemaining: number;
  paymentAmount: number;
  existingDiscounts: Record<string, number>;
}): RoundFigureDiscountResult {
  const roundedDownAmount = Math.floor(originalRemaining);
  const difference = roundedDownAmount - paymentAmount;
  
  const result: RoundFigureDiscountResult = {
    shouldApply: false,
    discountAmount: 0,
    discountReason: "",
  };
  
  if (difference > 0 && difference <= 5) {
    result.shouldApply = true;
    result.discountAmount = difference;
    result.discountReason = "Round Figure Discount";
  }
  
  return result;
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

/**
 * Round to 2 decimal places (currency)
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export type BillPaymentSummary = {
  subtotal: number;
  discount: number;
  finalTotal: number;
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  isFullyPaid: boolean;
};

/**
 * Calculate the payment summary for a bill.
 * Always uses server-calculated values — never trusts frontend state.
 */
export function calculateBillPaymentSummary(bill: {
  totalAmount?: number;
  paidAmount?: number;
  discount?: number;
}): BillPaymentSummary {
  const subtotal = roundCurrency(Number(bill.totalAmount || 0));
  const discount = roundCurrency(Number(bill.discount || 0));
  const finalTotal = Math.max(0, roundCurrency(subtotal - discount));
  const amountPaid = Math.max(0, roundCurrency(Number(bill.paidAmount || 0)));
  const remainingBalance = Math.max(0, roundCurrency(finalTotal - amountPaid));

  const isFullyPaid =
    finalTotal === 0 ||
    remainingBalance <= BILL_EPSILON ||
    amountPaid >= finalTotal;

  const paymentStatus: "unpaid" | "partial" | "paid" = isFullyPaid
    ? "paid"
    : amountPaid > 0
      ? "partial"
      : "unpaid";

  return {
    subtotal,
    discount,
    finalTotal,
    amountPaid,
    remainingBalance,
    paymentStatus,
    isFullyPaid,
  };
}
