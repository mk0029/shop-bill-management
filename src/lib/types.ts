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
  uploading?: boolean;
  uploadProgress?: number;
  receiverId?: string;
  groupId?: string;
  messageKind?: "user" | "system";
  systemEventType?: string;
  systemEventData?: Record<string, any>;
}
