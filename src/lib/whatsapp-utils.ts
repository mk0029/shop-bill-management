// Enhanced WhatsApp Utilities with Multi-Device Support

export interface WhatsAppDevice {
  deviceName: string;
  phoneNumber: string;
  userId: string;
  passKey: string;
  apiEndpoint?: string;
  isActive: boolean;
  priority: number;
  maxDailyMessages: number;
  currentDailyCount: number;
  lastUsed?: string;
}

export interface WhatsAppConfig {
  configName: string;
  isActive: boolean;
  businessInfo: {
    businessName: string;
    businessAddress: string;
    businessEmail?: string;
    businessWebsite?: string;
    businessLogo?: string;
  };
  devices: WhatsAppDevice[];
  messageTemplate: {
    billTemplate: string;
    customFields?: Array<{
      fieldName: string;
      fieldValue: string;
      includeInBill: boolean;
    }>;
  };
  loadBalancing: {
    strategy: "roundRobin" | "priority" | "leastUsed" | "random";
    failoverEnabled: boolean;
    retryAttempts: number;
    retryDelay: number;
  };
  analytics: {
    trackDelivery: boolean;
    trackReads: boolean;
    generateReports: boolean;
  };
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
  userId?: string;
  passKey?: string;
}

export interface MessageDeliveryStatus {
  messageId: string;
  deviceUsed: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  error?: string;
}

// Default configuration - can be updated from settings
export const defaultWhatsAppConfig: WhatsAppConfig = {
  configName: "Default Configuration",
  isActive: true,
  businessInfo: {
    businessName: "Your Business Name",
    businessAddress: "Your Business Address",
    businessEmail: "[business-email]",
    businessWebsite: "www.yourbusiness.com",
  },
  devices: [
    {
      deviceName: "Primary Device",
      phoneNumber: "+917015493276",
      userId: "default_user_id",
      passKey: "default_pass_key",
      isActive: true,
      priority: 1,
      maxDailyMessages: 1000,
      currentDailyCount: 0,
    },
  ],
  messageTemplate: {
    billTemplate: `*{{businessName}}*
*Bill #{{billNumber}}*

*Customer Details:*
Name: {{customerName}}
Phone: {{customerPhone}}

*Bill Details:*
Date: {{billDate}}
Due Date: {{dueDate}}

*Items:*
{{itemsList}}

*Summary:*
Subtotal: ₹{{subtotal}}
{{taxLine}}*Total: ₹{{total}}*

{{notes}}
*Contact:*
{{businessName}}
{{businessAddress}}
{{businessEmail}}
{{businessWebsite}}

*Authentication:*
Pass Key: {{passKey}}`,
  },
  loadBalancing: {
    strategy: "priority",
    failoverEnabled: true,
    retryAttempts: 3,
    retryDelay: 5,
  },
  analytics: {
    trackDelivery: true,
    trackReads: false,
    generateReports: true,
  },
};

// Device selection logic
export function selectOptimalDevice(
  config: WhatsAppConfig
): WhatsAppDevice | null {
  const activeDevices = config.devices.filter(
    (device) =>
      device.isActive && device.currentDailyCount < device.maxDailyMessages
  );

  if (activeDevices.length === 0) {
    return null;
  }

  switch (config.loadBalancing.strategy) {
    case "priority":
      return activeDevices.sort((a, b) => a.priority - b.priority)[0];

    case "leastUsed":
      return activeDevices.sort(
        (a, b) => a.currentDailyCount - b.currentDailyCount
      )[0];

    case "random":
      return activeDevices[Math.floor(Math.random() * activeDevices.length)];

    case "roundRobin":
    default:
      // Simple round-robin based on last used timestamp
      return activeDevices.sort((a, b) => {
        const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return aTime - bTime;
      })[0];
  }
}

// Template processing function
export function processMessageTemplate(
  template: string,
  bill: BillDetails,
  config: WhatsAppConfig,
  device: WhatsAppDevice
): string {
  const itemsList = bill.items
    .map((item) => `• ${item.name} x${item.quantity} = ₹${item.total}`)
    .join("\n");

  const taxLine = bill.tax ? `Tax: ₹${bill.tax}\n` : "";
  const notes = bill.notes ? `*Notes:*\n${bill.notes}\n` : "";

  const variables = {
    businessName: config.businessInfo.businessName,
    billNumber: bill.billNumber,
    customerName: bill.customerName,
    customerPhone: bill.customerPhone,
    userId: bill.userId || device.userId,
    passKey: bill.passKey || device.passKey,
    billDate: bill.billDate,
    dueDate: bill.dueDate,
    itemsList,
    subtotal: bill.subtotal.toString(),
    taxLine,
    total: bill.total.toString(),
    notes,
    businessAddress: config.businessInfo.businessAddress,
    businessEmail: config.businessInfo.businessEmail
      ? `Email: ${config.businessInfo.businessEmail}`
      : "",
    businessWebsite: config.businessInfo.businessWebsite
      ? `Website: ${config.businessInfo.businessWebsite}`
      : "",
  };

  let processedMessage = template;

  // Replace all template variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    processedMessage = processedMessage.replace(regex, value || "");
  });

  // Process custom fields
  if (config.messageTemplate.customFields) {
    config.messageTemplate.customFields
      .filter((field) => field.includeInBill)
      .forEach((field) => {
        const regex = new RegExp(`{{${field.fieldName}}}`, "g");
        processedMessage = processedMessage.replace(regex, field.fieldValue);
      });
  }

  return processedMessage;
}

export function formatBillForWhatsApp(
  bill: BillDetails,
  config: WhatsAppConfig = defaultWhatsAppConfig,
  device?: WhatsAppDevice
): string {
  const selectedDevice = device || selectOptimalDevice(config);

  if (!selectedDevice) {
    throw new Error("No active WhatsApp device available");
  }

  const billTemplate =
    config.messageTemplate?.billTemplate ||
    defaultWhatsAppConfig.messageTemplate.billTemplate;

  if (!billTemplate) {
    // This is a safeguard in case the default config is also broken
    throw new Error(
      `WhatsApp template 'billTemplate' not found in current or default configurations.`
    );
  }

  return processMessageTemplate(billTemplate, bill, config, selectedDevice);
}

// Enhanced message sending with device management
export async function sendWhatsAppMessage(
  bill: BillDetails,
  config: WhatsAppConfig = defaultWhatsAppConfig
): Promise<MessageDeliveryStatus> {
  const device = selectOptimalDevice(config);

  if (!device) {
    throw new Error("No active WhatsApp device available");
  }

  const message = formatBillForWhatsApp(bill, config, device);
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Always use the wa.me link for sending messages
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${bill.customerPhone.replace(
      /\D/g,
      ""
    )}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");

    // Update device usage
    await updateDeviceUsage(device.deviceName, config);

    return {
      messageId,
      deviceUsed: device.deviceName,
      status: "sent", // Status indicates the message is ready for manual sending
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      messageId,
      deviceUsed: device.deviceName,
      status: "failed",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Legacy function for backward compatibility
export function shareBillOnWhatsApp(
  bill: BillDetails,
  config: WhatsAppConfig = defaultWhatsAppConfig
): void {
  sendWhatsAppMessage(bill, config).catch(console.error);
}

export function shareBillAsPDF(
  bill: BillDetails,
  config: WhatsAppConfig = defaultWhatsAppConfig
): void {
  // This would generate a PDF and share it
  // For now, we'll just share the formatted message
  shareBillOnWhatsApp(bill, config);
}

// Device management functions
async function updateDeviceUsage(
  deviceName: string,
  config: WhatsAppConfig
): Promise<void> {
  // In a real app, this would update the database/Sanity
  const device = config.devices.find((d) => d.deviceName === deviceName);
  if (device) {
    device.currentDailyCount += 1;
    device.lastUsed = new Date().toISOString();
  }
}

function getNextAvailableDevice(
  config: WhatsAppConfig,
  excludeDevice: WhatsAppDevice
): WhatsAppDevice | null {
  return (
    config.devices.find(
      (device) =>
        device.isActive &&
        device.deviceName !== excludeDevice.deviceName &&
        device.currentDailyCount < device.maxDailyMessages
    ) || null
  );
}

// Configuration management functions
export async function fetchWhatsAppConfigFromSanity(): Promise<
  WhatsAppConfig[]
> {
  try {
    const { SanityWhatsAppService } = await import("./sanity-whatsapp-service");
    return await SanityWhatsAppService.fetchConfigurations();
  } catch (error) {
    console.error("Error fetching from Sanity, using default config:", error);
    return [defaultWhatsAppConfig];
  }
}

export async function updateWhatsAppConfig(
  configId: string,
  updates: Partial<WhatsAppConfig>
): Promise<void> {
  try {
    const { SanityWhatsAppService } = await import("./sanity-whatsapp-service");
    await SanityWhatsAppService.updateConfiguration(configId, updates);
  } catch (error) {
    console.error("Error updating Sanity config:", error);
    throw error;
  }
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    const { getWhatsAppConfigFromSanity } = await import(
      "./sanity-whatsapp-service"
    );
    const config = await getWhatsAppConfigFromSanity();
    return config || defaultWhatsAppConfig;
  } catch (error) {
    console.error("Error getting config from Sanity, using default:", error);
    return { ...defaultWhatsAppConfig };
  }
}

// Analytics functions
export function getDeviceAnalytics(config: WhatsAppConfig) {
  return config.devices.map((device) => ({
    deviceName: device.deviceName,
    phoneNumber: device.phoneNumber,
    isActive: device.isActive,
    dailyUsage: device.currentDailyCount,
    maxDaily: device.maxDailyMessages,
    usagePercentage: (device.currentDailyCount / device.maxDailyMessages) * 100,
    lastUsed: device.lastUsed,
  }));
}

export function resetDailyCounters(config: WhatsAppConfig): WhatsAppConfig {
  return {
    ...config,
    devices: config.devices.map((device) => ({
      ...device,
      currentDailyCount: 0,
    })),
  };
}
