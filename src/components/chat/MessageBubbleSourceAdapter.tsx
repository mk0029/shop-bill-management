import React, { useMemo } from "react";
import SourceMessageBubble from "@/components/chat/source-bubble";
import type { ChatMessage } from "@/lib/chat-api";
import type { Message } from "@/lib/types";

type Props = {
  message: ChatMessage;
  prev?: ChatMessage | null;
  next?: ChatMessage | null;
  onEdit?: (m: ChatMessage) => void;
  onReply?: (m: ChatMessage) => void;
  onCopy?: (m: ChatMessage) => void;
  isSelf: boolean;
};

const toMessage = (m: ChatMessage): Message => {
  const senderId = String((m.sender as any)?._id || (m.sender as any)?._ref || "");
  return {
    id: String(m._id),
    content: String(m.content || ""),
    senderId,
    timestamp: String(m.createdAt || new Date().toISOString()),
    status: (m.status as any) || "sent",
    edited: !!m.editedAt,
    editedAt: m.editedAt,
    reactions: (m.reactions || []).map((r) => ({
      userId: String(r.userId),
      userName: r.userName,
      emoji: r.emoji,
      timestamp: r.timestamp,
    })),
    type: (() => {
      const a = (m.attachments || [])[0];
      if (!a) return "text";
      if (a.type?.startsWith("image/")) return "image";
      if (a.type?.startsWith("video/")) return "video";
      if (a.type?.startsWith("audio/")) return "audio";
      return "document";
    })(),
    ...(m.parentId
      ? {
          replyTo: {
            messageId: String(m.parentId),
            text: String(m.parentMessage?.content || ""),
            senderId: String((m.parentMessage?.sender as any)?._id || (m.parentMessage?.sender as any)?._ref || ""),
            senderName: undefined,
          },
        }
      : {}),
    ...(m.attachments?.[0]?.url ? { content: String(m.attachments[0].url) } : {}),
  } as Message;
};

export default function MessageBubbleSourceAdapter({ message, prev, next, onEdit, onReply, isSelf }: Props) {
  const m = useMemo(() => toMessage(message), [message]);
  const p = useMemo(() => (prev ? toMessage(prev) : null), [prev]);
  const n = useMemo(() => (next ? toMessage(next) : null), [next]);

  return (
    <SourceMessageBubble
      message={m}
      prev={p}
      next={n}
      onEdit={onEdit ? () => onEdit(message) : undefined}
      onReply={onReply ? () => onReply(message) : undefined}
      onForward={undefined}
      onDelete={undefined}
      onInfo={undefined}
      onSelect={undefined}
      isSelected={false}
      selectMode={false}
      onResend={undefined}
    />
  );
}
