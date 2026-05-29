import React, { useMemo } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { decodeTransportText } from "@/lib/messageCodec";

interface MessageContentProps {
  content: string;
  isEmojiOnly?: boolean;
  emojiCount?: number;
}

const finalBase64DecodeGuard = (input: string) => {
  const raw = String(input || "").trim();
  if (!raw) return raw;
  const compact = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return raw;
  if (compact.length % 4 !== 0) return raw;
  // Keep this guard narrow so normal user text is never mangled.
  if (compact.length > 24) return raw;
  try {
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(compact), (c) => c.charCodeAt(0))
    );
    if (!decoded) return raw;
    const hasHardControl = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(
      decoded
    );
    if (hasHardControl) return raw;
    // Keep unicode (emoji/non-English) valid; reject only heavily broken decodes.
    const replacementCount = (decoded.match(/\uFFFD/g) || []).length;
    if (replacementCount > 0 && replacementCount / decoded.length > 0.2) return raw;
    return decoded;
  } catch {
    return raw;
  }
};

const MessageContent: React.FC<MessageContentProps> = ({
  content,
  isEmojiOnly,
  emojiCount,
}) => {
  // Decode base64-transported text for display and URL detection
  const contentText = useMemo(() => {
    return finalBase64DecodeGuard(decodeTransportText(content || ""));
  }, [content]);

  // Emoji-only sizing logic
  const extractEmojis = (text: string) => {
    try {
      const re = /\p{Extended_Pictographic}/gu;
      return (text.match(re) || []) as string[];
    } catch {
      return [] as string[];
    }
  };

  const onlyEmojis = useMemo(() => {
    const t = contentText.trim();
    if (!t) return { isOnly: false, count: 0 };
    const emojis = extractEmojis(t);
    const nonEmoji = t.replace(/\p{Extended_Pictographic}/gu, "").trim();
    return {
      isOnly: nonEmoji.length === 0 && emojis.length > 0,
      count: emojis.length,
    };
  }, [contentText]);

  const emojiSizeClass = onlyEmojis.isOnly
    ? onlyEmojis.count === 1
      ? "text-4xl leading-snug"
      : onlyEmojis.count <= 3
        ? "text-2xl leading-snug"
        : "text-base"
    : "text-sm";

  // Linkify function
  const renderLinkified = (text: string) => {
    const tokens: Array<{
      type: "url" | "email" | "phone" | "text";
      value: string;
    }> = [];
    let i = 0;
    const master =
      /https?:\/\/[^\s]+|[\w.+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\+?\d[\d\s\-()]{6,}\d/gi;
    let m: RegExpExecArray | null;

    while ((m = master.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (start > i) tokens.push({ type: "text", value: text.slice(i, start) });
      const v = m[0];
      const emailRe = /[\w.+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i;
      const type = v.startsWith("http")
        ? "url"
        : emailRe.test(v)
          ? "email"
          : "phone";
      tokens.push({ type, value: v });
      i = end;
    }
    if (i < text.length) tokens.push({ type: "text", value: text.slice(i) });

    const longTimer = { id: 0 as any };
    const armLong =
      (value: string) => (e: React.MouseEvent | React.TouchEvent) => {
        clearTimeout(longTimer.id);
        const fn = async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.success("Copied");
          } catch {
            toast.error("Copy failed");
          }
        };
        longTimer.id = setTimeout(fn, 600);
      };
    const disarmLong = () => {
      clearTimeout(longTimer.id);
    };
    const copyOnContext = (value: string) => async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(value);
        toast.success("Copied");
      } catch {
        toast.error("Copy failed");
      }
    };

    return tokens.map((t, idx) => {
      if (t.type === "url") {
        return (
          <span key={`url-${idx}`} className="text-emerald-300 break-all">
            {t.value}
          </span>
        );
      }
      if (t.type === "email") {
        const href = `mailto:${t.value}`;
        return (
          <Link
            key={`em-${idx}`}
            href={href}
            className="text-emerald-300 hover:underline break-all"
            onContextMenu={copyOnContext(t.value)}
            onMouseDown={armLong(t.value)}
            onMouseUp={disarmLong}
            onMouseLeave={disarmLong}
            onTouchStart={armLong(t.value)}
            onTouchEnd={disarmLong}>
            {t.value}
          </Link>
        );
      }
      if (t.type === "phone") {
        const digits = t.value.replace(/[^\d+]/g, "");
        const href = `tel:${digits}`;
        return (
          <Link
            key={`ph-${idx}`}
            href={href}
            className="text-emerald-300 hover:underline"
            onContextMenu={copyOnContext(t.value)}
            onMouseDown={armLong(t.value)}
            onMouseUp={disarmLong}
            onMouseLeave={disarmLong}
            onTouchStart={armLong(t.value)}
            onTouchEnd={disarmLong}>
            {t.value}
          </Link>
        );
      }
      return <span key={`tx-${idx}`}>{t.value}</span>;
    });
  };

  return (
    <div
      className={`whitespace-pre-wrap break-words ${onlyEmojis.isOnly ? "text-center" : ""} ${emojiSizeClass}`}>
      {renderLinkified(contentText)}
    </div>
  );
};

export default MessageContent;
