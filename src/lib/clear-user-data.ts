"use client";

import { clearChatCache } from "./chat-cache";

const LS_KEYS_TO_REMOVE = [
  "shop-cart",
  "app_notifications",
  "bill-book-storage",
  "bill_create_autosave",
  "bill_create_skip_restore",
  "admin_nav_minimized",
  "billing:drafts:v1:index",
  "device-notifications-paused",
  "notification-sound-enabled",
  "notification-sound-tone",
  "offline_warning_shown",
  "NEVER_ASK_NOTIFICATIONS",
  "PWA_DISMISS_COUNT",
  "PWA_DISMISS_TIME",
];

const LS_PREFIXES_TO_REMOVE = [
  "billing:drafts:v1:draft:",
  "fcm-registered:",
  "fcm-pending-token:",
  "device-session-active:",
  "cashbook-composer:",
  "admin_welcome_seen",
  "customer_welcome_guide_seen",
];

const SS_KEYS_TO_REMOVE = [
  "auto-logout-info",
  "recentUpdatedBillIds",
  "system-locked",
  "pendingOfferClaim",
  "customer_welcome_guide_seen",
  "admin_welcome_seen",
];

const SS_PREFIXES_TO_REMOVE = [
  "recentView_",
  "recentProcessed_",
  "recentHandled_",
];

async function clearIndexedDBDatabases() {
  await clearChatCache();
  for (const dbName of ["shop_queue_db", "pwa-notifications"]) {
    try {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    } catch {
      // best-effort
    }
  }
}

function clearLocalStorage() {
  for (const key of LS_KEYS_TO_REMOVE) {
    try { localStorage.removeItem(key); } catch {}
  }
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && LS_PREFIXES_TO_REMOVE.some((p) => key.startsWith(p))) {
      try { localStorage.removeItem(key); } catch {}
    }
  }
}

function clearSessionStorage() {
  for (const key of SS_KEYS_TO_REMOVE) {
    try { sessionStorage.removeItem(key); } catch {}
  }
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key && SS_PREFIXES_TO_REMOVE.some((p) => key.startsWith(p))) {
      try { sessionStorage.removeItem(key); } catch {}
    }
  }
}

async function resetInMemoryStores() {
  try {
    const { useCartStore } = await import("../store/cart-store");
    useCartStore.getState().clearCart();
  } catch {}
  try {
    const { useBillBookStore } = await import("../store/bill-book-store");
    useBillBookStore.setState({ bills: [], messagesByBillId: {}, summary: null });
  } catch {}
  try {
    const { useNotificationStore } = await import("../store/notification-store");
    useNotificationStore.setState({ items: [], unread: 0 });
  } catch {}
  try {
    const { useSettingsStore } = await import("../store/settings-store");
    useSettingsStore.setState({
      visitingChargesDefault: 0,
      repairFeeDefault: 0,
      offlineAutoUploadDefault: true,
      showInAppNotifications: true,
      showNotificationPopover: true,
      playSoundOnNotification: false,
      pauseIncomingNotifications: false,
    });
  } catch {}
  try {
    const { useDataStore } = await import("../store/data-store");
    useDataStore.setState({
      bills: [], customers: [], products: [], brands: [], categories: [],
      users: [], inventoryItems: [], isLoading: false,
    });
  } catch {}
}

export async function clearUserData() {
  if (typeof window === "undefined") return;
  clearLocalStorage();
  clearSessionStorage();
  await resetInMemoryStores();
  await clearIndexedDBDatabases();
}
