"use client";

const HANDLED_KEY = "handled-notification-ids";
const ACTIVE_CHAT_KEY = "active-shop-chat-room-id";
const TTL_MS = 10 * 60 * 1000;
const MAX_IDS = 300;

type Entry = { id: string; ts: number };

function now() {
  return Date.now();
}

function readEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(HANDLED_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const cutoff = now() - TTL_MS;
    return parsed
      .filter((item): item is Entry => Boolean(item?.id) && typeof item.ts === "number")
      .filter((item) => item.ts >= cutoff)
      .slice(-MAX_IDS);
  } catch {
    return [];
  }
}

function writeEntries(entries: Entry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HANDLED_KEY, JSON.stringify(entries.slice(-MAX_IDS)));
  } catch {}
}

export function notificationIdentity(input: {
  dedupeKey?: unknown;
  id?: unknown;
  notificationId?: unknown;
  messageId?: unknown;
  roomId?: unknown;
  tag?: unknown;
}) {
  const id = String(input.dedupeKey || input.id || input.notificationId || input.messageId || input.tag || "").trim();
  if (id) return id;
  const roomId = String(input.roomId || "").trim();
  return roomId ? `room:${roomId}` : "";
}

export function markNotificationHandled(id?: unknown) {
  const key = String(id || "").trim();
  if (!key) return;
  const entries = readEntries().filter((item) => item.id !== key);
  entries.push({ id: key, ts: now() });
  writeEntries(entries);
}

export function wasNotificationHandled(id?: unknown) {
  const key = String(id || "").trim();
  if (!key) return false;
  const entries = readEntries();
  writeEntries(entries);
  return entries.some((item) => item.id === key);
}

export function getActiveChatId() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(ACTIVE_CHAT_KEY) || "";
  } catch {
    return "";
  }
}

export function setActiveChatId(roomId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (roomId) localStorage.setItem(ACTIVE_CHAT_KEY, roomId);
    else localStorage.removeItem(ACTIVE_CHAT_KEY);
  } catch {}
}

export async function postNotificationWorkerMessage(message: unknown) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const worker = reg.active || navigator.serviceWorker.controller;
    if (!worker) return false;
    worker.postMessage(message);
    return true;
  } catch {
    return false;
  }
}

export function clearAppSystemNotifications(filter?: { roomId?: string; tag?: string; id?: string }) {
  void postNotificationWorkerMessage({ type: "CLEAR_NOTIFICATIONS", filter });
}
