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

  const grandTotal = bill.balanceAmount || itemsTotal + additionalCharges;

  const items =
    bill.items
      ?.map((item: any) => {
        let itemText = `• ${item.productName || item.name}: ${item.quantity} ${item.unit || "pcs"} x ${currency}${(item.unitPrice || item.price).toFixed(2)} = ${currency}${(item.totalPrice || item.total).toFixed(2)}`;

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
                let readableKey = key
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

        const specText = specTextParts.join(", ");
        if (specText) {
          itemText += `\n  Specifications: ${specText}`;
        }

        return itemText;
      })
      .join("\n") || "";

  let message = `*Bill #${bill.billNumber || bill._id}*\n\n`;

  if (bill.customer) {
    message += `*Customer:* ${bill.customer.name}\n`;
    if (bill.customer.location) {
      message += `*Location:* ${bill.customer.location}\n`;
    }
    message += "\n";
  }

  if (bill.serviceType) {
    message += `*Service Type:* ${bill.serviceType.charAt(0).toUpperCase() + bill.serviceType.slice(1)}\n`;
  }
  if (bill.serviceDate || bill.createdAt) {
    message += `*Service Date:* ${new Date(bill.serviceDate || bill.createdAt).toLocaleDateString("en-IN")}\n`;
  }
  if (bill.priority) {
    message += `*Priority:* ${bill.priority.charAt(0).toUpperCase() + bill.priority.slice(1)}\n`;
  }
  message += "\n";

  message += `*Items:*\n${items}\n\n`;

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
    message += `*Payment Status:* ${bill.paymentStatus.charAt(0).toUpperCase() + bill.paymentStatus.slice(1)}\n`;
  }
  message += "\n";

  if (bill.notes && bill.notes.trim()) {
    message += `*Notes:*\n${bill.notes}\n\n`;
  }

  if (bill.internalNotes && bill.internalNotes.trim()) {
    message += `*Additional Information:*\n${bill.internalNotes}\n\n`;
  }

  // Business/site link (from env) with fallback to provided website URL
  const siteUrl =
    (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_WEBSITE_URL) ||
    (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_SITE_URL) ||
    "";
  const loginUrl = siteUrl || "https://jambh-ell.vercel.app/";

  message += `Thank you for choosing our services!\n`;
  message += `Login: ${loginUrl}\n`;
  if (bill.billId) {
    message += `Bill ID: ${bill.billId}\n`;
  }

  // Optional authentication details for customers to check bill
  const passKey = bill.customerAuth?.secretKey || (bill as any)?.customer?.secretKey;
  if (passKey) {
    message += `\n*Authentication:*\n`;
    message += `Secret Key: ${passKey}\n`;
    message += `Use this Secret Key and your mobile number to log in at ${loginUrl}\n`;
  }

  return message;
}

export async function shareBillOnWhatsApp(bill: BillDetails): Promise<void> {
  const phone = bill.customer?.phone?.replace(/\D/g, "") || "";
  if (!phone) {
    toast.error(
      "❌ Unable to share bill - Customer's phone number not found. Please add a phone number to the customer's profile."
    );
    return;
  }

  const message = generateWhatsAppMessage(bill);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}
