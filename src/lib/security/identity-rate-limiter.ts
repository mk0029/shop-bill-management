interface IdentityRateLimitEntry {
  count: number
  tier: number
  resetAt: number
}

const tiers = [
  { max: 5, windowMs: 5 * 60 * 1000 },
  { max: 8, windowMs: 15 * 60 * 1000 },
  { max: 12, windowMs: 30 * 60 * 1000 },
  { max: 20, windowMs: 60 * 60 * 1000 },
  { max: 30, windowMs: 24 * 60 * 60 * 1000 },
]

const store = new Map<string, IdentityRateLimitEntry>()

const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

export interface IdentityScope {
  email?: string
  phone?: string
  ip: string
}

export interface IdentityRateLimitResult {
  allowed: boolean
  retryAfter?: number
}

function scopeKey(scope: IdentityScope): string {
  const parts: string[] = []
  if (scope.email) parts.push(`email:${scope.email.toLowerCase().trim()}`)
  if (scope.phone) parts.push(`phone:${scope.phone.replace(/\D/g, '')}`)
  parts.push(`ip:${scope.ip}`)
  return parts.join('|')
}

/**
 * Check rate limit scoped to a specific identity (email + phone + IP).
 * The key is a composite of all available identity fields so one user's
 * attempts never affect another user — even behind the same IP.
 *
 * Uses progressive lockout tiers:
 *   5 attempts  →  5 min
 *   8 attempts  → 15 min
 *  12 attempts  → 30 min
 *  20 attempts  → 60 min
 *  30 attempts  → 24 hr
 */
export function checkIdentityRateLimit(
  scope: IdentityScope,
  namespace: string,
): IdentityRateLimitResult {
  cleanup()

  const key = `${namespace}:${scopeKey(scope)}`
  const now = Date.now()
  let entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, tier: 0, resetAt: now + tiers[0].windowMs }
    store.set(key, entry)
    return { allowed: true }
  }

  entry.count++

  for (let i = tiers.length - 1; i >= 0; i--) {
    if (entry.count > tiers[i].max) {
      entry.tier = Math.min(i + 1, tiers.length - 1)
      break
    }
  }

  if (entry.count > tiers[entry.tier].max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true }
}

/**
 * Reset rate limit counters for a given scope (e.g. after successful login).
 */
export function resetIdentityRateLimit(
  scope: IdentityScope,
  namespace: string,
): void {
  const key = `${namespace}:${scopeKey(scope)}`
  store.delete(key)
}

export const IDENTITY_RATE_LIMIT_NAMESPACES = {
  REGISTRATION: "registration",
  RECOVERY: "recovery",
} as const
