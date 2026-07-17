import { isAndroidNativeWrapper } from "../runtime";
import type {
  NotificationAdapter,
  NotificationPermission,
  ForegroundMessage,
} from "./notificationAdapter";

interface BridgeResponse<T = unknown> {
  id: string;
  type: string;
  payload: T;
}

export class NativeNotificationAdapter implements NotificationAdapter {
  private pendingResolve: ((value: unknown) => void) | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private messageCounter = 0;
  private foregroundUnsub: (() => void) | null = null;

  async requestPermission(): Promise<NotificationPermission> {
    const result = await this.sendBridgeRequest<{ status: string }>(
      "REQUEST_NOTIFICATION_PERMISSION"
    );
    if (result?.status === "granted") return "granted";
    if (result?.status === "denied") return "denied";
    return "unsupported";
  }

  getPermission(): NotificationPermission {
    return "granted";
  }

  async getToken(options?: { forceRefresh?: boolean }): Promise<string | null> {
    const result = await this.sendBridgeRequest<{ token: string }>(
      "GET_NATIVE_FCM_TOKEN",
      { forceRefresh: options?.forceRefresh }
    );
    return result?.token || null;
  }

  async registerDevice(userId: string): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;
    const result = await this.sendBridgeRequest<{ success: boolean }>(
      "REGISTER_CURRENT_DEVICE",
      { userId, token }
    );
    return result?.success ?? false;
  }

  async unregisterDevice(userId: string): Promise<boolean> {
    const result = await this.sendBridgeRequest<{ success: boolean }>(
      "AUTH_LOGOUT",
      { userId }
    );
    return result?.success ?? false;
  }

  listenForeground(handler: (msg: ForegroundMessage) => void): () => void {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "NATIVE_NOTIFICATION_RECEIVED") {
        try {
          handler(event.data.payload as ForegroundMessage);
        } catch {
          void 0;
        }
      }
    };
    window.addEventListener("message", listener);
    this.foregroundUnsub = () => window.removeEventListener("message", listener);
    return () => {
      this.foregroundUnsub?.();
      this.foregroundUnsub = null;
    };
  }

  isSupported(): boolean {
    return isAndroidNativeWrapper();
  }

  private sendBridgeRequest<T>(
    type: string,
    payload?: Record<string, unknown>
  ): Promise<T | null> {
    if (!window.ReactNativeWebView) {
      return Promise.resolve(null);
    }

    const id = `ntf_${++this.messageCounter}_${Date.now()}`;

    const envelope = {
      version: 1,
      id,
      type,
      timestamp: Date.now(),
      payload: payload || {},
    };

    return new Promise<T | null>((resolve) => {
      this.pendingResolve = resolve as (value: unknown) => void;

      this.timeoutId = setTimeout(() => {
        this.pendingResolve = null;
        resolve(null);
      }, 5000);

      const handler = (event: MessageEvent) => {
        if (event.data?.id === id) {
          this.cleanup();
          resolve(event.data.payload as T);
        }
      };

      window.addEventListener("message", handler, { once: true });

      try {
        window.ReactNativeWebView.postMessage(JSON.stringify(envelope));
      } catch {
        this.cleanup();
        resolve(null);
      }
    });
  }

  private cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.pendingResolve = null;
  }
}
