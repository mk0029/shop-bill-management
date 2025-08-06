// WhatsApp Sharing Utilities

export interface WhatsAppConfig {
  phoneNumber: string;
  businessName: string;
  businessAddress: string;
  businessEmail?: string;
  businessWebsite?: string;
}

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

// Default configuration - can be updated from settings
export const defaultWhatsAppConfig: WhatsAppConfig = {
  phoneNumber: "+917015493276", // Default business number
  businessName: "Your Business Name",
  businessAddress: "Your Business Address",
  businessEmail: "business@example.com",
  businessWebsite: "www.yourbusiness.com",
};

export function formatBillForWhatsApp(bill: BillDetails, config: WhatsAppConfig = defaultWhatsAppConfig): string {
  const itemsList = bill.items.map(item => 
    `• ${item.name} x${item.quantity} = ₹${item.total}`
  ).join('\n');

  const message = `*${config.businessName}*
*Bill #${bill.billNumber}*

*Customer Details:*
Name: ${bill.customerName}
Phone: ${bill.customerPhone}

*Bill Details:*
Date: ${bill.billDate}
Due Date: ${bill.dueDate}

*Items:*
${itemsList}

*Summary:*
Subtotal: ₹${bill.subtotal}
${bill.tax ? `Tax: ₹${bill.tax}\n` : ''}*Total: ₹${bill.total}*

${bill.notes ? `*Notes:*\n${bill.notes}\n` : ''}
*Contact:*
${config.businessName}
${config.businessAddress}
${config.businessEmail ? `Email: ${config.businessEmail}\n` : ''}${config.businessWebsite ? `Website: ${config.businessWebsite}` : ''}`;

  return message;
}

export function shareBillOnWhatsApp(bill: BillDetails, config: WhatsAppConfig = defaultWhatsAppConfig): void {
  const message = formatBillForWhatsApp(bill, config);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${config.phoneNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
}

export function shareBillAsPDF(bill: BillDetails, config: WhatsAppConfig = defaultWhatsAppConfig): void {
  // This would generate a PDF and share it
  // For now, we'll just share the formatted message
  shareBillOnWhatsApp(bill, config);
}

// Function to update WhatsApp configuration
export function updateWhatsAppConfig(newConfig: Partial<WhatsAppConfig>): void {
  // In a real app, this would save to localStorage or backend
  Object.assign(defaultWhatsAppConfig, newConfig);
}

// Function to get current WhatsApp configuration
export function getWhatsAppConfig(): WhatsAppConfig {
  return { ...defaultWhatsAppConfig };
} 