import { getAppRuntime } from "../runtime";
import type { NotificationAdapter } from "./notificationAdapter";
import { WebNotificationAdapter } from "./webNotificationAdapter";
import { NativeNotificationAdapter } from "./nativeNotificationAdapter";

let cached: NotificationAdapter | null = null;

export function getNotificationAdapter(): NotificationAdapter {
  if (cached) return cached;

  const runtime = getAppRuntime();

  if (runtime === "android-native-wrapper") {
    cached = new NativeNotificationAdapter();
  } else {
    cached = new WebNotificationAdapter();
  }

  return cached;
}

export function resetNotificationAdapter(): void {
  cached = null;
}
