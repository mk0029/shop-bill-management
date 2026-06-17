import { sanitizeUserText } from "@/constants/defaults";

type BillCreatedInput = {
  amount: number;
  customerName?: string;
};

export function formatCurrencyAmount(amount: number) {
  const value = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function customerDisplayName(name?: string) {
  return sanitizeUserText(String(name || "")).trim() || "Customer";
}

export function billCreatedCustomerNotification(input: BillCreatedInput) {
  const customerName = customerDisplayName(input.customerName);

  return {
    title: "Bill Created",
    body: `Dear ${customerName}, your bill of ₹${formatCurrencyAmount(input.amount)} has been created.`,
    type: "bill_created" as const,
    targetRole: "customer" as const,
  };
}

export function billCreatedAdminNotification(input: BillCreatedInput) {
  const customerName = customerDisplayName(input.customerName);

  return {
    title: "New Bill Created",
    body: `${customerName} bill created for ₹${formatCurrencyAmount(input.amount)}`,
    type: "admin_bill_created" as const,
    targetRole: "admin" as const,
  };
}
