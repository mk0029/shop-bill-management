import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Message } from "@/lib/types";
import MessageStatus from "./MessageStatus";

interface MediaCollageBubbleProps {
  messages: Message[];
  isCurrentUser: boolean;
  onOpenImage?: (payload: { src: string; messageId: string }) => void;
}

const tileClassForCount = (count: number, index: number) => {
  if (count <= 2) return "col-span-1 row-span-1";
  if (count === 3) {
    if (index === 0) return "col-span-2 row-span-1";
    return "col-span-1 row-span-1";
  }
  return "col-span-1 row-span-1";
};

const MediaThumb: React.FC<{
  message: Message;
  onOpen: () => void;
  extraOverlay?: string;
}> = ({ message, onOpen, extraOverlay }) => {
  const isVideo = String(message.type || "").toLowerCase() === "video";
  const src = message.content || "";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative overflow-hidden rounded-lg border border-gray-700 bg-black aspect-square">
      {isVideo ? (
        <video src={src} muted playsInline className="h-full w-full object-cover" />
      ) : (
        <img src={src} alt="media" className="h-full w-full object-cover" loading="lazy" />
      )}
      {isVideo && (
        <div className="absolute inset-0 grid place-items-center bg-black/30">
          <div className="h-8 w-8 rounded-full bg-black/60 text-white grid place-items-center text-sm">
            ▶
          </div>
        </div>
      )}
      {extraOverlay && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 text-white text-lg font-semibold">
          {extraOverlay}
        </div>
      )}
    </button>
  );
};

const MediaCollageBubble: React.FC<MediaCollageBubbleProps> = ({
  messages,
  isCurrentUser,
  onOpenImage,
}) => {
  const count = messages.length;
  const lastMessage = messages[count - 1];
  const visible = useMemo(() => messages.slice(0, 4), [messages]);
  const remaining = count - visible.length;
  const time = new Date(lastMessage.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div className={`w-full flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`group relative max-w-[75%] rounded-2xl p-2 shadow-sm ${
            isCurrentUser ? "bg-gray-700 text-gray-100" : "bg-gray-800 text-gray-100"
          }`}>
          <div className="grid grid-cols-2 gap-1.5">
            {visible.map((message, idx) => (
              <div key={message.id} className={tileClassForCount(visible.length, idx)}>
                <MediaThumb
                  message={message}
                  onOpen={() =>
                    onOpenImage?.({
                      src: String(message.content || ""),
                      messageId: String(message.id),
                    })
                  }
                  extraOverlay={remaining > 0 && idx === 3 ? `+${remaining}` : undefined}
                />
              </div>
            ))}
          </div>

          <MessageStatus
            message={lastMessage}
            isCurrentUser={isCurrentUser}
            time={time}
          />
        </motion.div>
      </div>
    </>
  );
};

export default MediaCollageBubble;
