// React Hook for WhatsApp Configuration Management

import { useState, useEffect, useCallback } from "react";
import {
  WhatsAppConfig,
  WhatsAppDevice,
  fetchWhatsAppConfigFromSanity,
  updateWhatsAppConfig as updateConfig,
  sendWhatsAppMessage,
  BillDetails,
  MessageDeliveryStatus,
} from "@/lib/whatsapp-utils";
import { SanityWhatsAppService } from "@/lib/sanity-whatsapp-service";

export interface UseWhatsAppConfigReturn {
  // Configuration state
  config: WhatsAppConfig | null;
  configs: WhatsAppConfig[];
  isLoading: boolean;
  error: string | null;

  // Configuration management
  fetchConfigurations: () => Promise<void>;
  updateConfiguration: (
    configId: string,
    updates: Partial<WhatsAppConfig>
  ) => Promise<void>;
  createConfiguration: (config: WhatsAppConfig) => Promise<string>;

  // Device management
  addDevice: (device: WhatsAppDevice) => void;
  removeDevice: (deviceName: string) => void;
  updateDevice: (deviceName: string, updates: Partial<WhatsAppDevice>) => void;
  toggleDevice: (deviceName: string) => void;

  // Message sending
  sendMessage: (bill: BillDetails) => Promise<MessageDeliveryStatus>;

  // Analytics
  deviceAnalytics: any[];
  refreshAnalytics: () => Promise<void>;

  // Utility functions
  resetDailyCounters: () => Promise<void>;
  testDeviceConnection: (deviceName: string) => Promise<boolean>;
}

export function useWhatsAppConfig(configId?: string): UseWhatsAppConfigReturn {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceAnalytics, setDeviceAnalytics] = useState<any[]>([]);

  // Fetch configurations from Sanity
  const fetchConfigurations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const fetchedConfigs = await fetchWhatsAppConfigFromSanity();
      setConfigs(fetchedConfigs);

      if (configId) {
        const specificConfig =
          await SanityWhatsAppService.fetchConfiguration(configId);
        setConfig(specificConfig);
      } else if (fetchedConfigs.length > 0) {
        setConfig(fetchedConfigs[0]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch configurations"
      );
    } finally {
      setIsLoading(false);
    }
  }, [configId]);

  // Update configuration
  const updateConfiguration = useCallback(
    async (id: string, updates: Partial<WhatsAppConfig>) => {
      try {
        setError(null);
        await updateConfig(id, updates);

        // Update local state
        if (config && (!configId || configId === id)) {
          setConfig({ ...config, ...updates });
        }

        // Refresh configurations
        await fetchConfigurations();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update configuration"
        );
        throw err;
      }
    },
    [config, configId, fetchConfigurations]
  );

  // Create new configuration
  const createConfiguration = useCallback(
    async (newConfig: WhatsAppConfig): Promise<string> => {
      try {
        setError(null);
        const newConfigId =
          await SanityWhatsAppService.createConfiguration(newConfig);
        await fetchConfigurations();
        return newConfigId;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create configuration"
        );
        throw err;
      }
    },
    [fetchConfigurations]
  );

  // Device management functions
  const addDevice = useCallback(
    (device: WhatsAppDevice) => {
      if (!config) return;

      const updatedConfig = {
        ...config,
        devices: [...config.devices, device],
      };
      setConfig(updatedConfig);
    },
    [config]
  );

  const removeDevice = useCallback(
    (deviceName: string) => {
      if (!config) return;

      const updatedConfig = {
        ...config,
        devices: config.devices.filter((d) => d.deviceName !== deviceName),
      };
      setConfig(updatedConfig);
    },
    [config]
  );

  const updateDevice = useCallback(
    (deviceName: string, updates: Partial<WhatsAppDevice>) => {
      if (!config) return;

      const updatedConfig = {
        ...config,
        devices: config.devices.map((device) =>
          device.deviceName === deviceName ? { ...device, ...updates } : device
        ),
      };
      setConfig(updatedConfig);
    },
    [config]
  );

  const toggleDevice = useCallback(
    (deviceName: string) => {
      if (!config) return;

      const device = config.devices.find((d) => d.deviceName === deviceName);
      if (device) {
        updateDevice(deviceName, { isActive: !device.isActive });
      }
    },
    [config, updateDevice]
  );

  // Send WhatsApp message
  const sendMessage = useCallback(
    async (bill: BillDetails): Promise<MessageDeliveryStatus> => {
      if (!config) {
        throw new Error("No WhatsApp configuration available");
      }

      try {
        setError(null);
        const result = await sendWhatsAppMessage(bill, config);

        // Update device usage in local state
        const deviceUsed = config.devices.find(
          (d) => d.deviceName === result.deviceUsed
        );
        if (deviceUsed) {
          updateDevice(result.deviceUsed, {
            currentDailyCount: deviceUsed.currentDailyCount + 1,
            lastUsed: result.timestamp,
          });
        }

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
        throw err;
      }
    },
    [config, updateDevice]
  );

  // Refresh analytics
  const refreshAnalytics = useCallback(async () => {
    if (!config) return;

    try {
      const analytics = await SanityWhatsAppService.getDeviceAnalytics(
        configId || "default"
      );
      setDeviceAnalytics(analytics);
    } catch (err) {
      console.error("Failed to refresh analytics:", err);
    }
  }, [config, configId]);

  // Reset daily counters
  const resetDailyCounters = useCallback(async () => {
    try {
      setError(null);
      await SanityWhatsAppService.resetDailyCounters(configId);

      // Update local state
      if (config) {
        const updatedConfig = {
          ...config,
          devices: config.devices.map((device) => ({
            ...device,
            currentDailyCount: 0,
          })),
        };
        setConfig(updatedConfig);
      }

      await refreshAnalytics();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reset daily counters"
      );
      throw err;
    }
  }, [config, configId, refreshAnalytics]);

  // Test device connection
  const testDeviceConnection = useCallback(
    async (deviceName: string): Promise<boolean> => {
      if (!config) return false;

      const device = config.devices.find((d) => d.deviceName === deviceName);
      if (!device) return false;

      try {
        // Mock test - in real implementation, this would ping the WhatsApp API
        if (device.apiEndpoint) {
          const response = await fetch(device.apiEndpoint + "/health", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${device.passKey}`,
            },
          });
          return response.ok;
        }

        // For web WhatsApp, we can't really test the connection
        return device.isActive;
      } catch (err) {
        console.error("Device connection test failed:", err);
        return false;
      }
    },
    [config]
  );

  // Initialize on mount
  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  // Refresh analytics when config changes
  useEffect(() => {
    if (config) {
      refreshAnalytics();
    }
  }, [config, refreshAnalytics]);

  return {
    // State
    config,
    configs,
    isLoading,
    error,

    // Configuration management
    fetchConfigurations,
    updateConfiguration,
    createConfiguration,

    // Device management
    addDevice,
    removeDevice,
    updateDevice,
    toggleDevice,

    // Message sending
    sendMessage,

    // Analytics
    deviceAnalytics,
    refreshAnalytics,

    // Utility functions
    resetDailyCounters,
    testDeviceConnection,
  };
}

// Hook for sending messages with automatic configuration
export function useWhatsAppMessaging() {
  const { config, sendMessage, error } = useWhatsAppConfig();

  const sendBillMessage = useCallback(
    async (bill: BillDetails) => {
      if (!config) {
        throw new Error("WhatsApp configuration not loaded");
      }

      return await sendMessage(bill);
    },
    [config, sendMessage]
  );

  return {
    sendBillMessage,
    isConfigured: !!config,
    error,
  };
}

// Hook for device analytics
export function useWhatsAppAnalytics(configId?: string) {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [deliveryReports, setDeliveryReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!configId) return;

    try {
      setIsLoading(true);
      const [deviceAnalytics, reports] = await Promise.all([
        SanityWhatsAppService.getDeviceAnalytics(configId),
        SanityWhatsAppService.getDeliveryReports(configId),
      ]);

      setAnalytics(deviceAnalytics);
      setDeliveryReports(reports);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }, [configId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    deliveryReports,
    isLoading,
    refresh: fetchAnalytics,
  };
}
