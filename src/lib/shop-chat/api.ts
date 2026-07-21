import { shopChatHeaders } from "./auth";
import type { ShopChatMessage, ShopChatRoom, ChatMedia } from "./types";

const RAW_CHAT_URL = process.env.NEXT_PUBLIC_SHOP_CHAT_URL || "https://shop-chat-backend.onrender.com/";
export const SHOP_CHAT_URL = RAW_CHAT_URL.replace(/\/+$/, "");
const CHAT_API_URL = `${SHOP_CHAT_URL}/chat`;

async function requestJson<T>(path: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
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

// ── Rooms ──
let roomsFetchPromise: Promise<{ rooms: ShopChatRoom[]; nextCursor: string | null; hasMore: boolean }> | null = null;
let roomsFetchCount = 0;
export function listShopChatRooms(opts?: { limit?: number; cursor?: string; search?: string }) {
  const params = new URLSearchParams();
  if (opts?.limit !== undefined && opts?.limit !== null) params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.search) params.set("search", opts.search);
  const suffix = params.toString() ? `?${params}` : "";
  // Dev trace: log every rooms fetch with reason
  if (process.env.NODE_ENV === "development") {
    roomsFetchCount++;
    if (roomsFetchCount > 3) console.trace("[chat] fetchRooms stack trace");
  }
  // Dedupe concurrent calls: if a rooms request is already in-flight, return same promise
  if (!suffix && roomsFetchPromise) return roomsFetchPromise;
  const promise = requestJson<{ rooms: ShopChatRoom[]; nextCursor: string | null; hasMore: boolean }>(`/rooms${suffix}`);
  if (!suffix) roomsFetchPromise = promise.then((r) => { roomsFetchPromise = null; return r; }).catch((e) => { roomsFetchPromise = null; throw e; });
  return promise;
}

export function getMyShopChatRoom() {
  return requestJson<{ room: ShopChatRoom }>("/room/me");
}

export function getOrCreateCustomerShopChatRoom(customerId: string) {
  return requestJson<{ room: ShopChatRoom }>(`/room/customer/${encodeURIComponent(customerId)}`, {
    method: "POST",
  });
}

// ── Events ──
export function createBillCreatedShopChatEvent(input: {
  customerId: string; billId: string; actorUserId?: string; billNumber?: string;
  customerName?: string; totalAmount?: number; paymentStatus?: string; createdAt?: string;
}) {
  return requestJson<{ message: ShopChatMessage; room: ShopChatRoom }>("/events/bill-created", {
    method: "POST", body: JSON.stringify(input),
  });
}

export function createWorkTaskShopChatEvent(input: {
  customerId: string; taskId: string; actorUserId?: string; title: string;
  description?: string; status?: string; priority?: string; issueCategory?: string;
  dueAt?: string; assignedTechnicianName?: string; customerName?: string;
  action?: "created" | "updated" | "completed" | "cancelled" | "hold" | "in-progress" | "deleted" | "due_changed";
  createdAt?: string; updatedAt?: string; completionNotes?: string;
  cancellationReason?: string; holdReason?: string;
}) {
  return requestJson<{ message: ShopChatMessage; room: ShopChatRoom }>("/events/work-task", {
    method: "POST", body: JSON.stringify(input),
  });
}

// ── Messages ──
export function listShopChatMessages(roomId: string, opts?: { cursor?: string; limit?: number; signal?: AbortSignal }) {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const suffix = params.toString() ? `?${params}` : "";
  return requestJson<{ messages: ShopChatMessage[]; nextCursor: string | null; hasMore: boolean }>(
    `/messages/${encodeURIComponent(roomId)}${suffix}`,
    { signal: opts?.signal },
  );
}

export function sendShopChatMessage(input: {
  roomId: string; text: string; type?: ShopChatMessage["type"];
  attachments?: unknown[]; media?: ChatMedia | null;
  clientMessageId?: string; replyTo?: ShopChatMessage["replyTo"];
}) {
  return requestJson<{ message: ShopChatMessage; room: ShopChatRoom }>("/messages", {
    method: "POST", body: JSON.stringify(input),
  });
}

export function editShopChatMessage(messageId: string, text: string) {
  return requestJson<{ message: ShopChatMessage; room?: ShopChatRoom }>(`/messages/${encodeURIComponent(messageId)}`, {
    method: "PATCH", body: JSON.stringify({ text }),
  });
}

export function deleteShopChatMessage(messageId: string, scope: "me" | "everyone" = "everyone") {
  return requestJson<{ ok?: true; messageId?: string; localOnly?: boolean; message?: ShopChatMessage; room?: ShopChatRoom }>(
    `/messages/${encodeURIComponent(messageId)}`, { method: "DELETE", body: JSON.stringify({ scope }) },
  );
}

export function clearShopChatRoom(roomId: string) {
  return requestJson<{ message: ShopChatMessage; room: ShopChatRoom }>(`/rooms/${encodeURIComponent(roomId)}/clear`, {
    method: "POST",
  });
}

export function reactToShopChatMessage(messageId: string, emoji: string | null) {
  return requestJson<{ message: ShopChatMessage }>(`/messages/${encodeURIComponent(messageId)}/react`, {
    method: "POST", body: JSON.stringify({ emoji }),
  });
}

export function forwardShopChatMessage(messageId: string, roomId: string) {
  return requestJson<{ message: ShopChatMessage; room: ShopChatRoom }>(`/messages/${encodeURIComponent(messageId)}/forward`, {
    method: "POST", body: JSON.stringify({ roomId }),
  });
}

export function markShopChatMessageDelivered(messageId: string) {
  return requestJson<{ messages: ShopChatMessage[] }>(`/messages/${encodeURIComponent(messageId)}/status`, {
    method: "PATCH",
  });
}

export function markShopChatMessageRead(messageId: string) {
  return requestJson<{ ok: true; messages?: ShopChatMessage[] }>(`/messages/${encodeURIComponent(messageId)}/read`, {
    method: "PATCH",
  });
}

// ── Bulk seen ──
export function markShopChatRoomSeen(roomId: string) {
  return requestJson<{ ok: true }>("/messages/seen", {
    method: "POST", body: JSON.stringify({ roomId }),
  });
}

// ── Sync ──
export function getChatSyncEvents(since: string) {
  return requestJson<{ events: Array<{ eventId: string; eventType: string; roomId: string; payload: any; createdAt: string }> }>(
    `/sync?since=${encodeURIComponent(since)}`,
  );
}

// ── Media upload ──
export function signChatMediaUpload(fileName: string, contentType: string) {
  return requestJson<{ url: string | null; path: string; publicUrl: string; token: string | null }>("/media/sign-upload", {
    method: "POST", body: JSON.stringify({ fileName, contentType }),
  });
}
