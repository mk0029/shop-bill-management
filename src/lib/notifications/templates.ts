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

export function billCreatedCustomerNotification(input: BillCreatedInput) {
  return {
    title: "Bill Created",
    body: `Your bill of ₹${formatCurrencyAmount(input.amount)} has been created.`,
    type: "bill_created" as const,
    targetRole: "customer" as const,
  };
}

export function billCreatedAdminNotification(input: BillCreatedInput) {
  return {
    title: "New Bill Created",
    body: `${input.customerName || "Customer"} bill created for ₹${formatCurrencyAmount(input.amount)}`,
    type: "admin_bill_created" as const,
    targetRole: "admin" as const,
  };
}
