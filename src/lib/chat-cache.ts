"use client";

// Lightweight IndexedDB-based cache for chat data with localStorage fallback
// Stores:
// - rooms: ChatRoom[] under key 'list' in 'rooms' store (or localStorage 'chat_rooms')
// - messages: { roomId, items: ChatMessage[], updatedAt } in 'messages' store (or localStorage `chat_msgs_<roomId>`)

import type { ChatMessage, ChatRoom } from "@/lib/chat-api";

const DB_NAME = "chatCacheDB";
const DB_VERSION = 1;
const ROOMS_STORE = "rooms";
const MSGS_STORE = "messages";

function hasWindow() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasWindow()) return reject(new Error("No window/IndexedDB"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ROOMS_STORE)) {
        db.createObjectStore(ROOMS_STORE);
      }
      if (!db.objectStoreNames.contains(MSGS_STORE)) {
        const s = db.createObjectStore(MSGS_STORE, { keyPath: "roomId" });
        s.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open error"));
  });
}

function lsGet<T>(key: string): T | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch { return null; }
}

function lsSet<T>(key: string, value: T): void {
  if (!hasWindow()) return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export async function cacheGetRooms(): Promise<ChatRoom[] | null> {
  if (!hasWindow()) return null;
  try {
    const db = await openDB();
    return await new Promise<ChatRoom[] | null>((resolve, reject) => {
      const tx = db.transaction(ROOMS_STORE, "readonly");
      const store = tx.objectStore(ROOMS_STORE);
      const req = store.get("list");
      req.onsuccess = () => resolve((req.result as ChatRoom[]) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return lsGet<ChatRoom[]>("chat_rooms");
  }
}

export async function cacheSetRooms(rooms: ChatRoom[]): Promise<void> {
  if (!hasWindow()) return;
  lsSet("chat_rooms", rooms);
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ROOMS_STORE, "readwrite");
      const store = tx.objectStore(ROOMS_STORE);
      store.put(rooms, "list");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export async function cacheGetMessages(roomId: string): Promise<ChatMessage[] | null> {
  if (!hasWindow()) return null;
  try {
    const db = await openDB();
    return await new Promise<ChatMessage[] | null>((resolve, reject) => {
      const tx = db.transaction(MSGS_STORE, "readonly");
      const store = tx.objectStore(MSGS_STORE);
      const req = store.get(roomId);
      req.onsuccess = () => {
        const val = req.result as { roomId: string; items: ChatMessage[] } | undefined;
        resolve(val?.items || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return lsGet<ChatMessage[]>(`chat_msgs_${roomId}`);
  }
}

export async function cacheSetMessages(roomId: string, items: ChatMessage[]): Promise<void> {
  if (!hasWindow()) return;
  lsSet(`chat_msgs_${roomId}`, items);
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MSGS_STORE, "readwrite");
      const store = tx.objectStore(MSGS_STORE);
      store.put({ roomId, items, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export async function cacheMergeAndSetMessages(roomId: string, updater: (prev: ChatMessage[]) => ChatMessage[]): Promise<void> {
  const prev = (await cacheGetMessages(roomId)) || [];
  const next = updater(prev);
  await cacheSetMessages(roomId, next);
}
