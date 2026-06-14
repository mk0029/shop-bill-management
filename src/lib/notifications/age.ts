export const NOTIFICATION_MAX_AGE = 2 * 24 * 60 * 60 * 1000;

export function isNotificationRecent(createdAt?: string | Date | null, now = Date.now()) {
  const timestamp =
    createdAt instanceof Date
      ? createdAt.getTime()
      : Date.parse(String(createdAt || ""));

  if (!Number.isFinite(timestamp)) return false;
  return now - timestamp <= NOTIFICATION_MAX_AGE;
}

export function notificationCutoffIso(now = Date.now()) {
  return new Date(now - NOTIFICATION_MAX_AGE).toISOString();
}
