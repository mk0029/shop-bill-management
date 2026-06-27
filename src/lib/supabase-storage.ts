import { supabase } from "./supabase";

const CHAT_MEDIA_BUCKET = "chat-media";
const PROFILE_IMAGES_BUCKET = "profile-images";

type UploadResult = {
  url: string;
  path: string;
};

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function isVideo(mimeType: string) {
  return mimeType.startsWith("video/");
}

function isAudio(mimeType: string) {
  return mimeType.startsWith("audio/");
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/webm", "audio/ogg", "audio/wav", "audio/mp4",
  "application/pdf", "application/zip", "text/plain", "text/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }
  const baseType = file.type.split(";")[0].trim();
  if (!ALLOWED_TYPES.includes(baseType) && !baseType.startsWith("image/")) {
    return `File type ${file.type} is not supported`;
  }
  return null;
}

function getMediaType(mimeType: string): "image" | "video" | "audio" | "file" {
  if (isImage(mimeType)) return "image";
  if (isVideo(mimeType)) return "video";
  if (isAudio(mimeType)) return "audio";
  return "file";
}

export async function uploadChatMedia(
  file: File,
  roomId: string,
  messageId: string,
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `chat-media/${roomId}/${messageId}/${timestamp}-${safeFileName}`;

  if (onProgress) onProgress(0);

  const { error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    if (onProgress) onProgress(-1);
    throw new Error(`Upload failed: ${error.message}`);
  }

  if (onProgress) onProgress(100);

  const { data: urlData } = supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl, path: filePath };
}

export function getSignedUrl(path: string): Promise<string | null> {
  return supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7)
    .then(({ data }) => data?.signedUrl || null);
}

export async function deleteChatMedia(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .remove([path]);

  if (error) {
    console.warn("[SupabaseStorage] Failed to delete file:", path, error.message);
  }
}

export async function deleteChatMediaBatch(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .remove(paths);

  if (error) {
    console.warn("[SupabaseStorage] Failed to delete files:", error.message);
  }
}

export function buildMediaObject(
  file: File,
  uploadResult: UploadResult,
  width?: number,
  height?: number,
  duration?: number,
) {
  return {
    type: getMediaType(file.type),
    url: uploadResult.url,
    path: uploadResult.path,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    ...(width !== undefined && height !== undefined ? { width, height, aspectRatio: width / height } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(duration !== undefined ? { duration } : {}),
    uploadedAt: new Date().toISOString(),
  };
}

export async function uploadProfileImage(
  file: File,
  userId: string,
): Promise<UploadResult> {
  const timestamp = Date.now();
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `profile-images/${userId}/avatar-${timestamp}.${ext}`;

  const { error } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "31536000",
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl, path: filePath };
}

export async function deleteProfileImage(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .remove([path]);

  if (error) {
    console.warn("[SupabaseStorage] Failed to delete profile image:", error.message);
  }
}
