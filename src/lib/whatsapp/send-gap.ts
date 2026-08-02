/**
 * Global send pacing for WhatsApp delivery.
 *
 * WhatsApp restricts accounts that send too many messages in a burst. This
 * module throttles EVERY outbound send (queue drain, bulk sends, reminders)
 * so that consecutive sends are separated by a random gap of 10–30 seconds
 * (matching the reported 5h restriction trigger).
 *
 * The throttle is process-global and also covers the reminder engine's
 * per-customer inline processing — consecutive customers are never sent
 * back-to-back.
 *
 * Configuration (env):
 *   WA_SEND_GAP_MIN_MS  min gap (default 10000)
 *   WA_SEND_GAP_MAX_MS  max gap (default 30000)
 *   Set WA_SEND_GAP_MAX_MS=0 (or min=0) to disable pacing.
 */

const DEFAULT_MIN_GAP_MS = 10_000;
const DEFAULT_MAX_GAP_MS = 30_000;

let lastSendAt = 0;

function parseEnvInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.trunc(parsed);
}

export function getSendGapRange(): { min: number; max: number } {
  let min = parseEnvInt(process.env.WA_SEND_GAP_MIN_MS, DEFAULT_MIN_GAP_MS);
  let max = parseEnvInt(process.env.WA_SEND_GAP_MAX_MS, DEFAULT_MAX_GAP_MS);
  if (min === 0 || max === 0) return { min: 0, max: 0 };
  if (min > max) [min, max] = [max, min];
  return { min, max };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait until a random gap (min..max) has elapsed since the last send.
 * Call immediately before each send operation (including the first one —
 * the global state keeps bursts from different code paths separated).
 */
export async function waitSendGap(): Promise<void> {
  const { min, max } = getSendGapRange();
  if (max === 0) return;

  const gapMs = min + Math.floor(Math.random() * (max - min + 1));
  const waitFor = lastSendAt + gapMs - Date.now();
  if (waitFor > 0) {
    await sleep(waitFor);
  }
  lastSendAt = Date.now();
}

/** For tests: reset the throttle state. */
export function resetSendGap(): void {
  lastSendAt = 0;
}
