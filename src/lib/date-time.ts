export function toDate(input?: string | Date | null): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDayDate(input?: string | Date | null, locale = "en-IN"): string {
  const d = toDate(input);
  if (!d) return "-";
  const day = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(d);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${day} ${dd}/${mm}`;
}

export function formatTime(input?: string | Date | null, locale = "en-IN"): string {
  const d = toDate(input);
  if (!d) return "-";
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatDayDateTime(input?: string | Date | null, locale = "en-IN"): string {
  const d = toDate(input);
  if (!d) return "-";
  return `${formatDayDate(d, locale)} at ${formatTime(d, locale)}`;
}

export function isSameCalendarDate(
  a?: string | Date | null,
  b?: string | Date | null,
): boolean {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function formatApproachTime(
  dueAt?: string | Date | null,
  now: string | Date = new Date(),
  locale = "en-IN",
): string {
  const due = toDate(dueAt);
  if (!due) return "-";
  if (isSameCalendarDate(due, now)) return formatTime(due, locale);
  return `${formatDayDate(due, locale)} at ${formatTime(due, locale)}`;
}

export function formatRelativeDayDateTime(
  input?: string | Date | null,
  now: string | Date = new Date(),
  locale = "en-IN",
): string {
  const d = toDate(input);
  const n = toDate(now);
  if (!d || !n) return "-";
  if (isSameCalendarDate(d, n)) return `Today at ${formatTime(d, locale)}`;
  const tomorrow = new Date(n);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameCalendarDate(d, tomorrow)) return `Tomorrow at ${formatTime(d, locale)}`;
  return `${formatDayDate(d, locale)} at ${formatTime(d, locale)}`;
}
