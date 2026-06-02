import React from "react";
import type { Message } from "@/lib/types";

export default function MessageReactions({ message }: { message: Message }) {
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  if (!reactions.length) return null;

  return (
    <div className="absolute -bottom-4 right-2 flex rounded-full border border-slate-600/50 bg-slate-900/95 px-1.5 py-0.5 text-[11px] shadow-lg">
      {reactions.slice(0, 4).map((reaction, index) => (
        <span key={`${reaction.userId}-${reaction.emoji}-${index}`} title={reaction.userName || reaction.userId}>
          {reaction.emoji}
        </span>
      ))}
    </div>
  );
}
