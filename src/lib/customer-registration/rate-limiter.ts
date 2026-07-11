import { checkRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";
import type { RateLimitResult } from "@/lib/security/rate-limiter";

export function checkRegistrationRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, {
    windowMs: 600_000,
    max: 3,
    name: "registration",
  });
}

export function checkRecoveryRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, {
    windowMs: 3_600_000,
    max: 3,
    name: "recovery",
  });
}

export function checkGlobalRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, RATE_LIMIT_CONFIGS.PUBLIC_API);
}
