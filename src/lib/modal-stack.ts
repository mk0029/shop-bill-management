"use client";

export type ModalStackEntry = {
  id: string;
  close: () => void;
};

type InternalEntry = ModalStackEntry & {
  token: string;
};

type StackListener = (stack: readonly InternalEntry[]) => void;

const OVERLAY_STATE_KEY = "__modalOverlayToken";

class ModalStackManager {
  private stack: InternalEntry[] = [];
  private listeners = new Set<StackListener>();
  private consumedByPopState = new Set<string>();
  private suppressPopStateCount = 0;
  private previousBodyOverflow: string | null = null;
  private previousHtmlOverflow: string | null = null;
  private installed = false;

  install() {
    if (this.installed || typeof window === "undefined") return;
    this.installed = true;
    window.addEventListener("popstate", this.handlePopState);
  }

  uninstall() {
    if (!this.installed || typeof window === "undefined") return;
    this.installed = false;
    window.removeEventListener("popstate", this.handlePopState);
    this.unlockScroll();
  }

  subscribe(listener: StackListener) {
    this.listeners.add(listener);
    listener(this.stack);
    return () => {
      this.listeners.delete(listener);
    };
  }

  push(entry: ModalStackEntry) {
    if (typeof window === "undefined") return "";
    this.install();

    const token = `${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.stack = [...this.stack, { ...entry, token }];
    window.history.pushState(
      {
        ...(window.history.state || {}),
        modalOverlay: entry.id,
        [OVERLAY_STATE_KEY]: token,
      },
      "",
    );
    this.emit();
    return token;
  }

  remove(token: string) {
    if (!token) return;

    const index = this.stack.findIndex((entry) => entry.token === token);
    if (index === -1) {
      this.consumedByPopState.delete(token);
      return;
    }

    const wasTop = index === this.stack.length - 1;
    this.stack = this.stack.filter((entry) => entry.token !== token);

    const alreadyConsumed = this.consumedByPopState.delete(token);
    if (
      wasTop &&
      !alreadyConsumed &&
      typeof window !== "undefined" &&
      window.history.state?.[OVERLAY_STATE_KEY] === token
    ) {
      this.suppressPopStateCount += 1;
      window.history.back();
    }

    this.emit();
  }

  resetForRouteChange() {
    this.stack = [];
    this.consumedByPopState.clear();
    this.suppressPopStateCount = 0;
    this.emit();
  }

  get size() {
    return this.stack.length;
  }

  private handlePopState = () => {
    if (this.suppressPopStateCount > 0) {
      this.suppressPopStateCount -= 1;
      return;
    }

    const top = this.stack.at(-1);
    if (!top) return;

    this.consumedByPopState.add(top.token);
    top.close();
  };

  private emit() {
    if (this.stack.length > 0) {
      this.lockScroll();
    } else {
      this.unlockScroll();
    }

    for (const listener of this.listeners) {
      listener(this.stack);
    }
  }

  private lockScroll() {
    if (typeof document === "undefined") return;
    if (this.previousBodyOverflow === null) {
      this.previousBodyOverflow = document.body.style.overflow;
      this.previousHtmlOverflow = document.documentElement.style.overflow;
    }
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  private unlockScroll() {
    if (typeof document === "undefined") return;
    if (this.previousBodyOverflow === null) return;
    document.body.style.overflow = this.previousBodyOverflow;
    document.documentElement.style.overflow = this.previousHtmlOverflow || "";
    this.previousBodyOverflow = null;
    this.previousHtmlOverflow = null;
  }
}

export const modalStack = new ModalStackManager();

