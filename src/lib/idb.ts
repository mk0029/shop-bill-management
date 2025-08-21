// Tiny IndexedDB helper
// No external deps; simple store per DB

export interface IDBConfig {
  dbName: string;
  storeName: string;
}

export function openDB({ dbName, storeName }: IDBConfig): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbAdd<T>(cfg: IDBConfig, value: T): Promise<number> {
  const db = await openDB(cfg);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(cfg.storeName, "readwrite");
    const store = tx.objectStore(cfg.storeName);
    const req = store.add(value as any);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetAll<T>(cfg: IDBConfig): Promise<T[]> {
  const db = await openDB(cfg);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(cfg.storeName, "readonly");
    const store = tx.objectStore(cfg.storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(cfg: IDBConfig, id: number): Promise<void> {
  const db = await openDB(cfg);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(cfg.storeName, "readwrite");
    const store = tx.objectStore(cfg.storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
