import { uploadChatMedia, validateFile } from "@/lib/supabase-storage";
import type {
  UploadAdapter,
  SelectedMedia,
  QueueUploadInput,
  QueuedUpload,
  UploadProgress,
  UploadStatus,
} from "./uploadAdapter";

interface PendingUploadRecord {
  uploadId: string;
  localMessageId: string;
  roomId: string;
  file: File;
  status: UploadStatus;
  progress: number;
  errorMessage?: string;
}

export class WebUploadAdapter implements UploadAdapter {
  private pendingUploads: Map<string, PendingUploadRecord> = new Map();
  private progressHandlers: Set<(progress: UploadProgress) => void> = new Set();

  private generateId(): string {
    return `web_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private async fileToSelectedMedia(
    file: File,
    type: UploadAdapter["pickImage"] extends (...args: unknown[]) => unknown ? "image" : "image"
  ): Promise<SelectedMedia> {
    const error = validateFile(file);
    if (error) throw new Error(error);
    return {
      localUri: URL.createObjectURL(file),
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadType: type as any,
    };
  }

  async pickImage(roomId: string): Promise<SelectedMedia | null> {
    return this.pickFile(roomId, "image/*");
  }

  async pickVideo(roomId: string): Promise<SelectedMedia | null> {
    return this.pickFile(roomId, "video/*");
  }

  async pickDocument(roomId: string): Promise<SelectedMedia | null> {
    return this.pickFile(roomId, "*/*");
  }

  async takePhoto(roomId: string): Promise<SelectedMedia | null> {
    return this.pickFile(roomId, "image/*", true);
  }

  private async pickFile(
    _roomId: string,
    accept: string,
    capture?: boolean
  ): Promise<SelectedMedia | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      if (capture) input.capture = "environment";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        try {
          const media = await this.fileToSelectedMedia(file, accept.startsWith("video") ? "video" : accept.startsWith("audio") ? "audio" : "image");
          resolve(media);
        } catch {
          resolve(null);
        }
      };
      input.click();
    });
  }

  async queueUpload(input: QueueUploadInput): Promise<QueuedUpload> {
    const file = await this.fileFromLocalUri(input.media.localUri);
    if (!file) throw new Error("File not found");

    const uploadId = this.generateId();
    const record: PendingUploadRecord = {
      uploadId,
      localMessageId: input.localMessageId,
      roomId: input.roomId,
      file,
      status: "queued",
      progress: 0,
    };
    this.pendingUploads.set(uploadId, record);

    this.processUpload(uploadId).catch(() => void 0);

    return {
      uploadId,
      localMessageId: input.localMessageId,
      roomId: input.roomId,
      status: "queued",
      progress: 0,
    };
  }

  private async processUpload(uploadId: string): Promise<void> {
    const record = this.pendingUploads.get(uploadId);
    if (!record) return;

    record.status = "uploading";
    this.notifyProgress(uploadId, 0);

    try {
      const onProgress = (pct: number) => {
        record.progress = pct;
        this.notifyProgress(uploadId, pct);
      };

      await uploadChatMedia(record.file, record.roomId, record.localMessageId, onProgress);

      record.status = "sent";
      record.progress = 100;
      this.notifyProgress(uploadId, 100);
    } catch (error) {
      record.status = "failed";
      record.errorMessage = error instanceof Error ? error.message : "Upload failed";
      this.notifyProgress(uploadId, -1);
    }
  }

  async retryUpload(uploadId: string): Promise<void> {
    const record = this.pendingUploads.get(uploadId);
    if (!record || record.status !== "failed") return;
    record.status = "queued";
    record.progress = 0;
    this.processUpload(uploadId).catch(() => void 0);
  }

  async cancelUpload(uploadId: string): Promise<void> {
    const record = this.pendingUploads.get(uploadId);
    if (!record) return;
    record.status = "cancelled";
    URL.revokeObjectURL(record.mediaLocalUri);
    this.pendingUploads.delete(uploadId);
  }

  async getPendingUploads(): Promise<QueuedUpload[]> {
    const items: QueuedUpload[] = [];
    for (const record of this.pendingUploads.values()) {
      items.push({
        uploadId: record.uploadId,
        localMessageId: record.localMessageId,
        roomId: record.roomId,
        status: record.status,
        progress: record.progress,
        errorMessage: record.errorMessage,
      });
    }
    return items;
  }

  onProgress(handler: (progress: UploadProgress) => void): () => void {
    this.progressHandlers.add(handler);
    return () => this.progressHandlers.delete(handler);
  }

  private notifyProgress(uploadId: string, percentage: number): void {
    const record = this.pendingUploads.get(uploadId);
    if (!record) return;
    const progress: UploadProgress = {
      uploadId,
      localMessageId: record.localMessageId,
      bytesUploaded: Math.round((percentage / 100) * record.file.size),
      totalBytes: record.file.size,
      percentage,
      status: record.status,
    };
    for (const handler of this.progressHandlers) {
      try {
        handler(progress);
      } catch {
        void 0;
      }
    }
  }

  private async fileFromLocalUri(localUri: string): Promise<File | null> {
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      return new File([blob], "upload", { type: blob.type });
    } catch {
      return null;
    }
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && "fetch" in window && "File" in window;
  }

  get mediaLocalUri(): string {
    return "";
  }
}
