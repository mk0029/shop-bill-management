"use client";

import React, { useEffect, useRef } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    const maxHeight = 118;
    const nextHeight = Math.min(textareaRef.current.scrollHeight + 2, maxHeight);
    textareaRef.current.style.height = `${nextHeight}px`;
    textareaRef.current.style.overflowY =
      textareaRef.current.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [text]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight + 2, 118)}px`;
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
        <div className="mx-auto w-full max-w-4xl px-2.5 pt-2 md:px-4">
          <div className="mb-2 rounded-2xl border border-slate-700/70 bg-slate-800/55 px-3 py-2 backdrop-blur-md text-sm flex justify-between items-center">
            <div className="truncate">
              <span className="text-emerald-300">Replying to: </span>
              <span className="text-slate-200 truncate">
                {typeof replyingTo?.content === "string"
                  ? replyingTo.content.slice(0, 50) +
                    (replyingTo.content.length > 50 ? "..." : "")
                  : ""}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {editingId && (
        <div className="mx-auto w-full max-w-4xl px-2.5 pt-2 md:px-4">
          <div className="mb-2 rounded-2xl border border-slate-700/70 bg-slate-800/55 px-3 py-2 backdrop-blur-md text-sm flex justify-between items-center">
            <div className="truncate">
              <span className="text-emerald-300">Editing: </span>
              <span className="text-slate-200 truncate">
                {text.slice(0, 50) + (text.length > 50 ? "..." : "")}
              </span>
            </div>
            <button
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
              onClick={onCancelEdit}
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {(attachments?.length || 0) > 0 && (
        <div className="mx-auto w-full max-w-[1400px] border-t border-slate-800 bg-slate-900/80 px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => {
              const isUploading = uploadingFiles.has(attachment.id);
              const progress = uploadProgress[attachment.id] || 0;

              return (
                <div
                  key={attachment.id}
                  className="relative group border rounded-lg p-2 bg-slate-800 border-slate-700"
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
                    <div className="w-16 h-16 flex items-center justify-center bg-slate-700 rounded">
                      <PaperclipIcon className="w-6 h-6 text-slate-300" />
                    </div>
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded flex flex-col items-center justify-center">
                      <div className="w-full px-2 mb-2">
                        <div className="w-full bg-white/20 rounded-full h-1">
                          <div
                            className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
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
                    className="text-xs text-slate-300 mt-1 truncate w-16"
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

      <div className="chat-composer-root border-t border-slate-800/90 bg-slate-900/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-[1400px] items-end gap-2 px-2.5 md:px-4">
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-800 cursor-pointer"
            title="Attach file"
          >
            <PaperclipIcon className="h-5 w-5" />
          </label>

          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              id="message-input"
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
              className="w-full resize-none rounded-[1.65rem] border border-slate-700/80 bg-slate-800/85 px-4 py-2.5 pr-12 text-[15px] text-slate-100 outline-none transition focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/60 max-h-[118px]"
              rows={1}
              style={{ minHeight: "44px" }}
            />
          </div>

          {text.trim() === "" && (attachments?.length || 0) === 0 ? (
            <button
              type="button"
              onClick={onStartRecording}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-800"
              title="Record voice message"
            >
              <MicIcon className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={onSend}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-600"
              title={editingId ? "Update message" : "Send message"}
            >
              <SendHorizontalIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
