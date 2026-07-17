export type UploadStatus =
  | "local_pending"
  | "queued"
  | "uploading"
  | "sending"
  | "sent"
  | "delivered"
  | "seen"
  | "failed"
  | "cancelled";

export type UploadType = "image" | "video" | "audio" | "document";

export interface SelectedMedia {
  localUri: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadType: UploadType;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface QueueUploadInput {
  roomId: string;
  localMessageId: string;
  media: SelectedMedia;
}

export interface QueuedUpload {
  uploadId: string;
  localMessageId: string;
  roomId: string;
  status: UploadStatus;
  progress: number;
  errorMessage?: string;
}

export interface UploadProgress {
  uploadId: string;
  localMessageId: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  status: string;
}

export interface UploadAdapter {
  pickImage(roomId: string): Promise<SelectedMedia | null>;
  pickVideo(roomId: string): Promise<SelectedMedia | null>;
  pickDocument(roomId: string): Promise<SelectedMedia | null>;
  takePhoto(roomId: string): Promise<SelectedMedia | null>;
  queueUpload(input: QueueUploadInput): Promise<QueuedUpload>;
  retryUpload(uploadId: string): Promise<void>;
  cancelUpload(uploadId: string): Promise<void>;
  getPendingUploads(): Promise<QueuedUpload[]>;
  onProgress(handler: (progress: UploadProgress) => void): () => void;
}
