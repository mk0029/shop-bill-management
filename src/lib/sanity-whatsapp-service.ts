// Sanity WhatsApp Configuration Service

import { WhatsAppConfig, WhatsAppDevice } from "./whatsapp-utils";
import { sanityClient } from "./sanity";

export interface SanityWhatsAppConfig {
  _id: string;
  _type: "whatsappConfig";
  configName: string;
  isActive: boolean;
  businessInfo: {
    businessName: string;
    businessAddress: string;
    businessEmail?: string;
    businessWebsite?: string;
    businessLogo?: {
      asset: {
        _ref: string;
        _type: "reference";
      };
    };
  };
  devices: Array<{
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
  }>;
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
  createdAt: string;
  updatedAt: string;
}

// GROQ queries for fetching WhatsApp configurations
const WHATSAPP_CONFIG_QUERY = `
  *[_type == "whatsappConfig" && isActive == true] | order(priority asc) {
    _id,
    configName,
    isActive,
    businessInfo,
    devices,
    messageTemplate,
    loadBalancing,
    analytics,
    createdAt,
    updatedAt
  }
`;

const SINGLE_WHATSAPP_CONFIG_QUERY = `
  *[_type == "whatsappConfig" && _id == $configId][0] {
    _id,
    configName,
    isActive,
    businessInfo,
    devices,
    messageTemplate,
    loadBalancing,
    analytics,
    createdAt,
    updatedAt
  }
`;

// Transform Sanity data to application format
function transformSanityToWhatsAppConfig(
  sanityConfig: SanityWhatsAppConfig
): WhatsAppConfig {
  return {
    configName: sanityConfig.configName,
    isActive: sanityConfig.isActive,
    businessInfo: {
      businessName: sanityConfig.businessInfo.businessName,
      businessAddress: sanityConfig.businessInfo.businessAddress,
      businessEmail: sanityConfig.businessInfo.businessEmail,
      businessWebsite: sanityConfig.businessInfo.businessWebsite,
      businessLogo: sanityConfig.businessInfo.businessLogo?.asset._ref,
    },
    devices: sanityConfig.devices.map((device) => ({
      deviceName: device.deviceName,
      phoneNumber: device.phoneNumber,
      userId: device.userId,
      passKey: device.passKey,
      apiEndpoint: device.apiEndpoint,
      isActive: device.isActive,
      priority: device.priority,
      maxDailyMessages: device.maxDailyMessages,
      currentDailyCount: device.currentDailyCount,
      lastUsed: device.lastUsed,
    })),
    messageTemplate: {
      billTemplate: sanityConfig.messageTemplate.billTemplate,
      customFields: sanityConfig.messageTemplate.customFields,
    },
    loadBalancing: sanityConfig.loadBalancing,
    analytics: sanityConfig.analytics,
  };
}

// Transform application data to Sanity format
function transformWhatsAppConfigToSanity(
  config: WhatsAppConfig,
  configId?: string
): Partial<SanityWhatsAppConfig> {
  return {
    ...(configId && { _id: configId }),
    _type: "whatsappConfig",
    configName: config.configName,
    isActive: config.isActive,
    businessInfo: {
      businessName: config.businessInfo.businessName,
      businessAddress: config.businessInfo.businessAddress,
      businessEmail: config.businessInfo.businessEmail,
      businessWebsite: config.businessInfo.businessWebsite,
      ...(config.businessInfo.businessLogo && {
        businessLogo: {
          asset: {
            _ref: config.businessInfo.businessLogo,
            _type: "reference",
          },
        },
      }),
    },
    devices: config.devices,
    messageTemplate: config.messageTemplate,
    loadBalancing: config.loadBalancing,
    analytics: config.analytics,
    updatedAt: new Date().toISOString(),
  };
}

// Service class for WhatsApp configuration management
export class SanityWhatsAppService {
  // Fetch all active WhatsApp configurations
  static async fetchConfigurations(): Promise<WhatsAppConfig[]> {
    try {
      const sanityConfigs = await sanityClient.fetch<SanityWhatsAppConfig[]>(
        WHATSAPP_CONFIG_QUERY
      );
      return sanityConfigs.map(transformSanityToWhatsAppConfig);
    } catch (error) {
      console.error("Error fetching WhatsApp configurations:", error);
      throw new Error("Failed to fetch WhatsApp configurations");
    }
  }

  // Fetch a single configuration by ID
  static async fetchConfiguration(
    configId: string
  ): Promise<WhatsAppConfig | null> {
    try {
      const sanityConfig = await sanityClient.fetch<SanityWhatsAppConfig>(
        SINGLE_WHATSAPP_CONFIG_QUERY,
        { configId }
      );
      return sanityConfig
        ? transformSanityToWhatsAppConfig(sanityConfig)
        : null;
    } catch (error) {
      console.error("Error fetching WhatsApp configuration:", error);
      return null;
    }
  }

  // Create a new WhatsApp configuration
  static async createConfiguration(config: WhatsAppConfig): Promise<string> {
    try {
      const sanityDoc = transformWhatsAppConfigToSanity(config);
      const result = await sanityClient.create(sanityDoc);
      return result._id;
    } catch (error) {
      console.error("Error creating WhatsApp configuration:", error);
      throw new Error("Failed to create WhatsApp configuration");
    }
  }

  // Update an existing WhatsApp configuration
  static async updateConfiguration(
    configId: string,
    updates: Partial<WhatsAppConfig>
  ): Promise<void> {
    try {
      const sanityUpdates = transformWhatsAppConfigToSanity(
        updates as WhatsAppConfig,
        configId
      );
      await sanityClient.patch(configId).set(sanityUpdates).commit();
    } catch (error) {
      console.error("Error updating WhatsApp configuration:", error);
      throw new Error("Failed to update WhatsApp configuration");
    }
  }

  // Update device usage statistics
  static async updateDeviceUsage(
    configId: string,
    deviceName: string,
    incrementCount: number = 1
  ): Promise<void> {
    try {
      // Uncomment when Sanity client is set up
      // await client
      //   .patch(configId)
      //   .inc({ [`devices[deviceName == "${deviceName}"].currentDailyCount`]: incrementCount })
      //   .set({ [`devices[deviceName == "${deviceName}"].lastUsed`]: new Date().toISOString() })
      //   .commit();

      // Mock implementation
   
    } catch (error) {
      console.error("Error updating device usage:", error);
      throw new Error("Failed to update device usage");
    }
  }

  // Reset daily counters for all devices (typically run daily via cron job)
  static async resetDailyCounters(configId?: string): Promise<void> {
    try {
      const query = configId
        ? `*[_type == "whatsappConfig" && _id == "${configId}"]`
        : `*[_type == "whatsappConfig"]`;

      const configs = await sanityClient.fetch(query);
      for (const config of configs) {
        await sanityClient
          .patch(config._id)
          .set({ "devices[].currentDailyCount": 0 })
          .commit();
      }
    } catch (error) {
      console.error("Error resetting daily counters:", error);
      throw new Error("Failed to reset daily counters");
    }
  }

  // Get device analytics
  static async getDeviceAnalytics(configId: string): Promise<any[]> {
    try {
      const config = await this.fetchConfiguration(configId);
      if (!config) return [];

      return config.devices.map((device) => ({
        deviceName: device.deviceName,
        phoneNumber: device.phoneNumber,
        isActive: device.isActive,
        dailyUsage: device.currentDailyCount,
        maxDaily: device.maxDailyMessages,
        usagePercentage:
          (device.currentDailyCount / device.maxDailyMessages) * 100,
        lastUsed: device.lastUsed,
        priority: device.priority,
      }));
    } catch (error) {
      console.error("Error getting device analytics:", error);
      return [];
    }
  }

  // Log message delivery status
  static async logMessageDelivery(
    configId: string,
    messageId: string,
    deviceName: string,
    status: "sent" | "delivered" | "read" | "failed",
    error?: string
  ): Promise<void> {
    try {
      // Uncomment when Sanity client is set up
      // await client.create({
      //   _type: 'whatsappMessageLog',
      //   configId,
      //   messageId,
      //   deviceName,
      //   status,
      //   error,
      //   timestamp: new Date().toISOString(),
      // });

      // Mock implementation
   
    } catch (error) {
      console.error("Error logging message delivery:", error);
    }
  }

  // Get message delivery reports
  static async getDeliveryReports(
    configId: string,
    dateRange?: { from: string; to: string }
  ): Promise<unknown[]> {
    try {
      // Uncomment when Sanity client is set up
      // const query = `
      //   *[_type == "whatsappMessageLog" && configId == "${configId}"
      //     ${dateRange ? `&& timestamp >= "${dateRange.from}" && timestamp <= "${dateRange.to}"` : ''}
      //   ] | order(timestamp desc)
      // `;
      // return await client.fetch(query);

      // Mock implementation
      return [
        {
          messageId: "msg_001",
          deviceName: "Primary Device",
          status: "delivered",
          timestamp: new Date().toISOString(),
        },
        {
          messageId: "msg_002",
          deviceName: "Backup Device",
          status: "sent",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
    } catch (error) {
      console.error("Error getting delivery reports:", error);
      return [];
    }
  }
}

// Export default configuration fetcher
export async function getWhatsAppConfigFromSanity(): Promise<WhatsAppConfig | null> {
  const configs = await SanityWhatsAppService.fetchConfigurations();
  return configs.length > 0 ? configs[0] : null;
}
