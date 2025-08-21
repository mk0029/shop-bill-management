"use client";
import { idbAdd, idbGetAll, idbDelete } from "@/lib/idb";
import { createBill } from "@/lib/form-service";

const CFG = { dbName: "shop_queue_db", storeName: "queue" } as const;

type QueueItem = {
  id?: number;
  type: "bill" | "inventory" | "other";
  payload: any;
  createdAt: number;
};

export async function queueBill(payload: any) {
  const item: QueueItem = { type: "bill", payload, createdAt: Date.now() };
  await idbAdd(CFG, item);
}

export async function flushQueue() {
  const items = await idbGetAll<QueueItem & { id: number }>(CFG);
  for (const item of items) {
    try {
      if (item.type === "bill") {
        const res = await createBill(item.payload);
        if (res?.success) {
          await idbDelete(CFG, item.id);
        }
      }
      // Future: handle other types
    } catch (e) {
      // stop on first failure to avoid tight loop
      break;
    }
  }
}
