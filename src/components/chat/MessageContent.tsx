import React, { useMemo } from "react";

interface MessageContentProps {
  content: string;
}

export default function MessageContent({ content }: MessageContentProps) {
  const text = useMemo(() => String(content || ""), [content]);
  return <div className="whitespace-pre-wrap break-words text-sm">{text}</div>;
}
