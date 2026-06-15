export const NOTIFICATION_MAX_AGE = 2 * 24 * 60 * 60 * 1000;
export const SCHEDULED_GREETING_MAX_AGE = 12 * 60 * 60 * 1000;

const SCHEDULED_GREETING_TYPES = new Set([
  "daily_good_morning",
  "hindu_festival_greeting",
]);

export function notificationMaxAgeForType(type?: string | null) {
  return SCHEDULED_GREETING_TYPES.has(String(type || ""))
    ? SCHEDULED_GREETING_MAX_AGE
    : NOTIFICATION_MAX_AGE;
}

export function isNotificationRecent(
  createdAt?: string | Date | null,
  now = Date.now(),
  type?: string | null,
) {
  const timestamp =
    createdAt instanceof Date
      ? createdAt.getTime()
      : Date.parse(String(createdAt || ""));

  if (!Number.isFinite(timestamp)) return false;
  return now - timestamp <= notificationMaxAgeForType(type);
}

export function notificationCutoffIso(now = Date.now()) {
  return new Date(now - NOTIFICATION_MAX_AGE).toISOString();
}

export function scheduledGreetingCutoffIso(now = Date.now()) {
  return new Date(now - SCHEDULED_GREETING_MAX_AGE).toISOString();
}
