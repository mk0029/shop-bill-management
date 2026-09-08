interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanupStores() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  name: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  cleanupStores();

  if (!stores.has(config.name)) {
    stores.set(config.name, new Map());
  }
  const store = stores.get(config.name)!;

  const now = Date.now();
  const key = `${config.name}:${identifier}`;

  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(key, entry);

    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;

  if (entry.count > config.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetAt: entry.resetAt,
  };
}

export const RATE_LIMIT_CONFIGS = {
  LOGIN: { windowMs: 60_000, max: 5, name: "login" },
  OTP: { windowMs: 60_000, max: 3, name: "otp" },
  PASSWORD_RESET: { windowMs: 300_000, max: 3, name: "password_reset" },
  CONTACT_FORM: { windowMs: 60_000, max: 2, name: "contact_form" },
  BILL_CREATE: { windowMs: 10_000, max: 5, name: "bill_create" },
  SEARCH: { windowMs: 60_000, max: 30, name: "search" },
  PUBLIC_API: { windowMs: 60_000, max: 60, name: "public_api" },
  API: { windowMs: 60_000, max: 100, name: "api" },
  UPLOAD: { windowMs: 60_000, max: 10, name: "upload" },
};

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "127.0.0.1";
  return ip;
}
