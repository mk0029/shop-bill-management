"use client";

import React, { useState, useRef, useCallback } from "react";
import { SendHorizontalIcon, XIcon } from "lucide-react";

type Props = {
  isRecording: boolean;
  recordingDuration: number;
  audioLevels: number[];
  recordingError: string | null;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onClearError: () => void;
};

export default function VoiceRecorder({
  isRecording,
  recordingDuration,
  audioLevels,
  recordingError,
  onStopRecording,
  onCancelRecording,
  onClearError,
}: Props) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (recordingError) {
    return (
      <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-red-700 dark:text-red-300">
            {recordingError}
          </span>
          <button
            onClick={onClearError}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (!isRecording) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-3 border-t dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-500 font-medium text-sm">Recording</span>
      </div>

      <div className="text-zinc-700 dark:text-zinc-300 font-mono text-sm">
        {formatTime(recordingDuration)}
      </div>

      <div className="flex-1 flex items-center gap-[3px] h-8 px-1">
        {audioLevels.map((level, i) => {
          const height = Math.max(8, level * 100);
          return (
            <div
              key={i}
              className="flex-1 bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-100"
              style={{
                height: `${height}%`,
                minWidth: "2px",
              }}
            />
          );
        })}
      </div>

      <button
        onClick={onCancelRecording}
        className="flex-shrink-0 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
        title="Cancel recording"
      >
        <XIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
      </button>

      <button
        onClick={onStopRecording}
        className="flex-shrink-0 p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
        title="Send voice message"
      >
        <SendHorizontalIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
