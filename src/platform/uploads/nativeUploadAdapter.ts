import { isAndroidNativeWrapper } from "../runtime";
import type {
  UploadAdapter,
  SelectedMedia,
  QueueUploadInput,
  QueuedUpload,
  UploadProgress,
  UploadStatus,
} from "./uploadAdapter";

export class NativeUploadAdapter implements UploadAdapter {
  private progressHandlers: Set<(progress: UploadProgress) => void> = new Set();

  private async bridgeRequest<T>(
    type: string,
    payload?: Record<string, unknown>
  ): Promise<T | null> {
    if (!window.ReactNativeWebView) return null;
    const id = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const envelope = { version: 1, id, type, timestamp: Date.now(), payload: payload || {} };

    return new Promise<T | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 30000);
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

  async pickImage(roomId: string): Promise<SelectedMedia | null> {
    return this.bridgeRequest<SelectedMedia>("PICK_IMAGE", { roomId });
  }

  async pickVideo(roomId: string): Promise<SelectedMedia | null> {
    return this.bridgeRequest<SelectedMedia>("PICK_VIDEO", { roomId });
  }

  async pickDocument(roomId: string): Promise<SelectedMedia | null> {
    return this.bridgeRequest<SelectedMedia>("PICK_DOCUMENT", { roomId });
  }

  async takePhoto(roomId: string): Promise<SelectedMedia | null> {
    return this.bridgeRequest<SelectedMedia>("TAKE_PHOTO", { roomId });
  }

  async queueUpload(input: QueueUploadInput): Promise<QueuedUpload> {
    const result = await this.bridgeRequest<QueuedUpload>("QUEUE_CHAT_MEDIA_MESSAGE", {
      roomId: input.roomId,
      localMessageId: input.localMessageId,
      media: input.media,
    });
    if (!result) throw new Error("Failed to queue upload");
    return result;
  }

  async retryUpload(uploadId: string): Promise<void> {
    await this.bridgeRequest("RETRY_UPLOAD", { uploadId });
  }

  async cancelUpload(uploadId: string): Promise<void> {
    await this.bridgeRequest("CANCEL_UPLOAD", { uploadId });
  }

  async getPendingUploads(): Promise<QueuedUpload[]> {
    const result = await this.bridgeRequest<{ uploads: QueuedUpload[] }>("GET_PENDING_UPLOADS");
    return result?.uploads || [];
  }

  onProgress(handler: (progress: UploadProgress) => void): () => void {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "UPLOAD_PROGRESS") {
        handler(event.data.payload as UploadProgress);
      }
    };
    window.addEventListener("message", listener);
    this.progressHandlers.add(handler);
    return () => {
      window.removeEventListener("message", listener);
      this.progressHandlers.delete(handler);
    };
  }

  isSupported(): boolean {
    return isAndroidNativeWrapper();
  }
}
