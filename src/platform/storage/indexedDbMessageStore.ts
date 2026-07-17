import type {
  LocalMessageStore,
  LocalMessage,
  MessageStatus,
} from "./localMessageStore";

const DB_NAME = "jambh-message-store";
const DB_VERSION = 1;
const MESSAGES_STORE = "messages";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = db.createObjectStore(MESSAGES_STORE, {
          keyPath: "clientMessageId",
        });
        store.createIndex("roomId", "roomId", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("serverId", "serverId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IndexedDbMessageStore implements LocalMessageStore {
  async getMessages(roomId: string, limit = 50): Promise<LocalMessage[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(MESSAGES_STORE, "readonly");
        const store = tx.objectStore(MESSAGES_STORE);
        const index = store.index("roomId");
        const req = index.getAll(roomId);
        req.onsuccess = () => {
          const msgs = (req.result || [])
            .sort((a: LocalMessage, b: LocalMessage) => a.createdAt - b.createdAt)
            .slice(-limit);
          resolve(msgs);
        };
        req.onerror = () => resolve([]);
        tx.oncomplete = () => db.close();
      });
    } catch {
      return [];
    }
  }

  async saveMessages(messages: LocalMessage[]): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      for (const msg of messages) {
        store.put(msg);
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      });
    } catch {
      void 0;
    }
  }

  async saveMessage(message: LocalMessage): Promise<void> {
    await this.saveMessages([message]);
  }

  async getMessage(clientMessageId: string): Promise<LocalMessage | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(MESSAGES_STORE, "readonly");
        const store = tx.objectStore(MESSAGES_STORE);
        const req = store.get(clientMessageId);
        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
      });
    } catch {
      return null;
    }
  }

  async updateMessageStatus(
    clientMessageId: string,
    status: MessageStatus
  ): Promise<void> {
    const msg = await this.getMessage(clientMessageId);
    if (!msg) return;
    msg.status = status;
    msg.updatedAt = Date.now();
    await this.saveMessage(msg);
  }

  async updateMessageServerId(
    clientMessageId: string,
    serverId: string
  ): Promise<void> {
    const msg = await this.getMessage(clientMessageId);
    if (!msg) return;
    msg.serverId = serverId;
    msg.updatedAt = Date.now();
    await this.saveMessage(msg);
  }

  async getPendingMessages(): Promise<LocalMessage[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(MESSAGES_STORE, "readonly");
        const store = tx.objectStore(MESSAGES_STORE);
        const index = store.index("status");
        const pendingStatuses: MessageStatus[] = [
          "local_pending",
          "queued",
          "uploading",
          "sending",
        ];
        const results: LocalMessage[] = [];
        let completed = 0;
        for (const status of pendingStatuses) {
          const req = index.getAll(status);
          req.onsuccess = () => {
            if (req.result) results.push(...req.result);
            completed++;
            if (completed === pendingStatuses.length) {
              resolve(results);
            }
          };
          req.onerror = () => {
            completed++;
            if (completed === pendingStatuses.length) resolve(results);
          };
        }
        tx.oncomplete = () => db.close();
      });
    } catch {
      return [];
    }
  }

  async deleteMessages(roomId: string): Promise<void> {
    const msgs = await this.getMessages(roomId, 10000);
    try {
      const db = await openDB();
      const tx = db.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      for (const msg of msgs) {
        store.delete(msg.clientMessageId);
      }
      tx.oncomplete = () => db.close();
    } catch {
      void 0;
    }
  }

  async clearAll(): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(MESSAGES_STORE, "readwrite");
      tx.objectStore(MESSAGES_STORE).clear();
      tx.oncomplete = () => db.close();
    } catch {
      void 0;
    }
  }
}
