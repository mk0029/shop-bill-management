import React from "react";

interface MediaPlayerProps {
  type: "image" | "video" | "audio" | "file";
  src: string;
  timeLabel?: string;
}

export default function MediaPlayer({ type, src, timeLabel }: MediaPlayerProps) {
  if (type === "image") {
    return (
      <div className="relative w-[min(62vw,320px)] max-w-full overflow-hidden rounded-xl border border-gray-700 bg-black aspect-square">
        <img src={src} alt="image" className="h-full w-full object-contain" />
        {timeLabel && <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/90">{timeLabel}</div>}
      </div>
    );
  }
  if (type === "video") {
    return <video src={src} controls className="relative w-[min(62vw,320px)] max-w-full overflow-hidden rounded-xl border border-gray-700 bg-black aspect-video" />;
  }
  if (type === "audio") {
    return <audio src={src} controls className="w-[min(58vw,300px)] max-w-full" />;
  }
  return <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700">Download file</a>;
}
