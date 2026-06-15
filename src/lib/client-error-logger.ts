"use client";

type ClientErrorInput = {
  source: string;
  message: string;
  stack?: string;
  userId?: string | null;
  extra?: Record<string, unknown>;
};

let lastLogKey = "";
let lastLogAt = 0;

function getNavigatorValue<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

export function getClientDeviceContext() {
  if (typeof window === "undefined") return {};

  const nav = window.navigator as Navigator & {
    userAgentData?: {
      brands?: Array<{ brand: string; version: string }>;
      mobile?: boolean;
      platform?: string;
    };
    deviceMemory?: number;
    connection?: { effectiveType?: string; downlink?: number; rtt?: number };
  };

  const userAgent = getNavigatorValue(() => nav.userAgent, "");
  const brands = nav.userAgentData?.brands
    ?.map((brand) => `${brand.brand}/${brand.version}`)
    .join(", ");

  return {
    userAgent,
    browser: brands || userAgent,
    platform: nav.userAgentData?.platform || getNavigatorValue(() => nav.platform, ""),
    isMobile: nav.userAgentData?.mobile ?? /Android|Mobile/i.test(userAgent),
    isOppo: /OPPO|CPH\d+|P[A-Z]{2,}\d+/i.test(userAgent),
    route: `${window.location.pathname}${window.location.search}`,
    time: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      visualHeight: window.visualViewport?.height,
      devicePixelRatio: window.devicePixelRatio,
    },
    capabilities: {
      serviceWorker: "serviceWorker" in navigator,
      notification: "Notification" in window,
      indexedDB: "indexedDB" in window,
      crypto: "crypto" in window,
      cryptoSubtle: Boolean(window.crypto?.subtle),
      localStorage: safeStorageAvailable("localStorage"),
      sessionStorage: safeStorageAvailable("sessionStorage"),
    },
    connection: nav.connection
      ? {
          effectiveType: nav.connection.effectiveType,
          downlink: nav.connection.downlink,
          rtt: nav.connection.rtt,
        }
      : undefined,
    memory: nav.deviceMemory,
  };
}

export function safeStorageAvailable(kind: "localStorage" | "sessionStorage") {
  if (typeof window === "undefined") return false;
  try {
    const storage = window[kind];
    const key = "__storage_probe__";
    storage.setItem(key, key);
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export async function logClientError(input: ClientErrorInput) {
  if (typeof window === "undefined") return;

  const key = `${input.source}:${input.message}:${input.stack?.slice(0, 160) || ""}`;
  const now = Date.now();
  if (key === lastLogKey && now - lastLogAt < 5000) return;
  lastLogKey = key;
  lastLogAt = now;

  const payload = {
    ...getClientDeviceContext(),
    ...input,
  };

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        "/api/client-error-logs",
        new Blob([body], { type: "application/json" }),
      );
      if (sent) return;
    }
    await fetch("/api/client-error-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Logging must never become another app crash.
  }
}

export function normalizeUnknownError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: "Unknown client error" };
  }
}
