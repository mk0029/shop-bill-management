"use client";

import { useEffect, useCallback, useRef } from "react";
import { sanityClient } from "@/lib/sanity";
import { useDataStore } from "@/store/data-store";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { useInventoryStore } from "@/store/inventory-store";
import { toast } from "sonner";
import type { Subscription } from "@sanity/client";

interface RealtimeUpdate {
  transition: "appear" | "update" | "disappear";
  documentId: string;
  result?: any;
  previous?: any;
}

interface UseRealtimeSyncOptions {
  enableNotifications?: boolean;
  enableAutoRefresh?: boolean;
  documentTypes?: string[];
}

export const useRealtimeSync = (options: UseRealtimeSyncOptions = {}) => {
  const {
    enableNotifications = true,
    enableAutoRefresh = true,
    documentTypes = [
      "bill",
      "product",
      "user",
      "stockTransaction",
      "brand",
      "category",
    ],
  } = options;

  const dataStore = useDataStore();
  const billStore = useSanityBillStore();
  const inventoryStore = useInventoryStore();
  const subscriptionRef = useRef<Subscription | null>(null);
  const isConnectedRef = useRef(false);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback(
    (update: RealtimeUpdate) => {
      const { transition, documentId, result, previous } = update;
      const documentType = result?._type || documentId.split(".")[0];

      console.log("🔄 Real-time update:", {
        transition,
        documentType,
        documentId,
      });

      switch (documentType) {
        case "bill":
          handleBillUpdate(transition, result, previous);
          break;
        case "product":
          handleProductUpdate(transition, result, previous);
          break;
        case "user":
          handleUserUpdate(transition, result, previous);
          break;
        case "stockTransaction":
          handleStockTransactionUpdate(transition, result, previous);
          break;
        case "brand":
          handleBrandUpdate(transition, result, previous);
          break;
        case "category":
          handleCategoryUpdate(transition, result, previous);
          break;
      }
    },
    [dataStore, billStore, inventoryStore, enableNotifications]
  );

  // Handle bill updates
  const handleBillUpdate = useCallback(
    (transition: string, result: any, previous: any) => {
      switch (transition) {
        case "appear":
          // Silently add the new bill to both stores
          billStore.addBill(result);
          console.log(`✅ New bill added: #${result.billNumber}`);
          break;
        case "update":
          // Silently update the bill in both stores
          billStore.updateBill(result._id, result);
          console.log(`🔄 Bill updated: #${result.billNumber}`);
          break;
        case "disappear":
          // Silently remove the bill from both stores
          billStore.deleteBill(result._id);
          console.log(`🗑️ Bill removed: #${result.billNumber}`);
          break;
      }
    },
    [billStore]
  );

  // Handle product updates
  const handleProductUpdate = useCallback(
    (transition: string, result: any, previous: any) => {
      switch (transition) {
        case "appear":
          inventoryStore.addOrUpdateProduct(result);
          console.log(`✅ New product added: ${result.name}`);
          break;
        case "update":
          inventoryStore.addOrUpdateProduct(result);
          console.log(`🔄 Product updated: ${result.name}`);

          // Only show critical alerts (low stock) if notifications are enabled
          if (
            enableNotifications &&
            result.inventory?.currentStock <= result.inventory?.minimumStock
          ) {
            toast.warning(
              `Low stock: ${result.name} (${result.inventory.currentStock} remaining)`
            );
          }
          break;
        case "disappear":
          console.log(`🗑️ Product removed: ${result.name}`);
          break;
      }
    },
    [inventoryStore, enableNotifications]
  );

  // Handle user updates
  const handleUserUpdate = useCallback(
    (transition: string, result: any, previous: any) => {
      switch (transition) {
        case "appear":
          console.log(`✅ New user added: ${result.name}`);
          break;
        case "update":
          console.log(`🔄 User updated: ${result.name}`);
          break;
        case "disappear":
          console.log(`🗑️ User removed: ${result.name}`);
          break;
      }
    },
    []
  );

  // Handle stock transaction updates
  const handleStockTransactionUpdate = useCallback(
    (transition: string, result: any, previous: any) => {
      switch (transition) {
        case "appear":
          inventoryStore.createStockTransaction(result);
          console.log(
            `📊 Stock transaction: ${result.type} - ${result.quantity} units`
          );
          break;
        case "update":
          // Handle stock transaction updates if needed
          break;
      }
    },
    [inventoryStore]
  );

  // Handle brand updates
  const handleBrandUpdate = useCallback(
    (transition: string, result: any, previous: any) => {
      switch (transition) {
        case "appear":
          console.log(`✅ New brand added: ${result.name}`);
          break;
        case "update":
          console.log(`🔄 Brand updated: ${result.name}`);
          break;
        case "disappear":
          console.log(`🗑️ Brand removed: ${result.name}`);
          break;
      }
    },
    []
  );

  // Handle category updates
  const handleCategoryUpdate = useCallback(
    (transition: string, result: any, previous: any) => {
      switch (transition) {
        case "appear":
          console.log(`✅ New category added: ${result.name}`);
          break;
        case "update":
          console.log(`🔄 Category updated: ${result.name}`);
          break;
        case "disappear":
          console.log(`🗑️ Category removed: ${result.name}`);
          break;
      }
    },
    []
  );

  // Connect to real-time updates
  const connect = useCallback(() => {
    if (subscriptionRef.current || isConnectedRef.current) {
      console.log("Already connected to real-time updates");
      return;
    }

    console.log("🔌 Connecting to Sanity real-time updates...");

    const query = `*[_type in [${documentTypes
      .map((type) => `"${type}"`)
      .join(", ")}]]`;

    subscriptionRef.current = sanityClient
      .listen(query, {}, { includeResult: true })
      .subscribe({
        next: (update) => {
          handleRealtimeUpdate(update as RealtimeUpdate);
        },
        error: (error) => {
          console.error("❌ Real-time connection error:", error);
          isConnectedRef.current = false;
          // Silently attempt to reconnect after 3 seconds
          setTimeout(() => {
            if (!isConnectedRef.current) {
              console.log("🔄 Attempting to reconnect...");
              connect();
            }
          }, 3000);
        },
        complete: () => {
          console.log("Real-time connection completed");
          isConnectedRef.current = false;
        },
      });

    isConnectedRef.current = true;
    console.log("✅ Connected to Sanity real-time updates");
  }, [documentTypes, handleRealtimeUpdate, enableNotifications]);

  // Disconnect from real-time updates
  const disconnect = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
      isConnectedRef.current = false;
      console.log("❌ Disconnected from real-time updates");
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Refresh data manually (silent background refresh)
  const refreshData = useCallback(async () => {
    if (enableAutoRefresh) {
      console.log("🔄 Silently refreshing data from Sanity...");
      await Promise.all([
        dataStore.syncWithSanity(),
        billStore.fetchBills(),
        inventoryStore.fetchProducts(),
      ]);
      console.log("✅ Data refresh completed");
    }
  }, [dataStore, billStore, inventoryStore, enableAutoRefresh]);

  return {
    isConnected: isConnectedRef.current,
    connect,
    disconnect,
    refreshData,
  };
};

// Hook for listening to specific document changes
export const useDocumentListener = (
  documentType: string,
  documentId?: string,
  callback?: (update: RealtimeUpdate) => void
) => {
  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    if (!callback) return;

    const query = documentId
      ? `*[_type == "${documentType}" && _id == "${documentId}"]`
      : `*[_type == "${documentType}"]`;

    subscriptionRef.current = sanityClient
      .listen(query, {}, { includeResult: true })
      .subscribe({
        next: (update) => {
          callback(update as RealtimeUpdate);
        },
        error: (error) => {
          console.error(`Error listening to ${documentType}:`, error);
        },
      });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [documentType, documentId, callback]);

  return {
    disconnect: () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    },
  };
};

// Hook for real-time bill updates (customer-specific)
export const useCustomerBillSync = (customerId?: string) => {
  const billStore = useSanityBillStore();

  const handleBillUpdate = useCallback(
    (update: RealtimeUpdate) => {
      const { transition, result } = update;

      // Only handle bills for this customer
      if (
        result?.customer?._ref === customerId ||
        result?.customer?._id === customerId
      ) {
        switch (transition) {
          case "appear":
            billStore.addBill(result);
            console.log(`✅ New bill for customer: #${result.billNumber}`);
            break;
          case "update":
            billStore.updateBill(result._id, result);
            console.log(`🔄 Bill updated for customer: #${result.billNumber}`);
            break;
          case "disappear":
            billStore.deleteBill(result._id);
            console.log(`🗑️ Bill removed for customer: #${result.billNumber}`);
            break;
        }
      }
    },
    [customerId, billStore]
  );

  useDocumentListener("bill", undefined, handleBillUpdate);

  return {
    bills: billStore.bills.filter(
      (bill) =>
        bill.customer?._ref === customerId || bill.customer?._id === customerId
    ),
  };
};
