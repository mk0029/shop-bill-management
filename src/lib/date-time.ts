export function toDate(input?: string | Date | null): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DEFAULT_TIME_ZONE = "Asia/Kolkata";

function getDateParts(
  input?: string | Date | null,
  locale = "en-IN",
  timeZone = DEFAULT_TIME_ZONE,
) {
  const d = toDate(input);
  if (!d) return null;
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(d);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    dayName: String(map.weekday || ""),
    dd: String(map.day || "").padStart(2, "0"),
    mm: String(map.month || "").padStart(2, "0"),
    yyyy: String(map.year || ""),
  };
}

export function formatDayDate(
  input?: string | Date | null,
  locale = "en-IN",
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const d = toDate(input);
  if (!d) return "-";
  const parts = getDateParts(d, locale, timeZone);
  if (!parts) return "-";
  return `${parts.dayName} ${parts.dd}/${parts.mm}`;
}

export function formatTime(
  input?: string | Date | null,
  locale = "en-IN",
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const d = toDate(input);
  if (!d) return "-";
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatDayDateTime(
  input?: string | Date | null,
  locale = "en-IN",
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const d = toDate(input);
  if (!d) return "-";
  return `${formatDayDate(d, locale, timeZone)} at ${formatTime(d, locale, timeZone)}`;
}

export function isSameCalendarDate(
  a?: string | Date | null,
  b?: string | Date | null,
  locale = "en-IN",
  timeZone = DEFAULT_TIME_ZONE,
): boolean {
  const pa = getDateParts(a, locale, timeZone);
  const pb = getDateParts(b, locale, timeZone);
  if (!pa || !pb) return false;
  return pa.yyyy === pb.yyyy && pa.mm === pb.mm && pa.dd === pb.dd;
}

export function formatApproachTime(
  dueAt?: string | Date | null,
  now: string | Date = new Date(),
  locale = "en-IN",
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const due = toDate(dueAt);
  if (!due) return "-";
  if (isSameCalendarDate(due, now, locale, timeZone))
    return formatTime(due, locale, timeZone);
  return `${formatDayDate(due, locale, timeZone)} at ${formatTime(
    due,
    locale,
    timeZone,
  )}`;
}

export function formatRelativeDayDateTime(
  input?: string | Date | null,
  now: string | Date = new Date(),
  locale = "en-IN",
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const d = toDate(input);
  const n = toDate(now);
  if (!d || !n) return "-";
  if (isSameCalendarDate(d, n, locale, timeZone))
    return `Today at ${formatTime(d, locale, timeZone)}`;
  const tomorrow = new Date(n);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameCalendarDate(d, tomorrow, locale, timeZone))
    return `Tomorrow at ${formatTime(d, locale, timeZone)}`;
  return `${formatDayDate(d, locale, timeZone)} at ${formatTime(
    d,
    locale,
    timeZone,
  )}`;
}
