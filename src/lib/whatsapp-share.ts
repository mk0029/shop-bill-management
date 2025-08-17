export interface BillDetails {
  billNumber: string;
  customerName: string;
  customerPhone: string;
  billDate: string;
  dueDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
}

export async function shareBillOnWhatsApp(bill: BillDetails): Promise<void> {
  try {
    const message = `*Bill #${bill.billNumber}*\n\n` +
      `*Customer Details:*\n` +
      `Name: ${bill.customerName}\n` +
      `Phone: ${bill.customerPhone}\n\n` +
      `*Bill Details:*\n` +
      `Date: ${bill.billDate}\n` +
      `Due Date: ${bill.dueDate}\n\n` +
      `*Items:*\n` +
      bill.items.map(item => `• ${item.name} x${item.quantity} = ₹${item.total}`).join('\n') + '\n\n' +
      `*Summary:*\n` +
      `Subtotal: ₹${bill.subtotal}\n` +
      (bill.tax ? `Tax: ₹${bill.tax}\n` : '') +
      `*Total: ₹${bill.total}*\n\n` +
      (bill.notes ? `*Notes:*\n${bill.notes}\n` : '');

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${bill.customerPhone.replace(/\D/g, "")}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
  } catch (error) {
    console.error('Error sharing on WhatsApp:', error);
    throw error;
  }
}
