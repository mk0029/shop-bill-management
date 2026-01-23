"use client";

import React, { useState, useCallback } from "react";
import {
  SendHorizontalIcon,
  PaperclipIcon,
  XIcon,
  Mic as MicIcon,
} from "lucide-react";
import Image from "next/image";
import type { ChatMessage } from "@/lib/chat-api";

type Attachment = {
  file: File;
  preview?: string;
  id: string;
};

type Props = {
  text: string;
  setText: (text: string) => void;
  attachments: Attachment[];
  onFileSelect: (files: FileList | null) => void;
  onRemoveAttachment: (id: string) => void;
  onSend: () => void;
  onStartRecording: () => void;
  uploadProgress: Record<string, number>;
  uploadingFiles: Set<string>;
  editingId: string | null;
  replyingTo: ChatMessage | null;
  onCancelEdit: () => void;
  onCancelReply: () => void;
};

export default function MessageInput({
  text,
  setText,
  attachments,
  onFileSelect,
  onRemoveAttachment,
  onSend,
  onStartRecording,
  uploadProgress,
  uploadingFiles,
  editingId,
  replyingTo,
  onCancelEdit,
  onCancelReply,
}: Props) {
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
      e.currentTarget.style.height = "auto";
    }
  };

  return (
    <>
      {replyingTo && (
        <div className="px-4 pt-2 border-t dark:border-zinc-700">
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 text-sm flex justify-between items-center">
            <div className="truncate">
              <span className="text-emerald-500">Replying to: </span>
              <span className="text-zinc-400 truncate">
                {typeof replyingTo?.content === "string"
                  ? replyingTo.content.slice(0, 50) +
                    (replyingTo.content.length > 50 ? "..." : "")
                  : ""}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {editingId && (
        <div className="mt-1 border rounded-md p-2 bg-blue-50 dark:bg-zinc-800/60 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">Editing message</div>
            <button
              className="opacity-70 hover:opacity-100"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {(attachments?.length || 0) > 0 && (
        <div className="px-4 py-2 border-t dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => {
              const isUploading = uploadingFiles.has(attachment.id);
              const progress = uploadProgress[attachment.id] || 0;

              return (
                <div
                  key={attachment.id}
                  className="relative group border rounded-lg p-2 bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600"
                >
                  {attachment.preview ? (
                    <Image
                      src={attachment.preview}
                      alt={attachment.file.name}
                      width={48}
                      height={48}
                      quality={100}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center bg-zinc-100 dark:bg-zinc-600 rounded">
                      <PaperclipIcon className="w-6 h-6 text-zinc-400" />
                    </div>
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded flex flex-col items-center justify-center">
                      <div className="w-full px-2 mb-2">
                        <div className="w-full bg-white/20 rounded-full h-1">
                          <div
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-white text-xs font-medium">
                        {Math.round(progress)}%
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => onRemoveAttachment(attachment.id)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isUploading}
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                  <div
                    className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 truncate w-16"
                    title={attachment.file.name}
                  >
                    {attachment.file.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 md:gap-2 p-2 sm:py-3 border-t rounded-lg dark:border-zinc-900 bg-white dark:bg-zinc-900">
        <input
          type="file"
          multiple
          accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.txt"
          onChange={(e) => onFileSelect(e.target.files)}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="flex-shrink-0 p-1 md:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer transition-colors"
          title="Attach file"
        >
          <PaperclipIcon className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
        </label>

        <div className="flex-1 relative">
          <textarea
            id="message-input"
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              replyingTo ? "Type your reply..." : "Type a message..."
            }
            className="w-full rounded-3xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 hide-scroll dark:bg-zinc-800 px-4 py-2.5 pr-12 text-base resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all max-h-[96px] overflow-y-auto"
            rows={1}
            style={{ minHeight: "44px" }}
          />
        </div>

        {text.trim() === "" && (attachments?.length || 0) === 0 ? (
          <button
            type="button"
            onClick={onStartRecording}
            className="flex-shrink-0 p-1 md:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            title="Record voice message"
          >
            <MicIcon className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
          </button>
        ) : (
          <button
            onClick={onSend}
            className="flex-shrink-0 p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
            title={editingId ? "Update message" : "Send message"}
          >
            <SendHorizontalIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </>
  );
}
