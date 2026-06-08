import "server-only";
import { createHash } from "node:crypto";
import { sanityClient } from "@/lib/sanity";
import { getActiveFcmTokensForUsers } from "@/lib/fcm/tokens.server";
import { sendNotificationEvent } from "@/services/notifications/notification-events.server";

type GreetingPrefs = {
  dailyGreetingEnabled?: boolean;
  festivalGreetingEnabled?: boolean;
  adminGreetingsEnabled?: boolean;
  customerGreetingsEnabled?: boolean;
  pushEnabled?: boolean;
  paused?: boolean;
  quietHours?: {
    enabled?: boolean;
    start?: string;
    end?: string;
  };
};

type GreetingUser = {
  _id: string;
  role?: string;
  notificationTimezone?: string;
  notificationLanguage?: string;
  notificationPreferences?: GreetingPrefs;
};

type FestivalDoc = {
  _id: string;
  name: string;
  date: string;
  year: number;
  title?: string;
  body?: string;
  emoji?: string;
  slug?: { current?: string };
};

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const MORNING_START_HOUR = 7;
const MORNING_END_HOUR = 10;

const FESTIVAL_SEED_2026 = [
  { name: "Makar Sankranti", slug: "makar-sankranti", date: "2026-01-14", emoji: "🪁", sourceUrl: "https://www.timeanddate.com/holidays/india/makar-sankranti" },
  { name: "Maha Shivratri", slug: "maha-shivratri", date: "2026-02-15", emoji: "🔱", sourceUrl: "https://www.hindu-blog.com/2025/10/hindu-festivals-2026-list-of-important-festivals-calendar.html" },
  { name: "Holi", slug: "holi", date: "2026-03-03", emoji: "🌈", sourceUrl: "https://hindutone.com/festivals/holi/2026/" },
  { name: "Ram Navami", slug: "ram-navami", date: "2026-03-26", emoji: "🏹", sourceUrl: "https://www.timeanddate.com/holidays/india/rama-navami" },
  { name: "Hanuman Jayanti", slug: "hanuman-jayanti", date: "2026-04-02", emoji: "🙏", sourceUrl: "https://www.satvikworld.com/pages/hindu-calendar-festival-list" },
  { name: "Raksha Bandhan", slug: "raksha-bandhan", date: "2026-08-28", emoji: "🧶", sourceUrl: "https://www.satvikworld.com/pages/hindu-calendar-festival-list" },
  { name: "Janmashtami", slug: "janmashtami", date: "2026-09-04", emoji: "🪈", sourceUrl: "https://www.satvikworld.com/pages/hindu-calendar-festival-list" },
  { name: "Ganesh Chaturthi", slug: "ganesh-chaturthi", date: "2026-09-14", emoji: "🐘", sourceUrl: "https://www.satvikworld.com/pages/hindu-calendar-festival-list" },
  { name: "Navratri", slug: "navratri", date: "2026-10-11", emoji: "🪔", sourceUrl: "https://www.timeanddate.com/holidays/india/navratri" },
  { name: "Dussehra", slug: "dussehra", date: "2026-10-20", emoji: "🏹", sourceUrl: "https://vedicgod.com/blog/navratri-2026-astrological-significance/" },
  { name: "Diwali", slug: "diwali", date: "2026-11-08", emoji: "🪔", sourceUrl: "https://diwali.info/diwali-dates" },
] as const;

function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    year: Number(get("year")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function parseTime(value?: string) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return hour * 60 + minute;
}

function isQuietNow(prefs: GreetingPrefs | undefined, hour: number, minute: number) {
  const quiet = prefs?.quietHours;
  if (!quiet?.enabled) return false;
  const start = parseTime(quiet.start);
  const end = parseTime(quiet.end);
  if (start == null || end == null) return false;
  const current = hour * 60 + minute;
  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function roleAllowsGreeting(user: GreetingUser) {
  const role = String(user.role || "");
  const prefs = user.notificationPreferences || {};
  if (prefs.paused || prefs.pushEnabled === false) return false;
  if ((role === "admin" || role === "super_admin" || role === "technician") && prefs.adminGreetingsEnabled === false) return false;
  if (role === "customer" && prefs.customerGreetingsEnabled === false) return false;
  return role === "customer" || role === "admin" || role === "super_admin" || role === "technician";
}

function logDocId(input: {
  userId: string;
  date: string;
  type: "dailyGreeting" | "festivalGreeting";
  festivalSlug?: string;
  tokenDocId?: string;
}) {
  const hash = createHash("sha256")
    .update(`${input.userId}|${input.date}|${input.type}|${input.festivalSlug || ""}|${input.tokenDocId || "user"}`)
    .digest("hex")
    .slice(0, 48);
  return `scheduledNotificationLog.${hash}`;
}

async function seedFestivalCalendar(year: number) {
  if (year !== 2026) return;
  const now = new Date().toISOString();
  await Promise.allSettled(
    FESTIVAL_SEED_2026.map((festival) =>
      sanityClient.createIfNotExists({
        _id: `festivalCalendar.${festival.date}.${festival.slug}`,
        _type: "festivalCalendar",
        name: festival.name,
        slug: { _type: "slug", current: festival.slug },
        date: festival.date,
        year,
        emoji: festival.emoji,
        title: `Happy ${festival.name} ${festival.emoji}`,
        body: "Wishing you and your family happiness and prosperity.",
        isActive: true,
        source: "seeded",
        sourceUrl: festival.sourceUrl,
        notes: "Seeded fallback calendar. Admins can edit this date if a regional calendar differs.",
        createdAt: now,
        updatedAt: now,
      }),
    ),
  );
}

async function festivalsForDate(localDate: string, year: number) {
  await seedFestivalCalendar(year);
  return sanityClient.fetch<FestivalDoc[]>(
    `*[_type=="festivalCalendar" && isActive != false && date==$date] | order(name asc) {
      _id,
      name,
      date,
      year,
      title,
      body,
      emoji,
      slug
    }`,
    { date: localDate },
  );
}

async function hasUserLog(userId: string, date: string, type: "dailyGreeting" | "festivalGreeting") {
  const existing = await sanityClient.fetch<string | null>(
    `*[_type=="scheduledNotificationLog" && userId==$userId && date==$date && notificationType==$type][0]._id`,
    { userId, date, type },
  );
  return Boolean(existing);
}

async function writeLog(input: {
  user: GreetingUser;
  date: string;
  timezone: string;
  type: "dailyGreeting" | "festivalGreeting";
  status: "sent" | "failed" | "skipped";
  reason?: string;
  festival?: FestivalDoc;
  notificationId?: string;
  token?: { _id?: string; token?: string; deviceId?: string; deviceName?: string };
}) {
  const festivalSlug = input.festival?.slug?.current || "";
  await sanityClient.createIfNotExists({
    _id: logDocId({
      userId: input.user._id,
      date: input.date,
      type: input.type,
      festivalSlug,
      tokenDocId: input.token?._id,
    }),
    _type: "scheduledNotificationLog",
    userId: input.user._id,
    user: { _type: "reference", _ref: input.user._id },
    notificationType: input.type,
    date: input.date,
    festivalName: input.festival?.name || "",
    festivalSlug,
    timezone: input.timezone,
    fcmToken: input.token?.token || "",
    tokenDocId: input.token?._id || "",
    deviceId: input.token?.deviceId || "",
    deviceName: input.token?.deviceName || "",
    status: input.status,
    reason: input.reason || "",
    notificationId: input.notificationId || "",
    sentAt: input.status === "sent" ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
  });
}

function festivalMessage(festival: FestivalDoc) {
  return {
    type: "festivalGreeting" as const,
    eventType: "scheduled.festivalGreeting" as const,
    title: festival.title || `Happy ${festival.name} ${festival.emoji || ""}`.trim(),
    body: festival.body || "Wishing you and your family happiness and prosperity.",
    festival,
  };
}

function dailyMessage() {
  return {
    type: "dailyGreeting" as const,
    eventType: "scheduled.dailyGreeting" as const,
    title: "Good Morning ☀️",
    body: "Start your day with fresh updates.",
    festival: undefined,
  };
}

async function sendForUser(user: GreetingUser, now: Date, force = false) {
  const timezone = user.notificationTimezone || DEFAULT_TIMEZONE;
  const local = localDateParts(now, timezone);
  const prefs = user.notificationPreferences || {};

  if (!roleAllowsGreeting(user)) {
    await writeLog({ user, date: local.date, timezone, type: "dailyGreeting", status: "skipped", reason: "preferences_disabled" });
    return { sent: 0, skipped: 1, failed: 0 };
  }
  if (!force && (local.hour < MORNING_START_HOUR || local.hour > MORNING_END_HOUR)) {
    return { sent: 0, skipped: 1, failed: 0 };
  }
  if (isQuietNow(prefs, local.hour, local.minute)) {
    await writeLog({ user, date: local.date, timezone, type: "dailyGreeting", status: "skipped", reason: "quiet_hours" });
    return { sent: 0, skipped: 1, failed: 0 };
  }

  const festivals = prefs.festivalGreetingEnabled === false ? [] : await festivalsForDate(local.date, local.year);
  const message = festivals[0] ? festivalMessage(festivals[0]) : dailyMessage();
  if (message.type === "dailyGreeting" && prefs.dailyGreetingEnabled === false) {
    await writeLog({ user, date: local.date, timezone, type: message.type, status: "skipped", reason: "daily_greeting_disabled" });
    return { sent: 0, skipped: 1, failed: 0 };
  }
  if (await hasUserLog(user._id, local.date, message.type)) return { sent: 0, skipped: 1, failed: 0 };

  const tokens = await getActiveFcmTokensForUsers([user._id]);
  const eventId = `${message.eventType}.${user._id}.${local.date}${message.festival ? `.${message.festival.slug?.current || message.festival._id}` : ""}`;
  const result = await sendNotificationEvent({
    eventId,
    type: message.eventType,
    userId: user._id,
    title: message.title,
    body: message.body,
    data: {
      category: "scheduled_greeting",
      scheduledType: message.type,
      festivalName: message.festival?.name || "",
      festivalDate: message.festival?.date || "",
      date: local.date,
      route: "/",
      tag: `scheduled-greeting-${user._id}-${local.date}`,
      replaceGroup: "scheduled-greeting",
    },
  });

  if (!tokens.length) {
    await writeLog({
      user,
      date: local.date,
      timezone,
      type: message.type,
      status: "skipped",
      reason: "no_active_tokens",
      festival: message.festival,
      notificationId: result.notificationId,
    });
    return { sent: 0, skipped: 1, failed: 0 };
  }

  const invalid = new Set(result.send.invalidTokens || []);
  await Promise.allSettled(
    tokens.map((token) =>
      writeLog({
        user,
        date: local.date,
        timezone,
        type: message.type,
        status: invalid.has(token.token) || result.send.success === false ? (invalid.has(token.token) ? "failed" : result.send.sent > 0 ? "sent" : "failed") : "sent",
        reason: invalid.has(token.token) ? "invalid_or_expired_token" : result.error || result.send.errors?.join("; ") || "",
        festival: message.festival,
        notificationId: result.notificationId,
        token,
      }),
    ),
  );

  return {
    sent: result.send.sent,
    skipped: 0,
    failed: result.send.failed,
  };
}

export async function runScheduledGreetings(input?: { now?: Date; force?: boolean }) {
  const now = input?.now || new Date();
  const users = await sanityClient.fetch<GreetingUser[]>(
    `*[_type=="user" && isActive != false && role in ["customer","admin","super_admin","technician"]]{
      _id,
      role,
      notificationTimezone,
      notificationLanguage,
      notificationPreferences
    }`,
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const user of users || []) {
    try {
      const result = await sendForUser(user, now, Boolean(input?.force));
      sent += result.sent;
      skipped += result.skipped;
      failed += result.failed;
    } catch (error) {
      failed += 1;
      console.error("[ScheduledGreetings] user failed", user._id, error);
    }
  }

  return {
    ok: true,
    users: users.length,
    sent,
    skipped,
    failed,
    at: now.toISOString(),
  };
}
