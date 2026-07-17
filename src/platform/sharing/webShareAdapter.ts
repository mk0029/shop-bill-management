import type { ShareAdapter } from "./shareAdapter";

export class WebShareAdapter implements ShareAdapter {
  async share(url: string, title: string, text?: string): Promise<boolean> {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch {
        return false;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }

  getSupported(): boolean {
    return typeof window !== "undefined" && "navigator" in window;
  }
}
