"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { sanityClient } from "@/lib/sanity";
import { useDataStore } from "@/store/data-store";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { useInventoryStore } from "@/store/inventory-store";
import { toast } from "sonner";
import type { SanityDocument } from "@sanity/client";
import type { Subscription } from "rxjs";

// Type definitions for real-time updates
type DocumentTransition = "appear" | "update" | "disappear";

interface RealtimeUpdate<T = any> {
  result: T | null;
  previous?: T | null;
  visibility?: "visible" | "hidden";
  mutations: {
    transactionId: string;
    transition: DocumentTransition;
    identity: string;
    resultRev: string;
    previousRev?: string | null;
    mutations: unknown[];
    timestamp: string;
    effects?: {
      apply: unknown;
      revert: unknown;
    };
  }[];
  timestamp: string;
  transactionId: string;
  transition: DocumentTransition;
  version: "v1" | "v2";
  documentId: string;
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
  const handleRealtimeUpdate = useCallback((update: RealtimeUpdate) => {
    const { transition, documentId, result } = update;
    const documentType = result?._type || documentId.split(".")[0];

    console.log("🔄 Real-time update:", {
      transition,
      documentType,
      documentId,
    });

    switch (documentType) {
      case "bill":
        handleBillUpdate(transition, result);
        break;
      case "product":
        handleProductUpdate(transition, result);
        break;
      case "user":
        handleUserUpdate(transition, result);
        break;
      case "stockTransaction":
        handleStockTransactionUpdate(transition, result);
        break;
      case "brand":
        handleBrandUpdate(transition, result);
        break;
      case "category":
        handleCategoryUpdate(transition, result);
        break;
    }
  }, []);

  // Handle bill updates
  const handleBillUpdate = useCallback(
    (transition: string, result: SanityDocument | null) => {
      if (!result) return;

      switch (transition) {
        case "appear":
          // Silently add the new bill to both stores
          billStore.addBill(result as any);
          console.log(`✅ New bill added: #${result.billNumber || result._id}`);
          break;
        case "update":
          // Silently update the bill in both stores
          billStore.updateBill(result._id, result as any);
          console.log(`🔄 Bill updated: #${result.billNumber || result._id}`);
          break;
        case "disappear":
          // Silently remove the bill from both stores
          billStore.deleteBill(result._id);
          console.log(`🗑️ Bill removed: #${result.billNumber || result._id}`);
          break;
      }
    },
    [billStore]
  );

  // Handle product updates
  const handleProductUpdate = useCallback(
    (transition: string, result: SanityDocument | null) => {
      // Validate that we have the required data for product operations
      if (!result) {
        console.warn("⚠️ Product update received with no result data");
        return;
      }

      // For realtime updates, we need to handle products differently
      // since addOrUpdateProduct expects a specific format
      switch (transition) {
        case "appear":
        case "update":
          // Check if this is a complete product with all required fields
          if (result.brand?._id && result.category?._id && result.name) {
            // Use the realtime-specific update method instead
            inventoryStore.handleRealtimeProductUpdate(result);
            console.log(`✅ Product ${transition}: ${result.name}`);

            // Only show critical alerts (low stock) if notifications are enabled
            if (
              enableNotifications &&
              result.inventory?.currentStock <= result.inventory?.minimumStock
            ) {
              toast.warning(
                `Low stock: ${result.name} (${result.inventory.currentStock} remaining)`
              );
            }
          } else {
            // If we don't have complete data, just refresh the inventory
            console.warn(
              "⚠️ Incomplete product data received, refreshing inventory..."
            );
            inventoryStore.fetchProducts();
          }
          break;
        case "disappear":
          console.log(`🗑️ Product removed: ${result?.name || "Unknown"}`);
          // Refresh inventory to remove the deleted product
          inventoryStore.fetchProducts();
          break;
      }
    },
    [inventoryStore, enableNotifications]
  );

  // Handle user updates
  const handleUserUpdate = useCallback(
    (transition: string, result: SanityDocument | null) => {
      if (!result) return;

      switch (transition) {
        case "appear":
          console.log(`✅ New user added: ${result.name || result._id}`);
          break;
        case "update":
          console.log(`🔄 User updated: ${result.name || result._id}`);
          break;
        case "disappear":
          console.log(`🗑️ User removed: ${result.name || result._id}`);
          break;
      }
    },
    []
  );

  // Handle stock transaction updates
  const handleStockTransactionUpdate = useCallback(
    (transition: string, result: SanityDocument | null) => {
      // Validate that we have the required data for stock transaction operations
      if (!result) {
        console.warn(
          "⚠️ Stock transaction update received with no result data"
        );
        return;
      }

      switch (transition) {
        case "appear":
          // Validate required fields for stock transaction
          if (result.product?._ref && result.type && result.quantity) {
            // Use the realtime-specific update method
            inventoryStore.handleRealtimeStockTransaction(result);
            console.log(
              `📊 Stock transaction: ${result.type} - ${result.quantity} units`
            );
          } else {
            console.warn("⚠️ Incomplete stock transaction data:", {
              productId: result.product?._ref,
              type: result.type,
              quantity: result.quantity,
            });
            // Refresh stock transactions to get the latest data
            inventoryStore.fetchStockTransactions();
          }
          break;
        case "update":
          // For updates, just refresh the stock transactions
          inventoryStore.fetchStockTransactions();
          break;
        case "disappear":
          // Refresh stock transactions when one is deleted
          inventoryStore.fetchStockTransactions();
          break;
      }
    },
    [inventoryStore]
  );

  // Handle brand updates
  const handleBrandUpdate = useCallback(
    (transition: string, result: SanityDocument | null) => {
      if (!result) return;

      switch (transition) {
        case "appear":
          console.log(`✅ New brand added: ${result.name || result._id}`);
          break;
        case "update":
          console.log(`🔄 Brand updated: ${result.name || result._id}`);
          break;
        case "disappear":
          console.log(`🗑️ Brand removed: ${result.name || result._id}`);
          break;
      }
    },
    []
  );

  // Handle category updates
  const handleCategoryUpdate = useCallback(
    (transition: string, result: SanityDocument | null) => {
      if (!result) return;

      switch (transition) {
        case "appear":
          console.log(`✅ New category added: ${result.name || result._id}`);
          break;
        case "update":
          console.log(`🔄 Category updated: ${result.name || result._id}`);
          break;
        case "disappear":
          console.log(`🗑️ Category removed: ${result.name || result._id}`);
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

    // Enhanced query to include referenced data for products
    const query = `*[_type in [${documentTypes
      .map((type) => `"${type}"`)
      .join(", ")}]] {
      ...,
      _type == "product" => {
        ...,
        brand->{
          _id,
          name,
          slug,
          logo,
          description,
          isActive
        },
        category->{
          _id,
          name,
          slug,
          description,
          icon,
          isActive
        }
      }
    }`;

    subscriptionRef.current = sanityClient
      .listen(query, {}, { includeResult: true })
      .subscribe({
        next: (update) => {
          handleRealtimeUpdate(update as unknown as RealtimeUpdate);
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
  }, [documentTypes, handleRealtimeUpdate]);

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

/**
 * Hook for listening to real-time document changes using Sanity's .listen() API
 * @param documentType - The Sanity document type to listen to (e.g., 'product', 'bill')
 * @param documentId - Optional specific document ID to listen to
 * @param options - Additional options for the listener
 * @returns Object containing disconnect function and connection status
 */
export const useDocumentListener = <T extends SanityDocument>(
  documentType: string,
  documentId?: string,
  options: {
    onUpdate?: (update: RealtimeUpdate<T>) => void;
    onAppear?: (document: T) => void;
    onDisappear?: (documentId: string) => void;
    throttleTime?: number;
  } = {}
) => {
  const subscriptionRef = useRef<Subscription | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const { onUpdate, onAppear, onDisappear, throttleTime = 100 } = options;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Build the GROQ query
    const query = documentId
      ? `*[_type == $documentType && _id == $documentId][0]`
      : `*[_type == $documentType]`;

    const params = { documentType };
    if (documentId) {
      (params as Record<string, string>).documentId = documentId;
    }

    // Set up the listener
    subscriptionRef.current = sanityClient
      .listen(query, params, {
        includeResult: true,
        includePreviousRevision: true,
      })
      .subscribe({
        next: (update) => {
          const now = Date.now();

          // Throttle updates to prevent UI jank
          if (now - lastUpdateRef.current < throttleTime) return;
          lastUpdateRef.current = now;

          try {
            const realtimeUpdate = update as unknown as RealtimeUpdate<T>;
            // Handle the update based on transition type
            switch (realtimeUpdate.transition) {
              case "appear":
                if (realtimeUpdate.result && onAppear) {
                  onAppear(realtimeUpdate.result);
                }
                break;
              case "update":
                if (onUpdate) {
                  onUpdate(realtimeUpdate);
                }
                break;
              case "disappear":
                if (onDisappear) {
                  onDisappear(realtimeUpdate.documentId);
                }
                break;
            }
          } catch (error) {
            console.error("Error handling realtime update:", error);
          }
        },
        error: (error) => {
          console.error(`Error in ${documentType} listener:`, error);
          setIsConnected(false);
          // Attempt to reconnect after a delay
          setTimeout(() => {
            cleanup();
            // Re-subscribe will happen in the next effect run
          }, 5000);
        },
        complete: () => {
          console.log(`Listener for ${documentType} completed`);
          setIsConnected(false);
        },
      });

    setIsConnected(true);
    console.log(
      `Listening to ${documentType} changes`,
      documentId ? `(ID: ${documentId})` : ""
    );

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [
    documentType,
    documentId,
    onUpdate,
    onAppear,
    onDisappear,
    cleanup,
    throttleTime,
  ]);

  return {
    isConnected,
    disconnect: cleanup,
  };
};

/**
 * Hook for tracking recently updated document IDs with a cooldown period
 * @param cooldown - Time in milliseconds to keep track of updates (default: 2000ms)
 * @returns Object containing functions to manage updated IDs
 */
const useUpdatedDocuments = (cooldown = 2000) => {
  const updatedIdsRef = useRef<Map<string, number>>(new Map());
  const cleanupTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Clean up old entries
  const cleanupOldEntries = useCallback(() => {
    const now = Date.now();
    const updatedIds = updatedIdsRef.current;

    // Remove entries older than cooldown
    updatedIds.forEach((timestamp, id) => {
      if (now - timestamp > cooldown) {
        updatedIds.delete(id);
      }
    });

    // If we still have entries, schedule the next cleanup
    if (updatedIds.size > 0) {
      cleanupTimerRef.current = setTimeout(cleanupOldEntries, cooldown / 2);
    } else {
      cleanupTimerRef.current = undefined;
    }
  }, [cooldown]);

  // Add a document ID to track
  const addUpdatedId = useCallback(
    (id: string) => {
      updatedIdsRef.current.set(id, Date.now());

      // Start cleanup timer if not already running
      if (!cleanupTimerRef.current) {
        cleanupTimerRef.current = setTimeout(cleanupOldEntries, cooldown / 2);
      }
    },
    [cleanupOldEntries, cooldown]
  );

  // Check if a document was recently updated
  const isRecentlyUpdated = useCallback((id: string) => {
    return updatedIdsRef.current.has(id);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }
    };
  }, []);

  return {
    addUpdatedId,
    isRecentlyUpdated,
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
            billStore.addBill(result as any);
            console.log(`✅ New bill for customer: #${result.billNumber}`);
            break;
          case "update":
            billStore.updateBill(result._id, result as any);
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

  useDocumentListener("bill", undefined, {
    onUpdate: handleBillUpdate,
  });

  return {
    bills: billStore.bills.filter(
      (bill) =>
        (bill.customer as any)?._ref === customerId ||
        (bill.customer as unknown)?._id === customerId
    ),
  };
};
