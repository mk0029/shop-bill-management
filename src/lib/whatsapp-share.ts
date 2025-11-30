/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from "sonner";

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
  discountAmount?: number;
  grandTotal: number;
  paidAmount?: number;
  balanceAmount?: number;
  paymentStatus?: string;
  notes?: string;
  internalNotes?: string;
  billId?: string;
}

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

  const computedTotal = Math.max(0, itemsTotal + additionalCharges - (bill.discountAmount || 0));
  const grandTotal = (typeof (bill as any).grandTotal === 'number' ? (bill as any).grandTotal : undefined) ?? computedTotal;

  const items =
    bill.items
      ?.map((item: any) => {
        // Prepare display name with category if available
        const baseName = item.productName || item.name || "Item";
        const category =
          item.categoryName ||
          item.category ||
          item.catogary ||
          item.product?.category?.name ||
          item.product?.category ||
          item.category?.name;
        const nameWithCategory = category ? `${baseName} (${category})` : baseName;

        const itemText = `• ${nameWithCategory}: ${item.quantity} ${item.unit || "pcs"} x ${currency}${(item.unitPrice || item.price).toFixed(2)} = ${currency}${(item.totalPrice || item.total).toFixed(2)}`;

        // Merge possible specification sources
        const rawA = item.specifications;
        const rawB = item.product?.specifications;

        // Normalize specifications into a readable string
        const normalizeSpecs = (spec: any): string => {
          if (!spec) return "";
          // If already a string, return trimmed
          if (typeof spec === "string") return spec.trim();
          // If array, join non-empty values
          if (Array.isArray(spec)) return spec.filter(Boolean).join(", ");
          // If object, format key: value pairs nicely
          if (typeof spec === "object") {
            const entries = Object.entries(spec)
              .filter(([, v]) => v !== undefined && v !== null && String(v) !== "");
            if (entries.length === 0) return "";
            return entries
              .map(([key, value]) => {
                // Format camelCase/PascalCase into spaced words
                const readableKey = key
                  .replace(/([a-z])([A-Z])/g, "$1 $2")
                  .replace(/^./, (s) => s.toUpperCase());
                // Convert boolean-like strings to Yes/No
                const valStr = String(value).toLowerCase();
                if (valStr === "true") value = "Yes";
                else if (valStr === "false") value = "No";
                return `${readableKey}: ${value}`;
              })
              .join(", ");
          }
          // Fallback to string coercion
          return String(spec);
        };

        const specTextParts: string[] = [];
        const a = normalizeSpecs(rawA);
        const b = normalizeSpecs(rawB);
        if (a) specTextParts.push(a);
        if (b && b !== a) specTextParts.push(b);

      // const specText = specTextParts.join(", ");
        // if (specText) {
        //   itemText += `\n  Specifications: ${specText}`;
        // }

        return itemText;
      })
      .join("\n") || "";

  // Generate login link if customer has auth details
  const passKey = bill.customerAuth?.secretKey || (bill as any)?.customer?.secretKey;
  const phone = bill.customer?.phone?.replace(/\D/g, "") || "";
  const siteUrl =
  (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_WEBSITE_URL) ||
  (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_SITE_URL) ||
  "";
const loginUrl = siteUrl || "https://jambh-ell.vercel.app/";
  const loginLink = passKey
    ? `${loginUrl}/login?phone=${phone}&passKey=${passKey}`
    : '';

  let message = `*Bill #${bill.billNumber || bill._id}*\n\n`;

  if (bill.customer) {
    const customerName = bill.customer.name ? sanitizeUserText(bill.customer.name) : 'Customer';
    message += `*Customer:* ${customerName}\n`;
    if (bill.customer.location) {
      message += `*Location:* ${bill.customer.location}\n`;
    }
    message += "\n";
  }

  if (bill.technician?.name) {
    const techName = sanitizeUserText(bill.technician.name);
    message += `*Technician:* ${techName}\n`;
  }

  if (bill.serviceType) {
    message += `*Service Type:* ${bill.serviceType.charAt(0).toUpperCase() + bill.serviceType.slice(1)}\n`;
  }
  const serviceDateValue = bill.serviceDate ?? bill.createdAt;
  if (serviceDateValue) {
    message += `*Service Date:* ${new Date(serviceDateValue).toLocaleDateString("en-IN")}\n`;
  }
  if (bill.priority) {
    message += `*Priority:* ${bill.priority.charAt(0).toUpperCase() + bill.priority.slice(1)}\n`;
  }
  message += "\n";
if (items) {
  message += `*Items:*\n${items}\n\n`;
}

  message += `*Pricing Details:*\n`;
  if (bill.subtotal) {
    message += `• Subtotal: ${currency}${bill.subtotal.toFixed(2)}\n`;
  }
  if (bill.repairFee && bill.repairFee > 0) {
    message += `• Repair Charges: ${currency}${bill.repairFee.toFixed(2)}\n`;
  }
  if (bill.laborCharges && bill.laborCharges > 0) {
    message += `• Labor Charges: ${currency}${bill.laborCharges.toFixed(2)}\n`;
  }
  if (bill.homeVisitFee && bill.homeVisitFee > 0) {
    message += `• Home Visit Fee: ${currency}${bill.homeVisitFee.toFixed(2)}\n`;
  }
  if (bill.transportationFee && bill.transportationFee > 0) {
    message += `• Transportation Fee: ${currency}${bill.transportationFee.toFixed(2)}\n`;
  }
  if (bill.taxAmount && bill.taxAmount > 0) {
    message += `• Tax: ${currency}${bill.taxAmount.toFixed(2)}\n`;
  }
  if (bill.discountAmount && bill.discountAmount > 0) {
    message += `• Discount: -${currency}${bill.discountAmount.toFixed(2)}\n`;
  }

  message += `\n*Total Amount: ${currency}${grandTotal.toFixed(2)}*\n`;

  if (bill.paidAmount && bill.paidAmount > 0) {
    message += `*Paid Amount: ${currency}${bill.paidAmount.toFixed(2)}*\n`;
    if (bill.balanceAmount) {
      message += `*Balance Amount: ${currency}${bill.balanceAmount.toFixed(2)}*\n`;
    }
  }

  if (bill.paymentStatus) {
    message += `*Payment Status:* ${bill.paymentStatus || 'Pending'}\n`;
  }


  message += "\n";

  if (bill.notes && bill.notes.trim()) {
    message += `*Notes:*\n${bill.notes}\n\n`;
  }

  if (bill.internalNotes && bill.internalNotes.trim()) {
    message += `*Additional Information:*\n${bill.internalNotes}\n\n`;
  }

  // Business/site link (from env) with fallback to provided website URL

  // Optional authentication details for customers to check bill
    // Add login link if available

    if (loginLink) {
      message += `\n*Login to your account:* ${loginLink}\n`;
      message += "Click the link above to login and view your bill details. Your credentials will be auto-filled.";
    }
    
  return message;
}

export async function shareBillOnWhatsApp(bill: BillDetails): Promise<void> {
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
  const whatsappUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}

export async function shareBillViaSMS(
  bill: BillDetails,
  recipientPhone?: string
): Promise<void> {
  try {
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
    toast.error("❌ Unable to open SMS composer on this device.");
  }
}
