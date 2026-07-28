import { sanityClient } from "./sanity";

export const BILL_EPSILON = 0.01;

export function toMoney(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

export interface AdvanceCalculationResult {
  advanceApplied: number;
  advanceCreated: number;
  paymentBeforeAdvance: number;
  finalCustomerPayment: number;
  remainingAfterAdvance: number;
  isFullyPaidByAdvance: boolean;
}

export function calculateAdvanceForPayment(opts: {
  customerAdvanceBalance: number;
  billTotal: number;
  customerPays: number;
}): AdvanceCalculationResult {
  const advanceBalance = toMoney(opts.customerAdvanceBalance);
  const billTotal = toMoney(opts.billTotal);
  const customerPays = toMoney(opts.customerPays);

  let advanceApplied = 0;
  let advanceCreated = 0;
  let paymentBeforeAdvance = 0;
  let finalCustomerPayment = 0;
  let remainingAfterAdvance = 0;
  let isFullyPaidByAdvance = false;

  const totalAvailable = customerPays + advanceBalance;

  if (totalAvailable >= billTotal) {
    const excess = totalAvailable - billTotal;
    if (advanceBalance > 0) {
      const afterAdvance = Math.max(0, billTotal - advanceBalance);
      if (afterAdvance <= 0) {
        advanceApplied = billTotal;
        isFullyPaidByAdvance = true;
        advanceCreated = customerPays + (advanceBalance - billTotal);
        finalCustomerPayment = customerPays;
      } else {
        advanceApplied = advanceBalance;
        if (customerPays > afterAdvance) {
          advanceCreated = customerPays - afterAdvance;
          finalCustomerPayment = customerPays;
        } else {
          finalCustomerPayment = customerPays;
        }
      }
    } else {
      advanceCreated = excess;
      finalCustomerPayment = customerPays;
    }
    paymentBeforeAdvance = finalCustomerPayment;
    remainingAfterAdvance = billTotal - advanceApplied - finalCustomerPayment;
  } else {
    if (advanceBalance > 0) {
      const maxPayable = customerPays + advanceBalance;
      const shortfall = billTotal - maxPayable;
      if (customerPays >= billTotal - advanceBalance) {
        advanceApplied = advanceBalance;
        finalCustomerPayment = customerPays;
        paymentBeforeAdvance = customerPays;
        remainingAfterAdvance = shortfall;
      } else {
        advanceApplied = billTotal - customerPays;
        finalCustomerPayment = customerPays;
        paymentBeforeAdvance = customerPays;
        remainingAfterAdvance = 0;
      }
    } else {
      finalCustomerPayment = customerPays;
      paymentBeforeAdvance = customerPays;
      remainingAfterAdvance = billTotal - customerPays;
    }
  }

  return {
    advanceApplied: Math.max(0, toMoney(advanceApplied)),
    advanceCreated: Math.max(0, toMoney(advanceCreated)),
    paymentBeforeAdvance: Math.max(0, toMoney(paymentBeforeAdvance)),
    finalCustomerPayment: Math.max(0, toMoney(finalCustomerPayment)),
    remainingAfterAdvance: Math.max(0, toMoney(remainingAfterAdvance)),
    isFullyPaidByAdvance,
  };
}

export function calculateAdvanceOnBillCreation(opts: {
  customerAdvanceBalance: number;
  billTotal: number;
}): {
  advanceApplied: number;
  remainingBalance: number;
  isFullyCovered: boolean;
} {
  const advanceBalance = toMoney(opts.customerAdvanceBalance);
  const billTotal = toMoney(opts.billTotal);

  if (advanceBalance <= 0) {
    return { advanceApplied: 0, remainingBalance: billTotal, isFullyCovered: false };
  }

  const advanceApplied = Math.min(advanceBalance, billTotal);
  const remainingBalance = Math.max(0, billTotal - advanceApplied);
  const isFullyCovered = remainingBalance <= BILL_EPSILON && advanceApplied > 0;

  return {
    advanceApplied: toMoney(advanceApplied),
    remainingBalance: toMoney(remainingBalance),
    isFullyCovered,
  };
}

export function calculateAdvanceOnMultiPayment(opts: {
  customerAdvanceBalance: number;
  totalPending: number;
  receivedAmount: number;
}): {
  advanceApplied: number;
  advanceCreated: number;
  amountNeededFromCustomer: number;
  finalCustomerPayment: number;
  excessAfterAllPaid: number;
} {
  const advanceBalance = toMoney(opts.customerAdvanceBalance);
  const totalPending = toMoney(opts.totalPending);
  const receivedAmount = toMoney(opts.receivedAmount);

  const totalAvailable = receivedAmount + advanceBalance;

  if (totalAvailable >= totalPending) {
    const excess = totalAvailable - totalPending;
    const advanceApplied = Math.min(advanceBalance, totalPending);
    const amountNeededFromCustomer = Math.max(0, totalPending - advanceBalance);
    const finalCustomerPayment = receivedAmount > amountNeededFromCustomer ? receivedAmount : amountNeededFromCustomer;
    // Only create new advance when customer overpays (cash exceeds what's needed after advance)
    const advanceCreated = receivedAmount > amountNeededFromCustomer
      ? receivedAmount - amountNeededFromCustomer
      : 0;
    return {
      advanceApplied: toMoney(advanceApplied),
      advanceCreated: toMoney(advanceCreated),
      amountNeededFromCustomer: toMoney(amountNeededFromCustomer),
      finalCustomerPayment: toMoney(finalCustomerPayment),
      excessAfterAllPaid: toMoney(excess),
    };
  } else {
    const amountNeededFromCustomer = Math.max(0, totalPending - advanceBalance);
    const advanceApplied = advanceBalance;
    return {
      advanceApplied: toMoney(advanceApplied),
      advanceCreated: 0,
      amountNeededFromCustomer: toMoney(amountNeededFromCustomer),
      finalCustomerPayment: toMoney(receivedAmount),
      excessAfterAllPaid: 0,
    };
  }
}

export async function fetchCustomerAdvanceBalance(customerId: string): Promise<number> {
  try {
    const result = await sanityClient.fetch(
      `*[_type == "user" && _id == $customerId][0]{ advanceBalance }`,
      { customerId }
    );
    return toMoney(result?.advanceBalance ?? 0);
  } catch {
    return 0;
  }
}

export async function updateCustomerAdvanceBalance(
  customerId: string,
  delta: number,
): Promise<number> {
  const currentBalance = await fetchCustomerAdvanceBalance(customerId);
  const newBalance = Math.max(0, currentBalance + delta);
  await sanityClient.patch(customerId).set({ advanceBalance: newBalance }).commit();
  return newBalance;
}

export async function createAdvanceTransaction(opts: {
  customerId: string;
  billId?: string;
  amount: number;
  type: "created" | "used";
  reason: string;
  reference: string;
  createdBy?: string;
}): Promise<void> {
  try {
    await sanityClient.create({
      _type: "advanceTransaction",
      customer: { _type: "reference", _ref: opts.customerId },
      bill: opts.billId ? { _type: "reference", _ref: opts.billId } : undefined,
      amount: toMoney(opts.amount),
      type: opts.type,
      reason: opts.reason,
      reference: opts.reference,
      createdBy: opts.createdBy || "system",
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[AdvanceTransaction] Failed to create:", err);
  }
}
