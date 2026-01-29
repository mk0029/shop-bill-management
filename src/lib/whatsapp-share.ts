/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BillDetails {
  _id: string;
  billNumber?: string;
  customer: {
    name: string;
    phone?: string;
    location?: string;
  };
  technician?: {
    _id?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  // Optional authentication details to help customer check the bill
  customerAuth?: {
    customerId?: string;
    secretKey?: string;
  };
  serviceType?: string;
  serviceDate?: string;
  createdAt?: string;
  priority?: string;
  items: Array<{
    productName?: string;
    name?: string;
    quantity: number;
    unit?: string;
    unitPrice?: number;
    price?: number;
    totalPrice?: number;
    total?: number;
    specifications?: any;
    product?: { specifications?: any };
  }>;
  subtotal?: number;
  repairFee?: number;
  laborCharges?: number;
  homeVisitFee?: number;
  transportationFee?: number;
  taxAmount?: number;
  discount?: number;
  grandTotal: number;
  paidAmount?: number;
  balanceAmount?: number;
  paymentStatus?: string;
  notes?: string;
  internalNotes?: string;
  billId?: string;
};

// Sanitize displayed text by removing content enclosed in (), {}, [], quotes, and markdown * or **
const sanitizeUserText = (text: string): string => {
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
};

// Convert snake_case or kebab-case to human readable Title Case (e.g., "Fitting_wiring" -> "Fitting Wiring")
const humanize = (text?: string): string => {
  if (!text) return "";
  const replaced = text.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return replaced
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
};

export function generateWhatsAppMessage(bill: BillDetails, currency: string = '₹') {
  const itemsTotal =
    bill.items?.reduce(
      (total: number, item: any) => total + (item.totalPrice || item.total || 0),
      0
    ) || 0;

  const additionalCharges =
    (bill.homeVisitFee || 0) +
    (bill.transportationFee || 0) +
    (bill.repairFee || 0) +
    (bill.laborCharges || 0);

  const computedTotal = Math.max(0, itemsTotal + additionalCharges - (bill.discount || 0));

  // Use the computed total as the source of truth to ensure discount is deducted
  // even if an external grandTotal is provided without discount applied.
  const effectiveTotal = computedTotal;

  const passKey = bill.customerAuth?.secretKey || (bill as any)?.customer?.secretKey;
  const phone = bill.customer?.phone?.replace(/\D/g, "") || "";

  const siteUrl =
    (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_WEBSITE_URL) ||
    (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_SITE_URL) ||
    "";

  const loginUrl = siteUrl || "https://jambh-ell.vercel.app";
  const loginLink = passKey
    ? `${loginUrl}/login?phone=${phone}&passKey=${passKey}`
    : "";

  // Prepare items list
  const items =
    bill.items
      ?.map((item: any) => {
        const baseNameRaw = item.productName || item.name || "Item";
        const baseName = humanize(baseNameRaw);

        const categoryRaw =
          item.categoryName ||
          item.category ||
          item.catogary ||
          item.product?.category?.name ||
          item.product?.category ||
          item.category?.name;

        const category = humanize(categoryRaw);

        const nameWithCategory = category ? `${baseName} (${category})` : baseName;

        const unit = humanize(item.unit) || "pcs";

        return `• ${nameWithCategory}: ${item.quantity} ${unit} x ${currency}${(
          item.unitPrice || item.price
        ).toFixed(2)} = ${currency}${(item.totalPrice || item.total).toFixed(2)}`;
      })
      .join("\n") || "";

  // Final Total / Paid / Balance logic
  const total = effectiveTotal || 0;
  const paid = bill.paidAmount || 0;
  const rawBalance = total - paid;
  const balance = paid >= total ? 0 : Math.max(0, rawBalance);

  const paymentStatus = (bill.paymentStatus || "Pending").toUpperCase();

  // --- BUILD FINAL MESSAGE --- //
  let message = `*Bill Id :- ${bill.billNumber || bill._id}*\n\n`;

  // Customer info should NOT display – as per your instruction (commented)
  // if (bill.customer?.name) message += `*Customer:* ${sanitizeUserText(bill.customer.name)}\n`;
  // if (bill.customer?.location) message += `*Location:* ${bill.customer.location}\n\n`;

  if (bill.technician?.name) {
    message += `*Technician:* ${sanitizeUserText(bill.technician.name)}\n`;
  }

  if (bill.serviceType) {
    message += `*Service:* ${humanize(bill.serviceType)}\n`;
  }

  const serviceDateValue = bill.serviceDate ?? bill.createdAt;
  if (serviceDateValue) {
    message += `*Service Date:* ${new Date(serviceDateValue).toLocaleDateString("en-IN")}\n`;
  }

  if (bill.priority) {
    message += `*Priority:* ${humanize(bill.priority)}\n`;
  }

  message += `\n*Items:*\n${items}\n`;

  message += `\n*Pricing Details:*\n`;
  if ((bill.discount || 0) > 0) {
    message += `• *Discount:* *-${currency}${(bill.discount || 0).toFixed(2)}*\n`;
  }
  message += `• Total: ${currency}${total.toFixed(2)}\n`;
  message += `• Paid: ${currency}${paid.toFixed(2)}\n`;
  message += `• Balance: ${currency}${balance.toFixed(2)}\n`;

  message += `\n*Payment Status:* ${paymentStatus}\n`;

  if (bill.notes && bill.notes.trim()) {
    message += `\n*Notes:*\n${bill.notes}\n`;
  }

  if (bill.internalNotes && bill.internalNotes.trim()) {
    message += `\n*Additional Information:*\n${bill.internalNotes}\n`;
  }

  if (loginLink) {
    message += `\n*Login to your account:* ${loginLink}\n`;
    message += `Your bill details will be auto-loaded.`;
  }

  return message;
}

export async function shareBillOnWhatsApp(bill: BillDetails): Promise<void> {
  const [{ toast }, { shareToWhatsAppApp }] = await Promise.all([
    import("sonner"),
    import("@/lib/whatsapp-app-share"),
  ]);
  let phone = bill.customer?.phone?.replace(/\D/g, "") || "";

  if (!phone) {
    toast.error(
      "❌ Unable to share bill - Customer's phone number not found. Please add a phone number to the customer's profile."
    );
    return;
  }

  // If number length > 10, trim to last 10 digits
  if (phone.length > 10) {
    phone = phone.slice(-10);
  }

  const message = generateWhatsAppMessage(bill);
  await shareToWhatsAppApp({ text: message, phone });
}

export async function shareBillViaSMS(
  bill: BillDetails,
  recipientPhone?: string
): Promise<void> {
  try {
    const { toast } = await import("sonner");
    // Prefer explicit recipientPhone, fallback to bill.customer.phone
    let phone = (recipientPhone || bill.customer?.phone || "").replace(/\D/g, "");

    // If number length > 10, trim to last 10 digits (common case with +91...)
    if (phone.length > 10) {
      phone = phone.slice(-10);
    }

    const message = generateWhatsAppMessage(bill);
    const encoded = encodeURIComponent(message);

    // Construct sms: URL. Use just the 10-digit local number per user's request (no 91 prefix)
    const smsUrl = phone ? `sms:${phone}?body=${encoded}` : `sms:?body=${encoded}`;

    // Use location change for better handling on mobile devices
    window.location.href = smsUrl;
  } catch (error) {
    console.error("Failed to open SMS composer:", error);
    try {
      const { toast } = await import("sonner");
      toast.error("❌ Unable to open SMS composer on this device.");
    } catch {}
  }
}