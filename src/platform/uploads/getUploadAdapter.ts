import { getAppRuntime } from "../runtime";
import type { UploadAdapter } from "./uploadAdapter";
import { WebUploadAdapter } from "./webUploadAdapter";
import { NativeUploadAdapter } from "./nativeUploadAdapter";

let cached: UploadAdapter | null = null;

export function getUploadAdapter(): UploadAdapter {
  if (cached) return cached;
  const runtime = getAppRuntime();
  cached = runtime === "android-native-wrapper"
    ? new NativeUploadAdapter()
    : new WebUploadAdapter();
  return cached;
}

export function resetUploadAdapter(): void {
  cached = null;
}
