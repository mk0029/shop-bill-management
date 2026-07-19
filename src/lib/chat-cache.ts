const DB_NAME = "shop-chat-cache";
const DB_VERSION = 5;
const ROOMS_STORE = "rooms";
const MESSAGES_STORE = "messages";
const META_STORE = "meta";
export const MEDIA_BLOBS_STORE = "media_blobs";
export const MEDIA_META_STORE = "media_meta";

const REQUIRED_STORES: Record<string, { keyPath: string; indexes?: Record<string, string> }> = {
  [ROOMS_STORE]: { keyPath: "roomId", indexes: { updatedAt: "updatedAt" } },
  [MESSAGES_STORE]: { keyPath: "id", indexes: { roomId: "roomId", createdAt: "createdAt" } },
  [META_STORE]: { keyPath: "key" },
  [MEDIA_BLOBS_STORE]: { keyPath: "url" },
  [MEDIA_META_STORE]: { keyPath: "key" },
};

function openChatDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (ev: IDBVersionChangeEvent) => {
      const db = req.result;

      // v4->v5 migration: media_meta keyPath changed from "url" to "key"
      if (ev.oldVersion < 5 && db.objectStoreNames.contains(MEDIA_META_STORE)) {
        db.deleteObjectStore(MEDIA_META_STORE);
      }

      for (const [name, def] of Object.entries(REQUIRED_STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: def.keyPath });
          if (def.indexes) {
            for (const [idx, key] of Object.entries(def.indexes)) {
              store.createIndex(idx, key, { unique: false });
            }
          }
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => {};
  });
}

export interface MediaMeta {
  url: string
  type: "audio" | "video" | "image"
  duration: number
  durationFormatted?: string
  mimeType: string
  size: number
  updatedAt: number
}

interface MediaMetaRecord extends MediaMeta {
  key: string
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

function devLog(...args: unknown[]) {
}

/**
 * Extract a stable object storage key from a signed Supabase URL.
 *
 * Signed URLs contain a JWT token with changing iat/exp, so they
 * cannot be used as IndexedDB keys. This extracts the stable
 * object path from the JWT payload or the URL path.
 *
 * Examples:
 *   Signed: …/object/sign/chat-media/abc/voice.webm?token=eyJ1cmwiOiJjaGF0LW1lZGlhL2FiYy92b2ljZS53ZWJtIiw…
 *     → "chat-media/abc/voice.webm"
 *   Public: …/object/public/chat-media/abc/voice.webm
 *     → "chat-media/abc/voice.webm"
 *   Other:  https://cdn.example.com/audio/123.mp3
 *     → "https://cdn.example.com/audio/123.mp3"
 */
function getStableMediaKey(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);

    // Prefer JWT token payload (most reliable for signed URLs)
    const token = u.searchParams.get("token");
    if (token) {
      try {
        const payload = JSON.parse(
          atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
        );
        if (typeof payload.url === "string" && payload.url.length > 0) {
          return payload.url;
        }
      } catch {}
    }

    // Fallback: path after /object/sign/
    const signMatch = rawUrl.match(/\/object\/sign\/(.+?)(\?|$)/);
    if (signMatch) return signMatch[1];

    // Fallback: path after /object/public/
    const pubMatch = rawUrl.match(/\/object\/public\/(.+?)(\?|$)/);
    if (pubMatch) return pubMatch[1];

    // Last resort: origin + pathname (no query params)
    return u.origin + u.pathname;
  } catch {
    return rawUrl;
  }
}

export async function cacheMediaMeta(meta: MediaMeta): Promise<void> {
  const key = getStableMediaKey(meta.url);
  const record: MediaMetaRecord = {
    ...meta,
    key,
    durationFormatted: meta.durationFormatted || fmt(meta.duration),
    updatedAt: Date.now(),
  };

  const db = await openChatDB().catch(() => null);
  if (!db) { devLog("failed — db not available"); return; }
  if (!db.objectStoreNames.contains(MEDIA_META_STORE)) { db.close(); devLog("failed — store not found"); return; }

  const tx = db.transaction(MEDIA_META_STORE, "readwrite");
  tx.objectStore(MEDIA_META_STORE).put(record);
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); resolve(); };
  });
  devLog("saved", key, record.duration);
}

export async function getCachedMediaMeta(rawUrl: string): Promise<MediaMeta | null> {
  const key = getStableMediaKey(rawUrl);
  devLog("stable key", key);

  const db = await openChatDB().catch(() => null);
  if (!db) return null;
  if (!db.objectStoreNames.contains(MEDIA_META_STORE)) { db.close(); return null; }

  const tx = db.transaction(MEDIA_META_STORE, "readonly");
  const store = tx.objectStore(MEDIA_META_STORE);
  tx.oncomplete = () => db.close();
  tx.onerror = () => db.close();

  const record = await new Promise<MediaMetaRecord | null>((resolve) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });

  if (record) {
    devLog("cache hit", key);
    const { key: _k, ...meta } = record;
    return meta;
  }

  devLog("cache miss", key);
  return null;
}

export async function getCachedMediaMetaByUrls(rawUrls: string[]): Promise<Record<string, MediaMeta>> {
  const db = await openChatDB().catch(() => null);
  if (!db) return {};
  if (!db.objectStoreNames.contains(MEDIA_META_STORE)) { db.close(); return {}; }

  const tx = db.transaction(MEDIA_META_STORE, "readonly");
  const store = tx.objectStore(MEDIA_META_STORE);
  tx.oncomplete = () => db.close();
  tx.onerror = () => db.close();

  const result = await new Promise<Record<string, MediaMeta>>((resolve) => {
    const output: Record<string, MediaMeta> = {};
    let pending = rawUrls.length;
    if (pending === 0) { resolve(output); return; }

    for (const rawUrl of rawUrls) {
      const key = getStableMediaKey(rawUrl);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result) {
          const { key: _k, ...meta } = req.result;
          output[rawUrl] = meta;
        }
        pending--;
        if (pending === 0) resolve(output);
      };
      req.onerror = () => {
        pending--;
        if (pending === 0) resolve(output);
      };
    }
  });

  return result;
}

// ── Room cache ──
export async function cacheRooms(rooms: any[]) {
  try {
    const db = await openChatDB();
    const tx = db.transaction(ROOMS_STORE, "readwrite");
    const store = tx.objectStore(ROOMS_STORE);
    for (const room of rooms) store.put(room);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  } catch {}
}

export async function getCachedRooms(): Promise<any[]> {
  try {
    const db = await openChatDB();
    return new Promise((resolve) => {
      const tx = db.transaction(ROOMS_STORE, "readonly");
      const store = tx.objectStore(ROOMS_STORE);
      const index = store.index("updatedAt");
      const req = index.openCursor(null, "prev");
      const rooms: any[] = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) { rooms.push(cursor.value); cursor.continue(); }
        else resolve(rooms);
      };
      req.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
    });
  } catch { return []; }
}

export async function cacheRoom(room: any) {
  try {
    const db = await openChatDB();
    const tx = db.transaction(ROOMS_STORE, "readwrite");
    tx.objectStore(ROOMS_STORE).put(room);
    tx.oncomplete = () => db.close();
  } catch {}
}

// ── Message cache ──
export async function cacheMessages(roomId: string, messages: any[]) {
  try {
    const db = await openChatDB();
    const tx = db.transaction(MESSAGES_STORE, "readwrite");
    const store = tx.objectStore(MESSAGES_STORE);
    for (const msg of messages) store.put({ ...msg, id: msg.messageId });
    tx.oncomplete = () => db.close();
  } catch {}
}

export async function cacheMessage(message: any) {
  try {
    const db = await openChatDB();
    const tx = db.transaction(MESSAGES_STORE, "readwrite");
    tx.objectStore(MESSAGES_STORE).put({ ...message, id: message.messageId });
    tx.oncomplete = () => db.close();
  } catch {}
}

export async function getCachedMessages(roomId: string): Promise<any[]> {
  try {
    const db = await openChatDB();
    return new Promise((resolve) => {
      const tx = db.transaction(MESSAGES_STORE, "readonly");
      const store = tx.objectStore(MESSAGES_STORE);
      const index = store.index("roomId");
      const req = index.getAll(roomId);
      req.onsuccess = () => {
        const msgs = (req.result || []).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        resolve(msgs);
      };
      req.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
    });
  } catch { return []; }
}

// ── Sync metadata ──
export async function setLastSyncAt(roomId: string, value: string) {
  try {
    const db = await openChatDB();
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put({ key: `lastSync:${roomId}`, value });
    tx.oncomplete = () => db.close();
  } catch {}
}

export async function getLastSyncAt(roomId: string): Promise<string | null> {
  try {
    const db = await openChatDB();
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE, "readonly");
      const store = tx.objectStore(META_STORE);
      const req = store.get(`lastSync:${roomId}`);
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch { return null; }
}

// ── Media blob cache ──
export async function cacheMediaBlob(url: string, data: ArrayBuffer, mimeType: string) {
  try {
    const db = await openChatDB();
    const tx = db.transaction(MEDIA_BLOBS_STORE, "readwrite");
    tx.objectStore(MEDIA_BLOBS_STORE).put({ url, data, mimeType, size: data.byteLength, cachedAt: Date.now() });
    tx.oncomplete = () => db.close();
  } catch {}
}

export async function getCachedMediaBlob(url: string): Promise<{ data: ArrayBuffer; mimeType: string } | null> {
  try {
    const db = await openChatDB();
    return new Promise((resolve) => {
      const tx = db.transaction(MEDIA_BLOBS_STORE, "readonly");
      const req = tx.objectStore(MEDIA_BLOBS_STORE).get(url);
      req.onsuccess = () => {
        const entry = req.result;
        resolve(entry ? { data: entry.data, mimeType: entry.mimeType } : null);
      };
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch { return null; }
}

export async function removeCachedMediaBlob(url: string) {
  try {
    const db = await openChatDB();
    const tx = db.transaction(MEDIA_BLOBS_STORE, "readwrite");
    tx.objectStore(MEDIA_BLOBS_STORE).delete(url);
    tx.oncomplete = () => db.close();
  } catch {}
}

export async function clearChatCache() {
  try {
    const db = await openChatDB();
    const storeNames = [ROOMS_STORE, MESSAGES_STORE, META_STORE, MEDIA_BLOBS_STORE, MEDIA_META_STORE]
      .filter((n) => db.objectStoreNames.contains(n));
    if (storeNames.length === 0) { db.close(); return; }
    const tx = db.transaction(storeNames, "readwrite");
    for (const name of storeNames) tx.objectStore(name).clear();
    tx.oncomplete = () => db.close();
  } catch {}
}
