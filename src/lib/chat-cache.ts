const DB_NAME = "shop-chat-cache";
const DB_VERSION = 1;
const ROOMS_STORE = "rooms";
const MESSAGES_STORE = "messages";
const META_STORE = "meta";

function openChatDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ROOMS_STORE)) {
        const roomsStore = db.createObjectStore(ROOMS_STORE, { keyPath: "roomId" });
        roomsStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const msgStore = db.createObjectStore(MESSAGES_STORE, { keyPath: "id" });
        msgStore.createIndex("roomId", "roomId", { unique: false });
        msgStore.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Room cache ──
export async function cacheRooms(rooms: any[]) {
  try {
    const db = await openChatDB();
    const tx = db.transaction(ROOMS_STORE, "readwrite");
    const store = tx.objectStore(ROOMS_STORE);
    for (const room of rooms) {
      store.put(room);
    }
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
        if (cursor) {
          rooms.push(cursor.value);
          cursor.continue();
        } else {
          resolve(rooms);
        }
      };
      req.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
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
    for (const msg of messages) {
      store.put({ ...msg, id: msg.messageId });
    }
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
  } catch {
    return [];
  }
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
  } catch {
    return null;
  }
}

export async function clearChatCache() {
  try {
    const db = await openChatDB();
    const tx = db.transaction([ROOMS_STORE, MESSAGES_STORE, META_STORE], "readwrite");
    tx.objectStore(ROOMS_STORE).clear();
    tx.objectStore(MESSAGES_STORE).clear();
    tx.objectStore(META_STORE).clear();
    tx.oncomplete = () => db.close();
  } catch {}
}
