import React from "react";
import { Message } from "@/lib/types";

interface MessageStatusProps {
  message: Message;
  isCurrentUser: boolean;
  time: string;
  onResend?: () => void;
}

const MessageStatus: React.FC<MessageStatusProps> = ({
  message,
  isCurrentUser,
  time,
  onResend,
}) => {
  const status: NonNullable<Message["status"]> = message.status ?? "sent";

  const StatusIcon: React.FC = () => {
    if (!isCurrentUser) return null;

    const map: Record<string, string> = {
      sending: "/svg/clock-msg-send.svg",
      pending: "/svg/clock-msg-send.svg",
      sent: "/svg/check-msg-send.svg",
      delivered: "/svg/check-msg-recived.svg",
      read: "/svg/check-msg-read.svg",
      seen: "/svg/check-msg-read.svg",
      failed: "/svg/clock-alert-msg-faild.svg",
    } as const;

    const src = map[status];
    const title = status.charAt(0).toUpperCase() + status.slice(1);
    if (!src) return null;

    return (
      <img
        src={src}
        alt={title}
        title={title}
        className="w-3.5 h-3.5 opacity-80"
      />
    );
  };

  return (
    <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-slate-300/85">
      {isCurrentUser && status === "failed" && onResend && (
        <button
          type="button"
          onClick={onResend}
          className="mr-1 inline-flex items-center rounded-full border border-rose-400/45 bg-rose-500/10 px-1.5 py-[1px] text-[9px] font-medium text-rose-200 transition hover:bg-rose-500/20"
          title="Resend message"
        >
          Resend
        </button>
      )}
      {message.edited && <span className="mr-1 opacity-70">(edited)</span>}
      <span>{time}</span>
      <StatusIcon />
    </div>
  );
};

export default MessageStatus;
