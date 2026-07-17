import { getAppRuntime } from "../runtime";
import type { ShareAdapter } from "./shareAdapter";
import { WebShareAdapter } from "./webShareAdapter";
import { NativeShareAdapter } from "./nativeShareAdapter";

let cached: ShareAdapter | null = null;

export function getShareAdapter(): ShareAdapter {
  if (cached) return cached;
  cached = getAppRuntime() === "android-native-wrapper"
    ? new NativeShareAdapter()
    : new WebShareAdapter();
  return cached;
}
