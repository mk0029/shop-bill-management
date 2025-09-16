"use client";
import { idbAdd, idbGetAll, idbDelete } from "@/lib/idb";
import { createBill } from "@/lib/form-service";
type CreateBillPayload = Parameters<typeof createBill>[0];

const CFG = { dbName: "shop_queue_db", storeName: "queue" } as const;

type QueueItem = {
  id?: number;
  type: "bill" | "billMessage" | "inventory" | "other";
  payload: unknown;
  createdAt: number;
};

export async function queueBill(payload: CreateBillPayload) {
  const item: QueueItem = { type: "bill", payload, createdAt: Date.now() };
  await idbAdd(CFG, item);
}

export async function queueBillMessage(payload: { billId: string; content: string; recipientId: string }) {
  const item: QueueItem = { type: "billMessage", payload, createdAt: Date.now() };
  await idbAdd(CFG, item);
}

export async function flushQueue() {
  const items = await idbGetAll<QueueItem & { id: number }>(CFG);
  for (const item of items) {
    try {
      if (item.type === "bill") {
        const res = await createBill(item.payload as CreateBillPayload);
        if (res?.success) {
          await idbDelete(CFG, item.id);
        }
      } else if (item.type === "billMessage") {
        const { billId, content, recipientId } = item.payload as { billId: string; content: string; recipientId: string };
        const res = await fetch(`/api/bill-book/bill/${encodeURIComponent(billId)}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, recipientId }),
        });
        if (res.ok) {
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
