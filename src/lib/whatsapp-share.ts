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

        const allSpecifications = {
          ...(item.specifications || {}),
          ...(item.product?.specifications || {}),
        };

        if (Object.keys(allSpecifications).length > 0) {
          const specs = Object.entries(allSpecifications)
            .map(([key, value]) => {
              const readableKey = key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())
                .replace(/([a-z])([A-Z])/g, "$1 $2");
              return `${readableKey}: ${value}`;
            })
            .join(", ");
          itemText += `\n  Specifications: ${specs}`;
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

  message += `Thank you for choosing our services!\n`;
  if (bill.billId) {
    message += `Bill ID: ${bill.billId}`;
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
