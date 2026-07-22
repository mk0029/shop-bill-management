export interface MessageReaction {
  userId: string;
  userName?: string;
  emoji: string;
  timestamp?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  senderAvatar?: string;
  timestamp: string;
  status?: "sending" | "pending" | "sent" | "delivered" | "read" | "failed";
  tempId?: string;
  reactions?: MessageReaction[];
  edited?: boolean;
  editedAt?: string;
  deletedForEveryone?: boolean;
  deletedAt?: string;
  wipePulseAt?: string;
  replyTo?: { messageId: string; text: string; senderId: string; senderName?: string } | null;
  forwarded?: boolean;
  forwardedFrom?: string | null;
  type?: string;
  clientMessageId?: string;
  uploading?: boolean;
  uploadProgress?: number;
  media?: { type: "image" | "video" | "audio" | "file"; url: string; path: string; fileName: string; mimeType: string; size: number; width?: number; height?: number; aspectRatio?: number; duration?: number; thumbnailUrl?: string; uploadedAt: string } | null;
  receiverId?: string;
  groupId?: string;
  messageKind?: "user" | "system";
  systemEventType?: string;
  systemEventData?: Record<string, any>;
}
