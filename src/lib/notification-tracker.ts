"use client";

export type TrackEntry = {
  id: string;
  ts: string;
  tsMs: number;
  channel: "fcm" | "whatsapp" | "socket";
  eventType: string;
  ok: boolean;
  skipped?: boolean;
  error?: string;
  durationMs?: number;
  target?: string;
  meta?: Record<string, any>;
  synced?: boolean;
};

const TRACKER_KEY = "notification_tracker_log";
const MAX_ENTRIES = 500;
let listeners: Array<() => void> = [];

function getEntries(): TrackEntry[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(TRACKER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: TrackEntry[]) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(TRACKER_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {}
}

function notify() {
  for (const fn of listeners) fn();
}

async function persistToSanity(entry: TrackEntry) {
  try {
    if (typeof window === "undefined") return;
    const res = await fetch("/api/notifications/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: entry.channel,
        eventType: entry.eventType,
        status: entry.skipped ? "skipped" : entry.ok ? "sent" : "failed",
        target: entry.target || "",
        durationMs: entry.durationMs || 0,
        error: entry.error || "",
        meta: entry.meta || {},
        trackedAtMs: entry.tsMs,
      }),
    });
    if (res.ok) {
      const entries = getEntries();
      const idx = entries.findIndex((e) => e.id === entry.id);
      if (idx !== -1) {
        entries[idx].synced = true;
        saveEntries(entries);
      }
    }
  } catch {}
}

export function trackNotification(entry: Omit<TrackEntry, "id" | "ts" | "tsMs" | "synced">) {
  const now = new Date();
  const full: TrackEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: now.toISOString(),
    tsMs: now.getTime(),
    ...entry,
    synced: false,
  };
  const entries = getEntries();
  entries.push(full);
  saveEntries(entries);
  notify();
  persistToSanity(full);
}

export function trackWhatsApp(input: {
  eventType: string;
  phone?: string;
  ok: boolean;
  skipped?: boolean;
  error?: string;
  durationMs?: number;
  idempotencyKey?: string;
}) {
  trackNotification({
    channel: "whatsapp",
    eventType: input.eventType,
    ok: input.ok,
    skipped: input.skipped,
    error: input.error,
    durationMs: input.durationMs,
    target: input.phone ? input.phone.slice(0, 4) + "****" : undefined,
    meta: input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  });
}

export function trackFcm(input: {
  eventType: string;
  ok: boolean;
  error?: string;
  durationMs?: number;
  target?: string;
  meta?: Record<string, any>;
}) {
  trackNotification({
    channel: "fcm",
    eventType: input.eventType,
    ok: input.ok,
    error: input.error,
    durationMs: input.durationMs,
    target: input.target,
    meta: input.meta,
  });
}

export async function loadTrackedNotifications(filter?: {
  channel?: "fcm" | "whatsapp" | "socket";
  count?: number;
  fromSanity?: boolean;
}): Promise<TrackEntry[]> {
  if (filter?.fromSanity) {
    try {
      const params = new URLSearchParams();
      if (filter.channel) params.set("channel", filter.channel);
      if (filter.count) params.set("limit", String(filter.count));
      const res = await fetch(`/api/notifications/tracker?${params}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.logs)) {
        return json.logs.map((l: any) => ({
          id: l._id,
          ts: l.createdAt || new Date(l.trackedAtMs).toISOString(),
          tsMs: l.trackedAtMs || 0,
          channel: l.channel,
          eventType: l.eventType,
          ok: l.status === "sent",
          skipped: l.status === "skipped",
          error: l.error || undefined,
          durationMs: l.durationMs || undefined,
          target: l.target || undefined,
          meta: l.meta || undefined,
          synced: true,
        }));
      }
    } catch {}
  }

  let entries = getEntries();
  if (filter?.channel) entries = entries.filter((e) => e.channel === filter.channel);
  return entries.slice(-(filter?.count || 100)).reverse();
}

export function getTrackedNotifications(filter?: {
  channel?: "fcm" | "whatsapp" | "socket";
  count?: number;
}): TrackEntry[] {
  let entries = getEntries();
  if (filter?.channel) entries = entries.filter((e) => e.channel === filter.channel);
  return entries.slice(-(filter?.count || 100)).reverse();
}

export function clearTrackedNotifications() {
  saveEntries([]);
  notify();
}

export function onTrackedNotificationsChange(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
