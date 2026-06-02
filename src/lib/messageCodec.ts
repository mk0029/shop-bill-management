const BASE64_RE = /^[A-Za-z0-9+/_=\n\r-]+$/;

export const isMediaProxyPath = (value: string) =>
  String(value || "").trim().startsWith("/api/media/");

const toStdBase64 = (raw: string) => {
  let normalized = String(raw || "").trim().replace(/\s+/g, "");
  if (!normalized) return normalized;
  normalized = normalized.replace(/-/g, "+").replace(/_/g, "/");
  const rem = normalized.length % 4;
  if (rem) normalized += "=".repeat(4 - rem);
  return normalized;
};

export const decodeTransportText = (rawInput: any) => {
  const raw = String(rawInput || "");
  if (!raw) return "";
  if (isMediaProxyPath(raw)) return raw;
  let value = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    const candidate = toStdBase64(value);
    const isLikelyBase64 =
      candidate.length >= 4 &&
      BASE64_RE.test(candidate) &&
      candidate.replace(/=+$/g, "").length >= 2;

    if (!isLikelyBase64) break;

    try {
      const decoded = new TextDecoder().decode(
        Uint8Array.from(atob(candidate), (c) => c.charCodeAt(0))
      );
      if (!decoded) break;
      const hasHardControl = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(decoded);
      if (hasHardControl) break;
      // Allow full UTF-8 text (emoji, Hindi, etc.) instead of ASCII-only checks.
      // Reject only obviously broken decode results with many replacement chars.
      const replacementCount = (decoded.match(/\uFFFD/g) || []).length;
      if (replacementCount > 0 && replacementCount / decoded.length > 0.2) break;
      if (decoded === value) break;
      value = decoded;
      if (isMediaProxyPath(value)) return value;
      continue;
    } catch {
      break;
    }
  }
  return value;
};

export const inferMediaKindFromText = (
  text: string
): "image" | "video" | "audio" | "document" | null => {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const source = (() => {
    try {
      const u = new URL(
        raw,
        typeof window !== "undefined" ? window.location.origin : "http://localhost"
      );
      return String(u.searchParams.get("filename") || u.pathname || "").toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  })();
  if (/\.(png|jpg|jpeg|gif|webp|avif|bmp|heic|heif)(\?|#|$)/.test(source))
    return "image";
  if (/\.(mp4|mov|m4v|webm|avi|mkv|3gp|mpeg|mpg|wmv|flv|ts|m2ts|mts|ogv|vob|rm|rmvb)(\?|#|$)/.test(source))
    return "video";
  if (/\.(mp3|mpeg|mpga|m4a|aac|wav|ogg|oga|flac|opus|weba|wma|amr|aiff|aif|mka)(\?|#|$)/.test(source))
    return "audio";
  if (isMediaProxyPath(raw)) return "document";
  return null;
};

export const mediaReplyLabel = (text: string) => {
  const kind = inferMediaKindFromText(text);
  if (!kind) return String(text || "");
  if (kind === "image") return "Image";
  if (kind === "video") return "Video";
  if (kind === "audio") return "Audio";
  return "Document";
};
