import { isAndroidNativeWrapper } from "../runtime";
import type {
  LocalMessageStore,
  LocalMessage,
  MessageStatus,
} from "./localMessageStore";

export class NativeBridgeMessageStore implements LocalMessageStore {
  private async bridgeRequest<T>(
    type: string,
    payload?: Record<string, unknown>
  ): Promise<T | null> {
    if (!window.ReactNativeWebView) return null;
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const envelope = { version: 1, id, type, timestamp: Date.now(), payload: payload || {} };
    return new Promise<T | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 5000);
      const handler = (event: MessageEvent) => {
        if (event.data?.id === id) {
          clearTimeout(timeout);
          resolve(event.data.payload as T);
        }
      };
      window.addEventListener("message", handler, { once: true });
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify(envelope));
      } catch {
        clearTimeout(timeout);
        resolve(null);
      }
    });
  }

  async getMessages(roomId: string, limit = 50): Promise<LocalMessage[]> {
    const result = await this.bridgeRequest<{ messages: LocalMessage[] }>(
      "GET_CACHED_MESSAGES",
      { roomId, limit }
    );
    return result?.messages || [];
  }

  async saveMessages(messages: LocalMessage[]): Promise<void> {
    for (const msg of messages) {
      await this.bridgeRequest("LOCAL_MESSAGE_CREATED", {
        message: msg,
        action: "save",
      });
    }
  }

  async saveMessage(message: LocalMessage): Promise<void> {
    await this.saveMessages([message]);
  }

  async getMessage(clientMessageId: string): Promise<LocalMessage | null> {
    const msgs = await this.getMessages("", 10000);
    return msgs.find((m) => m.clientMessageId === clientMessageId) || null;
  }

  async updateMessageStatus(
    clientMessageId: string,
    status: MessageStatus
  ): Promise<void> {
    await this.bridgeRequest("MESSAGE_STATUS_CHANGED", {
      clientMessageId,
      status,
    });
  }

  async updateMessageServerId(
    clientMessageId: string,
    serverId: string
  ): Promise<void> {
    const msg = await this.getMessage(clientMessageId);
    if (!msg) return;
    msg.serverId = serverId;
    msg.updatedAt = Date.now();
    await this.saveMessage(msg);
  }

  async getPendingMessages(): Promise<LocalMessage[]> {
    const result = await this.bridgeRequest<{ messages: LocalMessage[] }>(
      "GET_CACHED_MESSAGES",
      { status: "pending" }
    );
    return result?.messages || [];
  }

  async deleteMessages(roomId: string): Promise<void> {
    await this.bridgeRequest("LOCAL_MESSAGE_CREATED", {
      roomId,
      action: "delete_room",
    });
  }

  async clearAll(): Promise<void> {
    await this.bridgeRequest("LOCAL_MESSAGE_CREATED", {
      action: "clear_all",
    });
  }

  isSupported(): boolean {
    return isAndroidNativeWrapper();
  }
}
