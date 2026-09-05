import "server-only";
import { createHash } from "node:crypto";
import { sanityClient } from "@/lib/sanity";
import { getSanityClient as getCommsClient } from "@/lib/sanity/client-factory";
import { getActiveFcmTokensForUsers } from "@/lib/fcm/tokens.server";
import { createAndDispatchNotification } from "@/services/notifications/notification-events.server";
import { sanitizeUserText } from "@/constants/defaults";

type ScheduledNotificationType = "daily_good_morning" | "hindu_festival_greeting";

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
  name?: string;
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

type GreetingRunStats = {
  sent: number;
  skipped: number;
  failed: number;
};

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const MORNING_START_HOUR = 7;
const MORNING_END_HOUR = 10;
const GREETING_TTL_HOURS = 12;

const HINDU_FESTIVAL_FALLBACKS = [
  {
    name: "Makar Sankranti",
    slug: "makar-sankranti",
    emoji: "🪁",
    dates: { 2026: "2026-01-14", 2027: "2027-01-14" },
    body: "Wishing you a bright and prosperous Makar Sankranti.",
  },
  {
    name: "Maha Shivratri",
    slug: "maha-shivratri",
    emoji: "🔱",
    dates: { 2026: "2026-02-15", 2027: "2027-03-06" },
    body: "May Lord Shiva bless you with peace, strength, and happiness.",
  },
  {
    name: "Holi",
    slug: "holi",
    emoji: "🌈",
    dates: { 2026: "2026-03-04", 2027: "2027-03-22" },
    body: "Wishing you a colorful and joyful Holi.",
  },
  {
    name: "Ram Navami",
    slug: "ram-navami",
    emoji: "🏹",
    dates: { 2026: "2026-03-26", 2027: "2027-04-15" },
    body: "Wishing you peace, courage, and blessings on Ram Navami.",
  },
  {
    name: "Hanuman Jayanti",
    slug: "hanuman-jayanti",
    emoji: "🙏",
    dates: { 2026: "2026-04-02", 2027: "2027-04-22" },
    body: "May Lord Hanuman bless you with strength, devotion, and protection.",
  },
  {
    name: "Akshaya Tritiya",
    slug: "akshaya-tritiya",
    emoji: "✨",
    dates: { 2026: "2026-04-19", 2027: "2027-05-08" },
    body: "Wishing you prosperity and new beginnings on Akshaya Tritiya.",
  },
  {
    name: "Raksha Bandhan",
    slug: "raksha-bandhan",
    emoji: "",
    dates: { 2026: "2026-08-28", 2027: "2027-08-16" },
    body: "Wishing you a happy Raksha Bandhan.",
  },
  {
    name: "Janmashtami",
    slug: "janmashtami",
    emoji: "🦚",
    dates: { 2026: "2026-09-04", 2027: "2027-08-25" },
    body: "May Lord Krishna bring joy, love, and wisdom to your home.",
  },
  {
    name: "Ganesh Chaturthi",
    slug: "ganesh-chaturthi",
    emoji: "🐘",
    dates: { 2026: "2026-09-14", 2027: "2027-09-04" },
    body: "May Lord Ganesha remove obstacles and bring prosperity.",
  },
  {
    name: "Navratri",
    slug: "navratri",
    emoji: "🪔",
    dates: { 2026: "2026-10-11", 2027: "2027-10-01" },
    body: "Wishing you devotion, strength, and joy during Navratri.",
  },
  {
    name: "Dussehra",
    slug: "dussehra",
    emoji: "🏹",
    dates: { 2026: "2026-10-20", 2027: "2027-10-09" },
    body: "May good always triumph over evil. Happy Dussehra.",
  },
  {
    name: "Karwa Chauth",
    slug: "karwa-chauth",
    emoji: "🌙",
    dates: { 2026: "2026-10-29", 2027: "2027-10-18" },
    body: "Wishing you love, togetherness, and blessings on Karwa Chauth.",
  },
  {
    name: "Diwali",
    slug: "diwali",
    emoji: "🪔",
    dates: { 2026: "2026-11-08", 2027: "2027-10-29" },
    body: "Wishing you and your family a bright and prosperous Diwali.",
  },
  {
    name: "Govardhan Puja",
    slug: "govardhan-puja",
    emoji: "🙏",
    dates: { 2026: "2026-11-09", 2027: "2027-10-30" },
    body: "Wishing you blessings, abundance, and happiness on Govardhan Puja.",
  },
  {
    name: "Bhai Dooj",
    slug: "bhai-dooj",
    emoji: "",
    dates: { 2026: "2026-11-11", 2027: "2027-10-31" },
    body: "Wishing you a joyful Bhai Dooj filled with love and blessings.",
  },
] as const;

type HinduFestivalFallback = (typeof HINDU_FESTIVAL_FALLBACKS)[number];

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
  if (start == null || end == null || start === end) return false;
  const current = hour * 60 + minute;
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
  year: number;
  type: ScheduledNotificationType;
  festivalSlug?: string;
  tokenDocId?: string;
}) {
  const period = input.type === "hindu_festival_greeting" ? input.year : input.date;
  const hash = createHash("sha256")
    .update(`${input.userId}|${period}|${input.type}|${input.festivalSlug || ""}|${input.tokenDocId || "user"}`)
    .digest("hex")
    .slice(0, 48);
  return `scheduledNotificationLog.${hash}`;
}

function titleForFestival(name: string, emoji?: string) {
  return `Happy ${name}${emoji ? ` ${emoji}` : ""}`;
}

function userDisplayName(name?: string) {
  return sanitizeUserText(String(name || ""))
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim() || "Customer";
}

async function fetchFestivalCalendarFromApi(year: number) {
  const endpoint = process.env.HINDU_FESTIVAL_API_URL || process.env.INDIA_FESTIVAL_API_URL || "";
  if (!endpoint) return [];

  try {
    const url = endpoint
      .replace("{year}", String(year))
      .replace("{country}", "IN")
      .replace("{timezone}", encodeURIComponent(DEFAULT_TIMEZONE));
    const response = await fetch(url, { next: { revalidate: 7 * 24 * 60 * 60 } });
    if (!response.ok) return [];
    const json = await response.json();
    const items = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : Array.isArray(json?.holidays) ? json.holidays : [];
    const allowed = new Set<string>(HINDU_FESTIVAL_FALLBACKS.map((festival) => festival.slug));

    return items
      .map((item: Record<string, unknown>) => {
        const name = String(item.name || item.title || "").trim();
        const date = String(item.date || item.startDate || "").slice(0, 10);
        const fallback = HINDU_FESTIVAL_FALLBACKS.find(
          (festival) => festival.name.toLowerCase() === name.toLowerCase(),
        ) as HinduFestivalFallback | undefined;
        const slug = String(item.slug || fallback?.slug || "").trim();
        if (!allowed.has(slug) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
        const festivalName = fallback ? fallback.name : name;
        const festivalEmoji = fallback ? fallback.emoji : "";
        const festivalBody = fallback
          ? fallback.body
          : `Wishing you and your family happiness on ${festivalName}.`;
        return {
          name: festivalName,
          slug,
          date,
          year,
          emoji: festivalEmoji,
          title: titleForFestival(festivalName, festivalEmoji),
          body: festivalBody,
          sourceUrl: endpoint,
          source: "api",
        };
      })
      .filter(Boolean) as Array<{
      name: string;
      slug: string;
      date: string;
      year: number;
      emoji: string;
      title: string;
      body: string;
      sourceUrl: string;
      source: string;
    }>;
  } catch (error) {
    console.warn("[ScheduledGreetings] Festival API failed, using fallback calendar", error);
    return [];
  }
}

async function seedFestivalCalendar(year: number) {
  const apiFestivals = await fetchFestivalCalendarFromApi(year);
  const apiSlugs = new Set(apiFestivals.map((festival) => festival.slug));
  const fallbackFestivals = HINDU_FESTIVAL_FALLBACKS
    .map((festival) => {
      const date = festival.dates[year as keyof typeof festival.dates];
      if (!date || apiSlugs.has(festival.slug)) return null;
      return {
        name: festival.name,
        slug: festival.slug,
        date,
        year,
        emoji: festival.emoji,
        title: titleForFestival(festival.name, festival.emoji),
        body: festival.body,
        source: "fallback",
        sourceUrl: "",
      };
    })
    .filter(Boolean) as Array<{
    name: string;
    slug: string;
    date: string;
    year: number;
    emoji: string;
    title: string;
    body: string;
    source: string;
    sourceUrl: string;
  }>;

  const now = new Date().toISOString();
  await Promise.allSettled(
    [...apiFestivals, ...fallbackFestivals].map((festival) =>
      getCommsClient("comms").createIfNotExists({
        _id: `festivalCalendar.${festival.date}.${festival.slug}`,
        _type: "festivalCalendar",
        name: festival.name,
        slug: { _type: "slug", current: festival.slug },
        date: festival.date,
        year,
        emoji: festival.emoji,
        title: festival.title,
        body: festival.body,
        isActive: true,
        source: festival.source,
        sourceUrl: festival.sourceUrl,
        notes: "Hindu festival greeting calendar. Edit this document if your regional observance date differs.",
        createdAt: now,
        updatedAt: now,
      }).catch(() => {}),
    ),
  );
}

async function festivalsForDate(localDate: string, year: number) {
  await seedFestivalCalendar(year);
  const festivals =
    (await getCommsClient("comms")
      .fetch<FestivalDoc[]>(
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
      )
      .catch(() => [])) || [];
  if (festivals.length) return festivals;
  const primary = await sanityClient.fetch<FestivalDoc[]>(
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
  return primary || [];
}

async function hasUserLog(input: {
  userId: string;
  date: string;
  year: number;
  type: ScheduledNotificationType;
  festivalSlug?: string;
}) {
  const query = `*[_type=="scheduledNotificationLog" && userId==$userId && notificationType==$type && (
      ($type == "daily_good_morning" && date==$date) ||
      ($type == "hindu_festival_greeting" && festivalSlug==$festivalSlug && year==$year)
    )][0]._id`;
  const existing =
    (await getCommsClient("comms")
      .fetch<string | null>(query, input)
      .catch(() => null)) ||
    (await sanityClient.fetch<string | null>(query, input).catch(() => null));
  return Boolean(existing);
}

async function writeLog(input: {
  user: GreetingUser;
  date: string;
  year: number;
  timezone: string;
  type: ScheduledNotificationType;
  status: "sent" | "failed" | "skipped";
  reason?: string;
  festival?: FestivalDoc;
  notificationId?: string;
  token?: { _id?: string; token?: string; deviceId?: string; deviceName?: string };
}) {
  const festivalSlug = input.festival?.slug?.current || "";
  await getCommsClient("comms")
    .createIfNotExists({
      _id: logDocId({
        userId: input.user._id,
        date: input.date,
        year: input.year,
        type: input.type,
        festivalSlug,
        tokenDocId: input.token?._id,
      }),
      _type: "scheduledNotificationLog",
      userId: input.user._id,
      user: { _type: "reference", _ref: input.user._id },
      notificationType: input.type,
      greetingDate: input.date,
      date: input.date,
      year: input.year,
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
    })
    .catch(() => {});
}

function dailyMessage(user: GreetingUser) {
  const name = userDisplayName(user.name);

  return {
    type: "daily_good_morning" as const,
    title: `Good morning ${name}`,
    body: `Good morning ${name}. Have a great day from Jambh Electrics.`,
    festival: undefined,
  };
}

function festivalMessage(festival: FestivalDoc) {
  return {
    type: "hindu_festival_greeting" as const,
    title: festival.title || titleForFestival(festival.name, festival.emoji),
    body: festival.body || "Wishing you and your family happiness and prosperity.",
    festival,
  };
}

async function dispatchGreeting(input: {
  user: GreetingUser;
  timezone: string;
  localDate: string;
  localYear: number;
  message: ReturnType<typeof dailyMessage> | ReturnType<typeof festivalMessage>;
}) {
  const { user, timezone, localDate, localYear, message } = input;
  const festivalSlug = message.festival?.slug?.current || "";

  if (await hasUserLog({ userId: user._id, date: localDate, year: localYear, type: message.type, festivalSlug })) {
    return { sent: 0, skipped: 1, failed: 0 };
  }

  const tokens = await getActiveFcmTokensForUsers([user._id]);
  const expiresAt = new Date(Date.now() + GREETING_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const eventId = `${message.type}.${user._id}.${message.type === "daily_good_morning" ? localDate : `${localYear}.${festivalSlug}`}`;
  const dedupeKey =
    message.type === "daily_good_morning"
      ? `daily_good_morning:${user._id}:${eventId}:${localDate}`
      : `${message.type}:${user._id}:${festivalSlug || eventId}:${localYear}`;
  const result = await createAndDispatchNotification({
    eventId,
    type: message.type,
    userId: user._id,
    title: message.title,
    body: message.body,
    data: {
      category: "scheduled_greeting",
      notificationType: message.type,
      scheduledType: message.type,
      festivalName: message.festival?.name || "",
      festivalSlug,
      festivalDate: message.festival?.date || "",
      greetingDate: localDate,
      dedupeKey,
      year: localYear,
      expiresAt,
      route: "/",
      tag: `scheduled-greeting-${message.type}-${user._id}-${message.type === "daily_good_morning" ? localDate : `${localYear}-${festivalSlug}`}`,
      replaceGroup: message.type,
    },
  });

  if (!tokens.length) {
    await writeLog({
      user,
      date: localDate,
      year: localYear,
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
        date: localDate,
        year: localYear,
        timezone,
        type: message.type,
        status:
          invalid.has(token.token) || result.send.success === false
            ? invalid.has(token.token)
              ? "failed"
              : result.send.sent > 0
                ? "sent"
                : "failed"
            : "sent",
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

function addStats(total: GreetingRunStats, next: GreetingRunStats) {
  total.sent += next.sent;
  total.skipped += next.skipped;
  total.failed += next.failed;
}

async function sendForUser(user: GreetingUser, now: Date, options: { force?: boolean; skipDailyGoodMorning?: boolean } = {}) {
  const timezone = user.notificationTimezone || DEFAULT_TIMEZONE;
  const local = localDateParts(now, timezone);
  const prefs = user.notificationPreferences || {};
  const stats: GreetingRunStats = { sent: 0, skipped: 0, failed: 0 };

  if (!roleAllowsGreeting(user)) {
    await writeLog({ user, date: local.date, year: local.year, timezone, type: "daily_good_morning", status: "skipped", reason: "preferences_disabled" });
    return { ...stats, skipped: 1 };
  }

  if (!options.force && (local.hour < MORNING_START_HOUR || local.hour > MORNING_END_HOUR)) {
    return { ...stats, skipped: 1 };
  }

  if (isQuietNow(prefs, local.hour, local.minute)) {
    await writeLog({ user, date: local.date, year: local.year, timezone, type: "daily_good_morning", status: "skipped", reason: "quiet_hours" });
    return { ...stats, skipped: 1 };
  }

  if (options.skipDailyGoodMorning) {
    await writeLog({ user, date: local.date, year: local.year, timezone, type: "daily_good_morning", status: "skipped", reason: "backend_scheduler_authoritative" });
    stats.skipped += 1;
  } else if (prefs.dailyGreetingEnabled !== false) {
    addStats(stats, await dispatchGreeting({ user, timezone, localDate: local.date, localYear: local.year, message: dailyMessage(user) }));
  } else {
    await writeLog({ user, date: local.date, year: local.year, timezone, type: "daily_good_morning", status: "skipped", reason: "daily_greeting_disabled" });
    stats.skipped += 1;
  }

  if (prefs.festivalGreetingEnabled !== false) {
    const festivals = await festivalsForDate(local.date, local.year);
    for (const festival of festivals) {
      addStats(stats, await dispatchGreeting({ user, timezone, localDate: local.date, localYear: local.year, message: festivalMessage(festival) }));
    }
  } else {
    await writeLog({ user, date: local.date, year: local.year, timezone, type: "hindu_festival_greeting", status: "skipped", reason: "festival_greeting_disabled" });
  }

  return stats;
}

export async function runScheduledGreetings(input?: { now?: Date; force?: boolean; skipDailyGoodMorning?: boolean }) {
  const now = input?.now || new Date();
  const users = await sanityClient.fetch<GreetingUser[]>(
    `*[_type=="user" && isActive != false && role in ["customer","admin","super_admin","technician"]]{
      _id,
      name,
      role,
      notificationTimezone,
      notificationLanguage,
      notificationPreferences
    }`,
  );

  const totals: GreetingRunStats = { sent: 0, skipped: 0, failed: 0 };
  for (const user of users || []) {
    try {
      addStats(totals, await sendForUser(user, now, {
        force: Boolean(input?.force),
        skipDailyGoodMorning: input?.skipDailyGoodMorning === true,
      }));
    } catch (error) {
      totals.failed += 1;
      console.error("[ScheduledGreetings] user failed", user._id, error);
    }
  }

  return {
    ok: true,
    users: users.length,
    sent: totals.sent,
    skipped: totals.skipped,
    failed: totals.failed,
    at: now.toISOString(),
  };
}
