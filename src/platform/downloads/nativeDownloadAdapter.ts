import { isAndroidNativeWrapper } from "../runtime";
import type { DownloadAdapter } from "./downloadAdapter";

export class NativeDownloadAdapter implements DownloadAdapter {
  async download(url: string, filename: string): Promise<void> {
    if (!window.ReactNativeWebView) return;
    const envelope = {
      version: 1,
      id: `dwn_${Date.now()}`,
      type: "DOWNLOAD_FILE",
      timestamp: Date.now(),
      payload: { url, filename },
    };
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify(envelope));
    } catch {
      void 0;
    }
  }

  getSupported(): boolean {
    return isAndroidNativeWrapper();
  }
}
