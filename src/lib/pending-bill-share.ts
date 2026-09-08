/* eslint-disable @typescript-eslint/no-explicit-any */

import { shareToWhatsAppApp } from "@/lib/whatsapp-app-share";
import { formatDayDate } from "@/lib/date-time";

export interface PendingBillShareInput {
  customer: { name?: string; phone?: string };
  pendingBillsCount: number;
  pendingAmount: number;
  currency?: string; // default ₹
  customerAuth?: { secretKey?: string };
  pendingBills?: Array<{
    billId?: string;
    billNumber?: string;
    amount: number;
    service?: string;
    serviceDate?: string;
    createdAt?: string;
    note?: string;
    technician?: { name?: string } | string;
    items?: Array<{
      name?: string;
      qty?: number;
      rate?: number;
      amount?: number;
    }>;
  }>;
}

function sanitizeUserText(text: string): string {
  try {
    let s = text ?? "";
    let prev: string;
    do {
      prev = s;
      s = s.replace(/\([^()]*\)/g, "");
      s = s.replace(/\{[^{}]*\}/g, "");
      s = s.replace(/\[[^\[\]]*\]/g, "");
    } while (s !== prev);
    s = s.replace(/[(){}\[\]]/g, "");
    s = s.replace(/"[^"]*"/g, "");
    s = s.replace(/'[^']*'/g, "");
    s = s.replace(/\*\*.*?\*\*/g, "");
    s = s.replace(/\*.*?\*/g, "");
    s = s.replace(/[\\/]/g, "");
    s = s.replace(/\s{2,}/g, " ").trim();
    return s;
  } catch {
    return "";
  }
}

function normalizePhone(raw?: string): string {
  return (raw || "").replace(/\D/g, "");
}

function formatCurrency(amount: number, currency = "₹"): string {
  const n = Number(amount || 0);
  return `${currency}${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatBillDate(d?: string): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return formatDayDate(date);
}

export function generatePendingBillsMessage({
  customer,
  pendingBillsCount,
  pendingAmount,
  currency = "₹",
  customerAuth,
  pendingBills,
}: PendingBillShareInput): string {
  const rawName = (customer?.name || "Customer").toString().trim();
  const name = sanitizeUserText(rawName);

  const totalAmountStr = formatCurrency(pendingAmount, currency);
  const countStr = `${pendingBillsCount}`;

  const phone = normalizePhone(customer?.phone);
  const siteUrl =
    (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_WEBSITE_URL) ||
    (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_SITE_URL) ||
    "";
  const loginBase = siteUrl || "https://jambh-ell.vercel.app";
  const passKey = customerAuth?.secretKey?.toString().trim();
  const loginLink = passKey && phone ? `${loginBase}/login?phone=${phone}&passKey=${encodeURIComponent(passKey)}` : "";

  const lines: string[] = [];
  lines.push(`Dear ${name},`);
  lines.push("");
  lines.push("🔔 Payment Reminder – Pending Bills");
  lines.push("");
  lines.push(`We noticed that you have ${countStr} pending bills with us.`);
  lines.push("Here’s a quick summary:");
  lines.push("");
  lines.push(`• Total Pending Amount: ${totalAmountStr}`);
  lines.push(`• Number of Pending Bills: ${countStr}`);
  lines.push("");

  if (Array.isArray(pendingBills) && pendingBills.length > 0) {
    lines.push("🧾 Bill Details:");
    pendingBills.forEach((b, idx) => {
      const idxNum = idx + 1;
      const idStr = b.billNumber || b.billId || "-";
      const amtStr = formatCurrency(b.amount, currency);
      const svc = b.service ? sanitizeUserText(b.service) : "-";
      const dt =
        formatBillDate((b as any).createdAt) ||
        formatBillDate(b.serviceDate) ||
        "-";
      const techName =
        typeof (b as any).technician === "string"
          ? sanitizeUserText(String((b as any).technician))
          : sanitizeUserText((((b as any).technician?.name as string) || ""));

      lines.push(`${idxNum}) Bill ID: ${idStr}`);
      lines.push(`   Amount: ${amtStr}`);
      lines.push(`   Service: ${svc}`);
      lines.push(`   Date: ${dt}`);
      if (techName) {
        lines.push(`   Technician: ${techName}`);
      }

      if (Array.isArray((b as any).items) && (b as any).items.length > 0) {
        lines.push(`   Items:`);
        (b as any).items.forEach((it: any) => {
          const iname = it?.name ? sanitizeUserText(String(it.name)) : "Item";
          const qty = typeof it?.qty === "number" ? it.qty : undefined;
          const rateStr =
            typeof it?.rate === "number"
              ? formatCurrency(it.rate, currency)
              : undefined;
          const iAmtStr =
            typeof it?.amount === "number"
              ? formatCurrency(it.amount, currency)
              : undefined;
          const parts: string[] = [iname];
          if (qty != null) parts.push(`x${qty}`);
          if (rateStr) parts.push(`@ ${rateStr}`);
          if (iAmtStr) parts.push(`= ${iAmtStr}`);
          lines.push(`     - ${parts.join(" ")}`);
        });
      }

      const note = (b as any).note ? sanitizeUserText(String((b as any).note)) : "";
      if (note) {
        lines.push(`   Note: ${note}`);
      }

      lines.push("");
    });
  }

  lines.push("💡 Please clear the pending amount at your earliest convenience.");
  lines.push("Timely payment helps us continue uninterrupted service.");
  lines.push("");

  if (loginLink) {
    lines.push("🔐 View & pay your bills securely here:");
    lines.push(loginLink);
    lines.push("Your account is private — only you can access your billing info.");
    lines.push("");
  }

  lines.push("Thank you for choosing us 🙏");
  lines.push("— Jambh Electrical Services");

  return lines.join("\n");
}

export async function sharePendingBills(input: PendingBillShareInput): Promise<string> {
  const message = generatePendingBillsMessage(input);

  // Open pre-filled WhatsApp chat via wa.me (customer's number if available)
  const phone = normalizePhone(input.customer?.phone);
  try {
    await shareToWhatsAppApp({ text: message, phone });
  } catch {
    // Swallow errors in share path to avoid UI disruption
  }

  return message;
}
