"use client";

const DEVICE_ID_KEY = "fcm-device-id";

export function getDeviceId() {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return "";
  }
}

export function getDeviceInfo() {
  if (typeof window === "undefined") {
    return { deviceId: "", deviceName: "Device", browser: "", os: "", platform: "", userAgent: "" };
  }
  const userAgent = navigator.userAgent || "";
  const browser = detectBrowser(userAgent);
  const os = detectOs(userAgent);
  const platform = navigator.platform || os;
  return {
    deviceId: getDeviceId(),
    deviceName: browser && os ? `${browser} on ${os}` : browser || os || "Device",
    browser,
    os,
    platform,
    userAgent,
  };
}

function detectBrowser(ua: string) {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  return "Browser";
}

function detectOs(ua: string) {
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) {
    const model = ua.match(/Android[^;]*;\s?([^;)]+)[;)]/i)?.[1]?.trim();
    return model || "Android";
  }
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "";
}
