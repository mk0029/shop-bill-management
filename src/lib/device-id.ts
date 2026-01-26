/**
 * Device ID utilities for FCM token registration.
 * Generates a stable deviceId per browser/device and persists it.
 */

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'fcm-device-id';
  try {
    let deviceId = window.localStorage.getItem(key);
    if (deviceId) return deviceId;
    // Generate a new deviceId (UUID v4-like)
    deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    window.localStorage.setItem(key, deviceId);
    return deviceId;
  } catch {
    return '';
  }
}

export function getPlatformInfo(): { userAgent: string; language: string; timezone: string } {
  if (typeof window === 'undefined') return { userAgent: '', language: '', timezone: '' };
  return {
    userAgent: navigator.userAgent || '',
    language: navigator.language || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  };
}
