/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from "sonner";

export interface PendingBillShareInput {
  customer: { name?: string; phone?: string };
  pendingBillsCount: number;
  pendingAmount: number;
  currency?: string; // default ₹
}

export function generatePendingBillsMessage({
  customer,
  pendingBillsCount,
  pendingAmount,
  currency = "₹",
}: PendingBillShareInput) {
  const name = (customer?.name || "Customer").toString().trim();
  const amountStr = `${currency}${Number(pendingAmount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

  const countStr = `${pendingBillsCount}`;

  const lines: string[] = [];
  lines.push(`Dear ${name},`);
  lines.push(
    `You currently have ${countStr} pending bill(s) with a total balance of ${amountStr}.`
  );
  lines.push(
    `This is a gentle reminder to complete the payment at your convenience.`
  );
  lines.push(`Thank you for your cooperation.`);

  return lines.join("\n");
}

function normalizePhone(phone?: string): string {
  try {
    const digits = (phone || "").replace(/\D/g, "");
    if (!digits) return "";
    // Trim to last 10 digits for India local numbers
    return digits.length > 10 ? digits.slice(-10) : digits;
  } catch {
    return "";
  }
}

export async function sharePendingBills({
  customer,
  pendingBillsCount,
  pendingAmount,
  currency = "₹",
}: PendingBillShareInput) {
  const message = generatePendingBillsMessage({
    customer,
    pendingBillsCount,
    pendingAmount,
    currency,
  });

  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share({ text: message });
      return;
    }
  } catch (err) {
    // If Web Share fails, continue to WhatsApp fallback
  }

  // WhatsApp fallback (prefer sending to customer's number if present)
  const phone = normalizePhone(customer?.phone);
  const base = phone ? `https://wa.me/91${phone}` : `https://wa.me/`;
  const url = `${base}?text=${encodeURIComponent(message)}`;

  try {
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  } catch (err) {
    console.error("Failed to open WhatsApp:", err);
    toast.error("❌ Unable to open WhatsApp on this device.");
  }
}
