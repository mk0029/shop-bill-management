"use client";

import { useEffect } from "react";
import { useRealtimeSync } from "./use-realtime-sync";

/**
 * A seamless realtime hook that works silently in the background
 * No notifications, no connection status, just pure real-time updates
 */
export const useSeamlessRealtime = () => {
  useRealtimeSync({
    enableNotifications: false,
    enableAutoRefresh: true,
  });
};

/**
 * Hook for customer-specific bill updates
 * Automatically syncs bills for a specific customer in the background
 */
export const useCustomerBillRealtime = (customerId?: string) => {
  useSeamlessRealtime();

  // The real-time sync will automatically handle bill updates
  // and the bill store will be updated in the background

  return {
    // This hook doesn't return anything - it just ensures real-time sync is active
    // Components can use the bill store directly to get updated data
  };
};
