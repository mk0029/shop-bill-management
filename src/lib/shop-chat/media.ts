export interface ChatMedia {
  type: "image" | "video" | "audio" | "file";
  url: string;
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  uploadedAt: string;
}

const SUPABASE_PUBLIC_URL_PATTERN = /^https?:\/\/[^/]+\/storage\/v1\/object\/public\//;
const SANITY_CDN_PATTERN = /^https?:\/\/cdn\.sanity\.io\//;
const DATA_URL_PATTERN = /^data:/;

export function isSupabaseUrl(url: string): boolean {
  return SUPABASE_PUBLIC_URL_PATTERN.test(url);
}

export function isSanityUrl(url: string): boolean {
  return SANITY_CDN_PATTERN.test(url);
}

export function isDataUrl(url: string): boolean {
  return DATA_URL_PATTERN.test(url);
}

export function isValidMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return isSupabaseUrl(url) || isSanityUrl(url) || isDataUrl(url) || url.startsWith("/api/") || url.startsWith("blob:");
}

export function getMediaUrl(
  mediaOrUrl: ChatMedia | string | null | undefined,
): string | null {
  if (!mediaOrUrl) return null;
  if (typeof mediaOrUrl === "string") return mediaOrUrl;
  return mediaOrUrl.url || null;
}

export function getMediaType(
  mediaOrUrl: ChatMedia | string | null | undefined,
  fallbackType?: string,
): "image" | "video" | "audio" | "file" {
  if (!mediaOrUrl) return "file";

  if (typeof mediaOrUrl === "object" && "type" in mediaOrUrl) {
    return mediaOrUrl.type;
  }

  const url = typeof mediaOrUrl === "string" ? mediaOrUrl : "";
  if (!url) return (fallbackType as any) || "file";

  const ext = url.split("?")[0].toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|avif|bmp|heic|heif)(\?|#|$)/.test(ext)) return "image";
  if (/\.(mp4|mov|webm|avi|mkv|3gp)(\?|#|$)/.test(ext)) return "video";
  if (/\.(mp3|wav|ogg|m4a|aac|webm|opus)(\?|#|$)/.test(ext)) return "audio";

  if (url.startsWith("data:")) {
    const mime = url.slice(5, url.indexOf(";") > 0 ? url.indexOf(";") : url.indexOf(",")).toLowerCase();
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
  }

  return "file";
}

export function getFileName(media: ChatMedia | null | undefined): string {
  return media?.fileName || "file";
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const MEDIA_URL_CACHE = new Map<string, string>();
const CACHE_TTL = 5 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();

export function getCachedMediaUrl(url: string): string {
  const cached = MEDIA_URL_CACHE.get(url);
  const ts = cacheTimestamps.get(url);
  if (cached && ts && Date.now() - ts < CACHE_TTL) {
    return cached;
  }
  MEDIA_URL_CACHE.set(url, url);
  cacheTimestamps.set(url, Date.now());
  return url;
}
