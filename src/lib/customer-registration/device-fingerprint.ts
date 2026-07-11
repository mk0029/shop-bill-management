const STORAGE_KEY = "pending_registration";

export interface DeviceStorage {
  requestId: string;
  token: string;
  timestamp: number;
  expiresAt: number;
}

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "";
  const key = "jambh-device-id";
  try {
    let deviceId = window.localStorage.getItem(key);
    if (deviceId) return deviceId;
    deviceId = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 10);
    window.localStorage.setItem(key, deviceId);
    return deviceId;
  } catch {
    return "";
  }
}

export function getStoredRegistration(): DeviceStorage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as DeviceStorage;
    if (Date.now() > data.expiresAt) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function storeRegistration(data: DeviceStorage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
  }
}

export function clearStoredRegistration(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}
