import React from "react";
import type { ChatMessage } from "@/lib/chat-api";

interface MessageStatusProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  time: string;
}

export default function MessageStatus({ message, isCurrentUser, time }: MessageStatusProps) {
  const status = message.status ?? "sent";
  return (
    <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-slate-300/85">
      {message.editedAt && <span className="mr-1 opacity-70">(edited)</span>}
      <span>{time}</span>
      {isCurrentUser && <span className="opacity-80">{status === "seen" ? "??" : status === "delivered" ? "??" : status === "pending" ? "?" : "?"}</span>}
    </div>
  );
}
