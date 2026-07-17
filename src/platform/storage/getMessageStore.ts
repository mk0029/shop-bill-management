import { getAppRuntime } from "../runtime";
import type { LocalMessageStore } from "./localMessageStore";
import { IndexedDbMessageStore } from "./indexedDbMessageStore";
import { NativeBridgeMessageStore } from "./nativeMessageStore";

let cached: LocalMessageStore | null = null;

export function getMessageStore(): LocalMessageStore {
  if (cached) return cached;

  const runtime = getAppRuntime();

  if (runtime === "android-native-wrapper") {
    cached = new NativeBridgeMessageStore();
  } else if (typeof window !== "undefined" && "indexedDB" in window) {
    cached = new IndexedDbMessageStore();
  } else {
    throw new Error("No storage backend available");
  }

  return cached;
}

export function resetMessageStore(): void {
  cached = null;
}
