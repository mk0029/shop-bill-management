import { shopChatHeaders } from "./auth";
import type { ShopChatMessage, ShopChatRoom } from "./types";

const RAW_CHAT_URL = process.env.NEXT_PUBLIC_SHOP_CHAT_URL || "https://shop-chat-backend.onrender.com/";
export const SHOP_CHAT_URL = RAW_CHAT_URL.replace(/\/+$/, "");
const CHAT_API_URL = `${SHOP_CHAT_URL}/chat`;

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(shopChatHeaders())) headers.set(key, value);
  if (init?.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${CHAT_API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body?.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function listShopChatRooms() {
  return requestJson<{ rooms: ShopChatRoom[] }>("/rooms");
}

export function getMyShopChatRoom() {
  return requestJson<{ room: ShopChatRoom }>("/room/me");
}

export function getOrCreateCustomerShopChatRoom(customerId: string) {
  return requestJson<{ room: ShopChatRoom }>(`/room/customer/${encodeURIComponent(customerId)}`, {
    method: "POST",
  });
}

export function createBillCreatedShopChatEvent(input: {
  customerId: string;
  billId: string;
  billNumber?: string;
  customerName?: string;
  totalAmount?: number;
  paymentStatus?: string;
  createdAt?: string;
}) {
  return requestJson<{ message: ShopChatMessage; room: ShopChatRoom }>("/events/bill-created", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createWorkTaskShopChatEvent(input: {
  customerId: string;
  taskId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  issueCategory?: string;
  dueAt?: string;
  assignedTechnicianName?: string;
  customerName?: string;
  action?: "created" | "updated" | "completed" | "cancelled" | "hold" | "in-progress" | "deleted" | "due_changed";
  createdAt?: string;
  updatedAt?: string;
  completionNotes?: string;
  cancellationReason?: string;
  holdReason?: string;
}) {
  return requestJson<{ message: ShopChatMessage; room: ShopChatRoom }>("/events/work-task", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listShopChatMessages(roomId: string, opts?: { before?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (opts?.before) params.set("before", opts.before);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const suffix = params.toString() ? `?${params}` : "";
  return requestJson<{ messages: ShopChatMessage[] }>(`/messages/${encodeURIComponent(roomId)}${suffix}`);
}

export function sendShopChatMessage(input: {
  roomId: string;
  text: string;
  type?: ShopChatMessage["type"];
  attachments?: unknown[];
  clientMessageId?: string;
  replyTo?: ShopChatMessage["replyTo"];
}) {
  return requestJson<{ message: ShopChatMessage; room: ShopChatRoom }>("/messages", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function editShopChatMessage(messageId: string, text: string) {
  return requestJson<{ message: ShopChatMessage; room?: ShopChatRoom }>(`/messages/${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    body: JSON.stringify({ text }),
  });
}

export function deleteShopChatMessage(messageId: string, scope: "me" | "everyone" = "everyone") {
  return requestJson<{ ok?: true; messageId?: string; localOnly?: boolean; message?: ShopChatMessage; room?: ShopChatRoom }>(
    `/messages/${encodeURIComponent(messageId)}`,
    {
      method: "DELETE",
      body: JSON.stringify({ scope }),
    },
  );
}

export function clearShopChatRoom(roomId: string) {
  return requestJson<{ message: ShopChatMessage; room: ShopChatRoom }>(`/rooms/${encodeURIComponent(roomId)}/clear`, {
    method: "POST",
  });
}

export function reactToShopChatMessage(messageId: string, emoji: string | null) {
  return requestJson<{ message: ShopChatMessage }>(`/messages/${encodeURIComponent(messageId)}/react`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

export function forwardShopChatMessage(messageId: string, roomId: string) {
  return requestJson<{ message: ShopChatMessage; room: ShopChatRoom }>(`/messages/${encodeURIComponent(messageId)}/forward`, {
    method: "POST",
    body: JSON.stringify({ roomId }),
  });
}

export function markShopChatMessageDelivered(messageId: string) {
  return requestJson<{ messages: ShopChatMessage[] }>(`/messages/${encodeURIComponent(messageId)}/status`, {
    method: "PATCH",
  });
}

export function markShopChatMessageRead(messageId: string) {
  return requestJson<{ ok: true }>(`/messages/${encodeURIComponent(messageId)}/read`, {
    method: "PATCH",
  });
}
