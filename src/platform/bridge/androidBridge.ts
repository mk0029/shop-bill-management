"use client";

export interface BridgeEnvelope {
  version: number;
  id: string;
  type: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

type NativeCallback = (payload: Record<string, unknown>) => void;

const BRIDGE_VERSION = 1;
const RESPONSE_TIMEOUT = 10000;

let _initialized = false;
const _listeners = new Map<string, Set<NativeCallback>>();
const _pending = new Map<string, { resolve: (v: any) => void; timer: NodeJS.Timeout }>();

function getNativeApp(): boolean {
  return typeof window !== "undefined" && !!(window as any).__JAMBH_NATIVE_APP__;
}

function getReactNativeWebView(): any {
  return (window as any).ReactNativeWebView;
}

function isRunningInNativeWrapper(): boolean {
  return getNativeApp() && !!getReactNativeWebView();
}

export function sendNativeMessage(
  type: string,
  payload: Record<string, unknown> = {}
): Promise<BridgeEnvelope> {
  return new Promise((resolve, reject) => {
    if (!isRunningInNativeWrapper()) {
      reject(new Error("Not in native wrapper"));
      return;
    }

    const id = `wtn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const envelope: BridgeEnvelope = {
      version: BRIDGE_VERSION,
      id,
      type,
      timestamp: Date.now(),
      payload,
    };

    const timer = setTimeout(() => {
      _pending.delete(id);
      reject(new Error(`Bridge timeout for ${type}`));
    }, RESPONSE_TIMEOUT);

    _pending.set(id, { resolve, timer });

    try {
      getReactNativeWebView().postMessage(JSON.stringify(envelope));
    } catch (e) {
      clearTimeout(timer);
      _pending.delete(id);
      reject(e);
    }
  });
}

export function onNativeEvent(type: string, callback: NativeCallback): () => void {
  if (!_listeners.has(type)) {
    _listeners.set(type, new Set());
  }
  _listeners.get(type)!.add(callback);

  return () => {
    _listeners.get(type)?.delete(callback);
  };
}

function handleNativeResponse(data: string): void {
  try {
    const envelope: BridgeEnvelope = JSON.parse(data);
    const pending = _pending.get(envelope.id);
    if (pending) {
      clearTimeout(pending.timer);
      _pending.delete(envelope.id);
      pending.resolve(envelope);
      return;
    }
    const typeListeners = _listeners.get(envelope.type);
    if (typeListeners) {
      typeListeners.forEach((cb) => cb(envelope.payload || {}));
    }
  } catch {
    void 0;
  }
}

export function initializeAndroidBridge(): void {
  if (_initialized || !isRunningInNativeWrapper()) return;
  _initialized = true;

  window.addEventListener("message", (event) => {
    if (typeof event.data === "string") {
      handleNativeResponse(event.data);
    }
  });

  window.addEventListener("__jambh_native_message", ((event: CustomEvent) => {
    const raw = typeof event.detail === "string"
      ? event.detail
      : JSON.stringify(event.detail);
    handleNativeResponse(raw);
  }) as EventListener);
}

export function isAndroidNativeWrapper(): boolean {
  return isRunningInNativeWrapper();
}
