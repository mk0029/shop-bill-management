"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { sanityClient } from "@/lib/sanity";
import { useDataStore } from "@/store/data-store";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { useInventoryStore } from "@/store/inventory-store";
import { toast } from "sonner";
import type { SanityClient, SanityDocument } from "@sanity/client";
import type { Subscription } from "@sanity/client";

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
      // Get the current state from the store
      const store = useInventoryStore.getState();

      switch (transition) {
        case "appear":
          // For realtime updates, just update the local state directly instead of calling addOrUpdateProduct
          const existingIndex = store.products.findIndex(
            (p) => p._id === result._id
          );
          if (existingIndex >= 0) {
            // Update existing product
            const updatedProducts = [...store.products];
            updatedProducts[existingIndex] = result;
            useInventoryStore.setState({ products: updatedProducts });
          } else {
            // Add new product
            useInventoryStore.setState({
              products: [...store.products, result],
            });
          }
          console.log(`✅ New product added: ${result.name}`);
          break;
        case "update":
          // For realtime updates, just update the local state directly
          const updateIndex = store.products.findIndex(
            (p) => p._id === result._id
          );
          if (updateIndex >= 0) {
            const updatedProducts = [...store.products];
            updatedProducts[updateIndex] = result;
            useInventoryStore.setState({ products: updatedProducts });
          }
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
          // Remove product from local state
          const filteredProducts = store.products.filter(
            (p) => p._id !== result._id
          );
          useInventoryStore.setState({ products: filteredProducts });
          console.log(`🗑️ Product removed: ${result.name}`);
          break;
      }
    },
    [enableNotifications]
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
          // For realtime updates, just update the local state directly
          const store = useInventoryStore.getState();
          const existingTransaction = store.stockTransactions.find(
            (t) => t._id === result._id
          );
          if (!existingTransaction) {
            useInventoryStore.setState({
              stockTransactions: [...store.stockTransactions, result],
            });
          }
          console.log(
            `📊 Stock transaction: ${result.type} - ${result.quantity} units`
          );
          break;
        case "update":
          // Handle stock transaction updates if needed
          const updateStore = useInventoryStore.getState();
          const transactionIndex = updateStore.stockTransactions.findIndex(
            (t) => t._id === result._id
          );
          if (transactionIndex >= 0) {
            const updatedTransactions = [...updateStore.stockTransactions];
            updatedTransactions[transactionIndex] = result;
            useInventoryStore.setState({
              stockTransactions: updatedTransactions,
            });
          }
          break;
      }
    },
    []
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
      (params as unknown).documentId = documentId;
    }

    // Set up the listener
    subscriptionRef.current = sanityClient
      .listen(query, params, {
        includeResult: true,
        includePreviousRevision: true,
      })
      .subscribe({
        next: (update: RealtimeUpdate<T>) => {
          const now = Date.now();

          // Throttle updates to prevent UI jank
          if (now - lastUpdateRef.current < throttleTime) return;
          lastUpdateRef.current = now;

          try {
            // Handle the update based on transition type
            switch (update.transition) {
              case "appear":
                if (update.result && onAppear) {
                  onAppear(update.result);
                }
                break;
              case "update":
                if (onUpdate) {
                  onUpdate(update);
                }
                break;
              case "disappear":
                if (onDisappear) {
                  onDisappear(update.documentId);
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
  const cleanupTimerRef = useRef<NodeJS.Timeout>();

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
