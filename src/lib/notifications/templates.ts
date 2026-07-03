import { formatCurrency } from "@/lib/notifications/template-engine";

type BillCreatedInput = {
  amount: number;
  customerName?: string;
  customerNickname?: string;
};

export function formatCurrencyAmount(amount: number) {
  return formatCurrency(Number.isFinite(amount) ? amount : 0).replace(/^\u20b9/, "");
}

function customerDisplayName(input: BillCreatedInput) {
  return input.customerName?.trim() || "Customer";
}

export function billCreatedCustomerNotification(input: BillCreatedInput) {
  const customerName = customerDisplayName(input);

  return {
    title: "Bill Created",
    body: `Dear ${customerName}, your bill of ${formatCurrency(input.amount)} has been created.`,
    type: "bill_created" as const,
    targetRole: "customer" as const,
  };
}

export function billCreatedAdminNotification(input: BillCreatedInput) {
  const customerName = customerDisplayName(input);

  return {
    title: "New Bill Created",
    body: `${customerName} bill created for ${formatCurrency(input.amount)}`,
    type: "admin_bill_created" as const,
    targetRole: "admin" as const,
  };
}
