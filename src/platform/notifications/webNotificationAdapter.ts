import type { MessagePayload } from "firebase/messaging";
import {
  getFcmToken,
  onForegroundMessage,
  ensureMessagingServiceWorker,
} from "@/lib/firebase/messaging";
import { getDeviceInfo } from "@/lib/fcm/device";
import type {
  NotificationAdapter,
  NotificationPermission,
  ForegroundMessage,
} from "./notificationAdapter";
import { mapFirebasePayload } from "./notificationAdapter";

export class WebNotificationAdapter implements NotificationAdapter {
  private foregroundUnsub: (() => void) | null = null;

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    try {
      const result = await Notification.requestPermission();
      return result as NotificationPermission;
    } catch {
      return "unsupported";
    }
  }

  getPermission(): NotificationPermission {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission as NotificationPermission;
  }

  async getToken(options?: { forceRefresh?: boolean }): Promise<string | null> {
    if (this.getPermission() !== "granted") return null;
    try {
      await ensureMessagingServiceWorker().catch(() => undefined);
      return await getFcmToken({ forceRefresh: options?.forceRefresh });
    } catch {
      return null;
    }
  }

  async registerDevice(userId: string): Promise<boolean> {
    if (!userId) return false;
    const token = await this.getToken();
    if (!token) return false;
    const deviceInfo = getDeviceInfo();
    try {
      const res = await fetch("/api/notifications/register-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          token,
          role: deviceInfo.role || "",
          deviceInfo: {
            ...deviceInfo,
            appType: this.getAppType(),
          },
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async unregisterDevice(userId: string): Promise<boolean> {
    if (!userId) return false;
    const token = await this.getToken();
    if (!token) return false;
    try {
      const res = await fetch("/api/notifications/unregister-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, token }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  listenForeground(handler: (msg: ForegroundMessage) => void): () => void {
    try {
      this.foregroundUnsub = onForegroundMessage((payload: MessagePayload) => {
        handler(mapFirebasePayload(payload));
      });
    } catch {
      void 0;
    }
    return () => {
      this.foregroundUnsub?.();
      this.foregroundUnsub = null;
    };
  }

  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator
    );
  }

  private getAppType(): "browser" | "pwa" {
    if (typeof window === "undefined") return "browser";
    const displayMode =
      window.matchMedia?.("(display-mode: standalone)").matches ?? false;
    const iosStandalone = (window.navigator as any).standalone;
    return displayMode || iosStandalone ? "pwa" : "browser";
  }
}
