import { getAppRuntime } from "../runtime";
import type { DownloadAdapter } from "./downloadAdapter";
import { WebDownloadAdapter } from "./webDownloadAdapter";
import { NativeDownloadAdapter } from "./nativeDownloadAdapter";

let cached: DownloadAdapter | null = null;

export function getDownloadAdapter(): DownloadAdapter {
  if (cached) return cached;
  cached = getAppRuntime() === "android-native-wrapper"
    ? new NativeDownloadAdapter()
    : new WebDownloadAdapter();
  return cached;
}
