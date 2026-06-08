export type ShopChatRole = "admin" | "super_admin" | "technician" | "customer";

export type ShopChatParticipant = {
  userId: string;
  role: ShopChatRole;
  name: string;
  avatar?: string | null;
  profileImage?: string | null;
  profileImageUrl?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type ShopChatLastMessage = {
  messageId: string;
  text: string;
  type: "text" | "image" | "video" | "audio" | "file";
  senderId: string;
  senderRole: ShopChatRole;
  senderName: string;
  senderAvatar?: string | null;
  senderProfileImage?: string | null;
  senderProfileImageUrl?: string | null;
  createdAt: string;
};

export type ShopChatRoom = {
  roomId: string;
  customerId: string;
  customerKey?: string | null;
  customerName: string;
  admins: ShopChatParticipant[];
  participants: ShopChatParticipant[];
  lastMessage: ShopChatLastMessage | null;
  unreadBy: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

export type ShopChatReceipt = {
  userId: string;
  role: ShopChatRole;
  name?: string;
  at: string;
};

export type ShopChatMessage = {
  messageId: string;
  roomId: string;
  clientMessageId?: string | null;
  type: "text" | "image" | "video" | "audio" | "file";
  text: string;
  attachments: unknown[];
  senderId: string;
  senderRole: ShopChatRole;
  senderName: string;
  senderAvatar?: string | null;
  senderProfileImage?: string | null;
  senderProfileImageUrl?: string | null;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  deliveredTo: ShopChatReceipt[];
  readBy: ShopChatReceipt[];
  replyTo?: {
    messageId: string;
    text: string;
    senderId: string;
    senderName?: string;
  } | null;
  forwarded?: boolean;
  forwardedFrom?: string | null;
  messageKind?: "user" | "system";
  systemEventType?: string | null;
  systemEventData?: Record<string, any> | null;
  reactions?: Array<{
    userId: string;
    userName?: string;
    emoji: string;
    timestamp?: string;
  }>;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
