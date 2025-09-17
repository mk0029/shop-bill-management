export type ChatRoom = {
  _id: string;
  roomName: string;
  customer?: { _id: string; name?: string; phone?: string };
  admins?: Array<{ _id: string; name?: string }>;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadForCustomer?: number;
  unreadForAdmins?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatMessage = {
  _id: string;
  room: { _ref: string } | string;
  sender?: { _id: string; name?: string } | { _ref: string };
  content: string;
  attachments?: Array<unknown>;
  status?: "sent" | "delivered" | "seen";
  deliveredAt?: string;
  seenAt?: string;
  editedAt?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
};

const base = (path: string) => `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}${path}`;

export async function getOrCreateRoomByCustomer(customerId: string) {
  const res = await fetch(base(`/api/chat/room/by-customer/${customerId}`), {
    cache: "no-store",
  });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || "Failed to get/create room");
  return json.data as ChatRoom;
}

export async function listRooms(opts?: { customerId?: string; adminId?: string }) {
  const qs = new URLSearchParams();
  if (opts?.customerId) qs.set("customerId", String(opts.customerId));
  if (opts?.adminId) qs.set("adminId", String(opts.adminId));
  const res = await fetch(base(`/api/chat/rooms?${qs.toString()}`), { cache: "no-store" });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || "Failed to fetch rooms");
  return json.data as ChatRoom[];
}

export async function listRoomMessages(roomId: string, limit = 50) {
  const res = await fetch(base(`/api/chat/room/${roomId}/messages?limit=${limit}`), {
    cache: "no-store",
  });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || "Failed to fetch messages");
  return json.data as ChatMessage[];
}

export async function sendRoomMessage(params: {
  roomId: string;
  content: string;
  senderId: string;
  isCustomer?: boolean;
  parentId?: string;
  // Optional: current device's FCM token to exclude from push targets
  senderToken?: string | null;
}) {
  const { roomId, content, senderId, isCustomer, parentId, senderToken } = params;
  const res = await fetch(base(`/api/chat/room/${roomId}/messages`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, senderId, isCustomer: Boolean(isCustomer), parentId, senderToken: senderToken || undefined }),
  });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || "Failed to send message");
  return json.data as ChatMessage;
}

export async function markRoomRead(roomId: string, actor: "admin" | "customer") {
  const res = await fetch(base(`/api/chat/room/${roomId}/read`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor }),
  });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || "Failed to mark as read");
  return json.data as ChatRoom;
}

export async function markMessageSeen(messageId: string) {
  const res = await fetch(base(`/api/chat/message/${messageId}/seen`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || "Failed to mark message as seen");
  return json.data as ChatMessage;
}

export async function updateMessage(params: { messageId: string; content: string }) {
  const { messageId, content } = params;
  const res = await fetch(base(`/api/chat/message/${messageId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || "Failed to update message");
  return json.data as ChatMessage;
}
