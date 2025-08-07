/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { sanityClient } from "@/lib/sanity";


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

    console.log("🔌 Connecting to Sanity real-time...");

    // Listen to all document types we care about
    const newSubscription = sanityClient
      .listen(
        '*[_type in ["bill", "product", "stockTransaction", "user", "brand", "category", "payment", "supplier", "address", "branch", "specificationOption", "fieldDefinition"]]'
      )
      .subscribe({
        next: (update) => {
          console.log("📡 Sanity real-time update:", update);

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
          console.error("❌ Sanity real-time error:", error);
          set({ isConnected: false });
        },
      });

    set({
      subscription: newSubscription,
      isConnected: true,
    });

    console.log("✅ Connected to Sanity real-time");
  },

  disconnect: () => {
    const { subscription } = get();
    if (subscription) {
      subscription.unsubscribe();
      set({ subscription: null, isConnected: false });
      console.log("❌ Disconnected from Sanity real-time");
    }
  },

  emit: (event: string, data: any) => {
    // For Sanity, we don't emit events - we create/update documents
    // This is kept for compatibility with existing code
    console.log(
      "📤 Emit event (Sanity handles this automatically):",
      event,
      data
    );
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