import { toast } from "sonner";

let lastErrorToastAt = 0;
const ERROR_TOAST_COOLDOWN_MS = 10_000;

function isFetchTransportError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("Failed to fetch") ||
    msg.includes("FetchTransport") ||
    msg.includes("NetworkError") ||
    msg.includes("ERR_NETWORK") ||
    msg.includes("ERR_CONNECTION") ||
    msg.includes("Load failed")
  );
}

function isTimeoutError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("No activity within 45000 milliseconds") ||
    msg.includes("timeout") ||
    msg.includes("TIMEOUT")
  );
}

export function handleRealtimeError(error: unknown) {
  // Suppress noisy network/transport errors — these are expected during
  // page navigation, network blips, or when Sanity SSE reconnects.
  // Only show toast if we haven't shown one recently.
  if (isFetchTransportError(error)) {
    console.warn("[realtime] SSE transport error (will auto-reconnect):", error instanceof Error ? error.message : error);
    return; // Silent — the @sanity/client handles reconnection internally
  }

  if (isTimeoutError(error)) {
    const now = Date.now();
    if (now - lastErrorToastAt < ERROR_TOAST_COOLDOWN_MS) return;
    lastErrorToastAt = now;
    toast.error("Real-time connection timeout", {
      description: "Live updates paused. They will resume automatically.",
      duration: 5000,
    });
    return;
  }

  // Log other unexpected errors but don't spam toasts
  console.warn("[realtime] subscription error:", error instanceof Error ? error.message : error);
}
