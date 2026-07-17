import { getAppRuntime, type AppRuntime } from "./runtime";

export interface PlatformCapabilities {
  runtime: AppRuntime;
  nativePush: boolean;
  nativeMediaPicker: boolean;
  nativeFileSystem: boolean;
  nativeUploadQueue: boolean;
  backgroundUpload: boolean;
  serviceWorker: boolean;
  indexedDb: boolean;
  webNotification: boolean;
  webShare: boolean;
  backgroundSync: boolean;
  offlineSupport: boolean;
  secureStorage: boolean;
  socketReconnect: boolean;
}

let cached: PlatformCapabilities | null = null;

export function getPlatformCapabilities(): PlatformCapabilities {
  if (cached) return cached;

  const runtime = getAppRuntime();
  const isBrowser = typeof window !== "undefined";
  const isSafari = isBrowser && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS = isBrowser && /iphone|ipad|ipod/i.test(navigator.userAgent);

  cached = {
    runtime,
    nativePush: runtime === "android-native-wrapper",
    nativeMediaPicker: runtime === "android-native-wrapper",
    nativeFileSystem: runtime === "android-native-wrapper",
    nativeUploadQueue: runtime === "android-native-wrapper",
    backgroundUpload: runtime === "android-native-wrapper",
    serviceWorker: "serviceWorker" in (navigator || {}),
    indexedDb: "indexedDB" in (window || {}),
    webNotification: "Notification" in (window || {}),
    webShare: "share" in (navigator || {}),
    backgroundSync: "SyncManager" in (window || {}),
    offlineSupport: runtime === "pwa" || runtime === "android-native-wrapper",
    secureStorage: runtime === "android-native-wrapper" || runtime === "pwa",
    socketReconnect: !isSafari || !isIOS,
  };

  return cached;
}

export function resetCapabilitiesCache(): void {
  cached = null;
}
