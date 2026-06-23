const STORAGE_KEY = "wa_bot_local_logs";
const MAX_LOGS = 300;
const STATE_KEY = "wa_bot_last_state";
const SUCCESS_TIME_KEY = "wa_bot_last_success_time";
const QUEUE_SIZE_KEY = "wa_bot_last_queue_size";
const LAST_ERROR_KEY = "wa_bot_last_error";

export interface WaBotLog {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  eventType?: string;
  status?: string;
  phone?: string;
  customerId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

export function addWaBotLocalLog(
  log: Omit<WaBotLog, "id" | "timestamp">,
): void {
  const entry: WaBotLog = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    ...log,
  };

  const logs = getWaBotLocalLogs();
  logs.unshift(entry);

  if (logs.length > MAX_LOGS) {
    logs.splice(MAX_LOGS);
  }

  safeWrite(STORAGE_KEY, logs);
}

export function getWaBotLocalLogs(): WaBotLog[] {
  return safeRead<WaBotLog[]>(STORAGE_KEY, []);
}

export function clearWaBotLocalLogs(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function removeWaBotLocalLog(id: string): void {
  const logs = getWaBotLocalLogs();
  const filtered = logs.filter((l) => l.id !== id);
  safeWrite(STORAGE_KEY, filtered);
}

export function getLastBotState(): Record<string, unknown> | null {
  return safeRead<Record<string, unknown> | null>(STATE_KEY, null);
}

export function saveBotState(state: Record<string, unknown>): void {
  safeWrite(STATE_KEY, state);
}

export function clearBotState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    // ignore
  }
}

export function getLastSuccessTime(): string | null {
  return safeRead<string | null>(SUCCESS_TIME_KEY, null);
}

export function saveLastSuccessTime(iso: string): void {
  safeWrite(SUCCESS_TIME_KEY, iso);
}

export function getLastQueueSize(): number {
  return safeRead<number>(QUEUE_SIZE_KEY, -1);
}

export function saveLastQueueSize(n: number): void {
  safeWrite(QUEUE_SIZE_KEY, n);
}

export function getLastErrorValue(): string | null {
  return safeRead<string | null>(LAST_ERROR_KEY, null);
}

export function saveLastErrorValue(err: string | null): void {
  safeWrite(LAST_ERROR_KEY, err);
}
