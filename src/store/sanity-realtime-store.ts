/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { sanityClient } from "@/lib/sanity";
import { handleRealtimeError } from "@/lib/handle-realtime-error";
import { useAuthStore } from "@/store/auth-store";

interface RealtimeState {
  subscription: any | null;
  isConnected: boolean;
  listeners: Map<string, ((data: any) => void)[]>;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string) => void;
}

export const useSanityRealtimeStore = create<RealtimeState>((set, get) => ({
  subscription: null,
  isConnected: false,
  listeners: new Map(),

  connect: () => {
    const { subscription } = get();
    if (subscription) return;

    // Get current user role to determine what to listen to
    const authState = useAuthStore.getState();
    const { role, user } = authState;
    const userId = (user as any)?.id || (user as any)?._id;
    const customerId = (user as any)?.customerId;
    
    // Don't connect if role is not set or if customer but no IDs
    if (!role || (role === "customer" && (!userId && !customerId))) {
      console.warn("[SanityRealtimeStore] Cannot connect: insufficient auth info");
      return;
    }
    
    let query: string;
    let params: any = {};
    
    if (role === "customer") {
      // Customers only listen to their own bills and user updates
      query = `*[_type in ["bill", "user"] && (
        _type == "bill" && (
          customer._ref == $userId || 
          customer == $userId || 
          customer._id == $userId ||
          customer->customerId == $customerId ||
          customerId == $customerId
        ) ||
        _type == "user" && _id == $userId
      )]`;
      params = { userId: userId || customerId, customerId };
    } else {
      // Admins listen to all document types
      query = '*[_type in ["bill", "product", "stockTransaction", "user", "brand", "category", "payment", "supplier", "address", "branch", "specificationOption", "fieldDefinition", "customerRequest"]]';
    }

    // Listen to document types based on role
    const newSubscription = sanityClient
      .listen(query, params)
      .subscribe({
        next: (update) => {
          const { listeners } = get();
          const documentType =
            update.result?._type || update.documentId?.split(".")[0];

          // Emit specific events based on document type and mutation
          switch (documentType) {
            case "bill":
              switch (update.transition) {
                case "appear":
                  listeners
                    .get("bill:created")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "update":
                  listeners
                    .get("bill:updated")
                    ?.forEach((callback) =>
                      callback({
                        billId: update.documentId,
                        updates: update.result,
                      })
                    );
                  break;
                case "disappear":
                  listeners
                    .get("bill:deleted")
                    ?.forEach((callback) =>
                      callback({ billId: update.documentId })
                    );
                  break;
              }
              break;
            case "product":
              switch (update.transition) {
                case "appear":
                  listeners
                    .get("inventory:created")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "update":
                  listeners
                    .get("inventory:updated")
                    ?.forEach((callback) =>
                      callback({
                        productId: update.documentId,
                        updates: update.result,
                      })
                    );
                  // Check for low stock
                  if (
                    update.result?.inventory?.currentStock <=
                    update.result?.inventory?.minimumStock
                  ) {
                    listeners.get("inventory:low_stock")?.forEach((callback) =>
                      callback({
                        productId: update.documentId,
                        productName: update?.result?.name,
                        currentStock: update?.result?.inventory?.currentStock,
                        minimumStock: update?.result?.inventory?.minimumStock,
                      })
                    );
                  }
                  break;
                case "disappear":
                  listeners
                    .get("inventory:deleted")
                    ?.forEach((callback) =>
                      callback({ productId: update.documentId })
                    );
                  break;
              }
              break;
            case "payment":
              switch (update.transition) {
                case "appear":
                  listeners
                    .get("payment:created")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "update":
                  listeners
                    .get("payment:updated")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "disappear":
                  listeners
                    .get("payment:deleted")
                    ?.forEach((callback) =>
                      callback({ id: update.documentId })
                    );
                  break;
              }
              break;
            case "customerRequest":
              switch (update.transition) {
                case "appear":
                  listeners
                    .get("customerRequest:created")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "update":
                  listeners
                    .get("customerRequest:updated")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "disappear":
                  listeners
                    .get("customerRequest:deleted")
                    ?.forEach((callback) => callback({ id: update.documentId }));
                  break;
              }
              break;
            case "supplier":
              switch (update.transition) {
                case "appear":
                  listeners
                    .get("supplier:created")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "update":
                  listeners
                    .get("supplier:updated")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "disappear":
                  listeners
                    .get("supplier:deleted")
                    ?.forEach((callback) =>
                      callback({ id: update.documentId })
                    );
                  break;
              }
              break;
            case "address":
              switch (update.transition) {
                case "appear":
                  listeners
                    .get("address:created")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "update":
                  listeners
                    .get("address:updated")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "disappear":
                  listeners
                    .get("address:deleted")
                    ?.forEach((callback) =>
                      callback({ id: update.documentId })
                    );
                  break;
              }
              break;
            case "branch":
              switch (update.transition) {
                case "appear":
                  listeners
                    .get("branch:created")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "update":
                  listeners
                    .get("branch:updated")
                    ?.forEach((callback) => callback(update.result));
                  break;
                case "disappear":
                  listeners
                    .get("branch:deleted")
                    ?.forEach((callback) =>
                      callback({ id: update.documentId })
                    );
                  break;
              }
              break;
            case "specificationOption":
              listeners
                .get("specOption:updated")
                ?.forEach((callback) => callback(update.result));
              break;
            case "fieldDefinition":
              listeners
                .get("fieldDef:updated")
                ?.forEach((callback) => callback(update.result));
              break;
          }

          // Emit generic events for all document types
          listeners
            .get("document:updated")
            ?.forEach((callback) => callback(update));
        },
        error: (error) => {
          set({ isConnected: false });
          handleRealtimeError(error);
        },
      });

    set({
      subscription: newSubscription,
      isConnected: true,
    });
  },

  disconnect: () => {
    const { subscription } = get();
    if (subscription) {
      subscription.unsubscribe();
      set({ subscription: null, isConnected: false });
    }
  },

  emit: (event: string, data: any) => {
    // For Sanity, we don't emit events - we create/update documents
    // This is kept for compatibility with existing code
    // no-op
  },

  on: (event: string, callback: (data: any) => void) => {
    const { listeners } = get();

    if (!listeners.has(event)) {
      listeners.set(event, []);
    }

    listeners.get(event)!.push(callback);
    set({ listeners: new Map(listeners) });
  },

  off: (event: string) => {
    const { listeners } = get();
    listeners.delete(event);
    set({ listeners: new Map(listeners) });
  },
}));