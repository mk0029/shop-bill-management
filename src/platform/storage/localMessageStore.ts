export type MessageStatus = "local_pending" | "queued" | "uploading" | "sending" | "sent" | "delivered" | "seen" | "failed" | "cancelled";

export interface LocalMessage {
  localId: string;
  serverId?: string;
  eventId?: string;
  userId: string;
  roomId: string;
  senderId: string;
  clientMessageId: string;
  messageType: string;
  textContent?: string;
  localUri?: string;
  remoteUrl?: string;
  thumbnailLocalUri?: string;
  thumbnailRemoteUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  uploadId?: string;
  status: MessageStatus;
  errorCode?: string;
  retryCount: number;
  createdAt: number;
  serverCreatedAt?: number;
  updatedAt: number;
}

export interface LocalMessageStore {
  getMessages(roomId: string, limit?: number): Promise<LocalMessage[]>;
  saveMessages(messages: LocalMessage[]): Promise<void>;
  saveMessage(message: LocalMessage): Promise<void>;
  getMessage(clientMessageId: string): Promise<LocalMessage | null>;
  updateMessageStatus(clientMessageId: string, status: MessageStatus): Promise<void>;
  updateMessageServerId(clientMessageId: string, serverId: string): Promise<void>;
  getPendingMessages(): Promise<LocalMessage[]>;
  deleteMessages(roomId: string): Promise<void>;
  clearAll(): Promise<void>;
}
