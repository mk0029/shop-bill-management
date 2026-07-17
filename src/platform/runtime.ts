export type AppRuntime = "web-browser" | "pwa" | "android-native-wrapper";

declare global {
  interface Window {
    __JAMBH_NATIVE_APP__?: {
      platform: "android";
      wrapper: "expo";
      bridgeVersion: number;
    };
    ReactNativeWebView?: {
      postMessage(message: string): void;
    };
  }
}

export function isAndroidNativeWrapper(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.__JAMBH_NATIVE_APP__?.platform === "android" &&
      window.__JAMBH_NATIVE_APP__?.wrapper === "expo" &&
      window.ReactNativeWebView
  );
}

export function isInstalledPwa(): boolean {
  if (typeof window === "undefined") return false;
  const displayMode =
    window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean(
      (window.navigator as Navigator & { standalone?: boolean }).standalone
    );
  return displayMode || iosStandalone;
}

export function getAppRuntime(): AppRuntime {
  if (isAndroidNativeWrapper()) return "android-native-wrapper";
  if (isInstalledPwa()) return "pwa";
  return "web-browser";
}
