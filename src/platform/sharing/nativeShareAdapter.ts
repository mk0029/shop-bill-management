import { isAndroidNativeWrapper } from "../runtime";
import type { ShareAdapter } from "./shareAdapter";

export class NativeShareAdapter implements ShareAdapter {
  async share(url: string, title: string, text?: string): Promise<boolean> {
    if (!window.ReactNativeWebView) return false;
    const envelope = {
      version: 1,
      id: `shr_${Date.now()}`,
      type: "SHARE_FILE",
      timestamp: Date.now(),
      payload: { url, title, text },
    };
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }

  getSupported(): boolean {
    return isAndroidNativeWrapper();
  }
}
