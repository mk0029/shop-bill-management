import React, { useState, useRef, useEffect } from "react";
import { SendHorizonal, X } from "lucide-react";
import { motion } from "framer-motion";
import AttachmentPicker from "./AttachmentPicker";
import VoiceRecorder from "./VoiceRecorder";
import CameraCaptureButton from "./CameraCaptureButton";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  onSendFiles: (
    files: File[],
    kind: "image" | "video" | "audio" | "document" | "contact",
  ) => Promise<void>;
  onSendVoiceNote: (audioBlob: Blob) => Promise<void>;
  onTyping?: (state: { active: boolean; kind: "text" | "voice" }) => void;
  replyTo?: {
    messageId: string;
    text: string;
    senderName?: string;
  } | null;
  onCancelReply?: () => void;
  editingMessage?: {
    id: string;
    content: string;
  } | null;
  onCancelEdit?: () => void;
  disabled?: boolean;
  placeholder?: string;
  focusKey?: string | null;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendFiles,
  onSendVoiceNote,
  onTyping,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  disabled = false,
  placeholder = "Type a message...",
  focusKey = null,
}) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onTypingRef = useRef<typeof onTyping>(onTyping);
  const lastTypingSentRef = useRef(false);
  const typingPingAtRef = useRef(0);
  const allowAutoFocusRef = useRef(true);
  const suppressRefocusOnBlurRef = useRef(false);
  const pointerInsideComposerRef = useRef(false);
  const prevModeRef = useRef<{ reply: boolean; edit: boolean }>({
    reply: false,
    edit: false,
  });
  const lastEditingIdRef = useRef<string | null>(null);
  const isAndroidRef = useRef(false);

  const mediaModeActive = isRecording || cameraOpen;

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    isAndroidRef.current = /Android/i.test(navigator.userAgent || "");
  }, []);

  useEffect(() => {
    onTypingRef.current = onTyping;
  }, [onTyping]);

  // Set editing message content
  useEffect(() => {
    const nextId = editingMessage?.id ? String(editingMessage.id) : null;
    const prevId = lastEditingIdRef.current;
    lastEditingIdRef.current = nextId;
    if (!editingMessage || nextId === prevId) return;
    setMessage(editingMessage.content);
    textareaRef.current?.focus();
  }, [editingMessage?.id]);

  useEffect(() => {
    const prev = prevModeRef.current;
    const next = { reply: !!replyTo, edit: !!editingMessage };
    const closedBoth = (prev.reply || prev.edit) && !next.reply && !next.edit;
    if (closedBoth) {
      setMessage("");
    }
    prevModeRef.current = next;
  }, [replyTo, editingMessage]);

  // Handle typing indicators
  useEffect(() => {
    if (!onTypingRef.current) return;

    const isTyping = message.trim().length > 0;

    if (isTyping) {
      const now = Date.now();
      const shouldPing =
        !lastTypingSentRef.current || now - typingPingAtRef.current >= 1200;
      if (shouldPing) {
        onTypingRef.current?.({ active: true, kind: "text" });
        lastTypingSentRef.current = true;
        typingPingAtRef.current = now;
      }
    }

    // Clear existing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Set timer to stop typing indicator
    typingTimerRef.current = setTimeout(() => {
      if (lastTypingSentRef.current) {
        onTypingRef.current?.({ active: false, kind: "text" });
        lastTypingSentRef.current = false;
        typingPingAtRef.current = 0;
      }
    }, 2000);

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [message]);

  useEffect(() => {
    return () => {
      if (!onTypingRef.current) return;
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      if (lastTypingSentRef.current) {
        onTypingRef.current?.({ active: false, kind: "text" });
        lastTypingSentRef.current = false;
        typingPingAtRef.current = 0;
      }
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 118; // ~3 lines with comfortable bottom padding
      const nextHeight = Math.min(textarea.scrollHeight + 2, maxHeight);
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    }
  }, [message]);

  useEffect(() => {
    const onPointerDownCapture = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const isInside = !!(
        target &&
        composerRef.current &&
        composerRef.current.contains(target)
      );
      pointerInsideComposerRef.current = isInside;
      allowAutoFocusRef.current = isInside;
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, []);

  const focusComposerInput = () => {
    requestAnimationFrame(() => {
      const t = textareaRef.current;
      if (!t) return;
      t.focus({ preventScroll: true });
      try {
        const pos = t.value.length;
        t.setSelectionRange(pos, pos);
      } catch {}
    });
  };

  useEffect(() => {
    const onFocusFromNotification = () => {
      if (disabled || mediaModeActive) return;
      allowAutoFocusRef.current = true;
      suppressRefocusOnBlurRef.current = false;
      focusComposerInput();
      setTimeout(() => {
        if (allowAutoFocusRef.current && !mediaModeActive) {
          focusComposerInput();
        }
      }, 40);
    };
    document.addEventListener(
      "chat:focus-composer" as any,
      onFocusFromNotification as any
    );
    return () =>
      document.removeEventListener(
        "chat:focus-composer" as any,
        onFocusFromNotification as any
      );
  }, [disabled, mediaModeActive]);

  // Default focus when entering/opening chat composer.
  useEffect(() => {
    if (disabled || mediaModeActive) return;
    allowAutoFocusRef.current = true;
    suppressRefocusOnBlurRef.current = false;
    focusComposerInput();
    const t = window.setTimeout(() => {
      if (allowAutoFocusRef.current && !mediaModeActive) {
        focusComposerInput();
      }
    }, 40);
    return () => window.clearTimeout(t);
  }, [disabled, mediaModeActive, focusKey]);

  const handleSend = async () => {
    const content = message.trim();
    if (!content || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSendMessage(content);
      setMessage("");
      if (onTypingRef.current) {
        onTypingRef.current({ active: false, kind: "text" });
        lastTypingSentRef.current = false;
        typingPingAtRef.current = 0;
      }
      if (allowAutoFocusRef.current) {
        focusComposerInput();
        setTimeout(() => {
          if (allowAutoFocusRef.current) focusComposerInput();
        }, 30);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Android behavior: Enter should always create a new line (not send).
    if (isAndroidRef.current && e.key === "Enter") {
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      if (editingMessage && onCancelEdit) {
        onCancelEdit();
        setMessage("");
      } else if (replyTo && onCancelReply) {
        onCancelReply();
        setMessage("");
      }
    }
  };

  const handleFilesSelected = async (
    files: File[],
    kind: "image" | "video" | "audio" | "document" | "contact",
  ) => {
    if (disabled) return;
    try {
      await onSendFiles(files, kind);
    } catch (error) {
      console.error("Failed to send files:", error);
    }
  };

  const handleVoiceNote = async (audioBlob: Blob) => {
    if (disabled) return;
    try {
      await onSendVoiceNote(audioBlob);
    } catch (error) {
      console.error("Failed to send voice note:", error);
    }
  };

  const handleRecordingChange = (active: boolean) => {
    setIsRecording(active);
    if (onTypingRef.current) {
      onTypingRef.current({ active, kind: "voice" });
      if (active) {
        lastTypingSentRef.current = false;
        typingPingAtRef.current = 0;
      }
    }
    if (active) {
      allowAutoFocusRef.current = false;
      suppressRefocusOnBlurRef.current = true;
      try {
        textareaRef.current?.blur();
      } catch {}
    }
  };

  const showSendButton = message.trim().length > 0;

  return (
    <div className="chat-composer-root border-t border-slate-800/90 bg-slate-900/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      {/* Reply/Edit Preview */}
      {(replyTo || editingMessage) && (
        <div className="mx-auto w-full max-w-4xl px-2.5 md:px-4">
          <div className="mb-2 rounded-2xl border border-slate-700/70 bg-slate-800/55 px-3 py-2 backdrop-blur-md">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-xs text-emerald-300">
                  {editingMessage
                    ? "Editing message"
                    : `Replying to ${replyTo?.senderName || "message"}`}
                </div>
                <div className="truncate text-sm text-slate-200">
                  {editingMessage ? editingMessage.content : replyTo?.text}
                </div>
              </div>
              <button
                type="button"
                onClick={editingMessage ? onCancelEdit : onCancelReply}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="mx-auto w-full  max-w-[1400px]  px-2.5 md:px-4">
        <div className="relative flex items-end gap-2">
          <div
            ref={composerRef}
            onClick={(e) => {
              const target = e.target as HTMLElement | null;
              if (target?.closest("[data-composer-no-focus]")) return;
              if (mediaModeActive) return;
              allowAutoFocusRef.current = true;
              focusComposerInput();
            }}
            className="group relative flex min-h-[50px] flex-1 items-center justify-between gap-2 rounded-[30px] border border-slate-700/80 bg-[#1e2733] px-3 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 hover:border-slate-600 focus-within:border-emerald-400/75 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.14)] "
          >
            <div
              className={`flex min-w-0 flex-1 items-center gap-2 transition-opacity ${
                isRecording ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
            >
              <div data-composer-no-focus>
                <AttachmentPicker
                  onFilesSelected={handleFilesSelected}
                  className="h-9 w-9 rounded-full border border-transparent bg-transparent text-slate-300 hover:border-slate-600 hover:bg-slate-700/70 hover:text-white"
                />
              </div>

              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (mediaModeActive) {
                    suppressRefocusOnBlurRef.current = true;
                    try {
                      textareaRef.current?.blur();
                    } catch {}
                    return;
                  }
                  allowAutoFocusRef.current = true;
                }}
                onBlur={() => {
                  if (suppressRefocusOnBlurRef.current) {
                    suppressRefocusOnBlurRef.current = false;
                    return;
                  }
                  if (mediaModeActive) return;
                  if (
                    pointerInsideComposerRef.current &&
                    allowAutoFocusRef.current
                  ) {
                    focusComposerInput();
                  }
                }}
                placeholder={disabled ? "Cannot send messages" : placeholder}
                disabled={disabled}
                className="no-scrollbar w-full resize-none bg-transparent px-1 py-[0.46rem] text-[15px] leading-[1.33] text-slate-100 placeholder:text-slate-400/85 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                rows={1}
                style={{ minHeight: "", maxHeight: "85px" }}
              />

              <div
                data-composer-no-focus
                className="flex h-10 items-center justify-end gap-0.5 pr-0.5"
              >
                <CameraCaptureButton
                  onCapture={async (file) => {
                    await handleFilesSelected([file], "image");
                  }}
                  onOpenChange={(open) => {
                    setCameraOpen(open);
                    if (open) {
                      allowAutoFocusRef.current = false;
                      suppressRefocusOnBlurRef.current = true;
                      try {
                        textareaRef.current?.blur();
                      } catch {}
                    }
                  }}
                  disabled={disabled}
                  className="h-9 w-9 scale-125 rounded-full border border-transparent bg-transparent text-slate-300 hover:border-slate-600 hover:bg-slate-700/70 hover:text-white"
                />
              </div>
            </div>

          </div>

          <div
            data-composer-no-focus
            className={
              isRecording
                ? "absolute inset-x-0 bottom-0 z-20 pb-0.5"
                : "pb-0.5"
            }
          >
            {showSendButton && !isRecording ? (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.72, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                onMouseDown={(e) => {
                  allowAutoFocusRef.current = true;
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  allowAutoFocusRef.current = true;
                  e.preventDefault();
                }}
                onClick={handleSend}
                disabled={isSending || disabled}
                className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-emerald-400/35 bg-emerald-500/95 text-slate-50 shadow-sm transition-colors hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                title="Send message"
              >
                <SendHorizonal size={18} />
              </motion.button>
            ) : (
              <div className={isRecording ? "w-full" : "h-11 w-11"}>
                <VoiceRecorder
                  onSend={handleVoiceNote}
                  onRecordingChange={handleRecordingChange}
                  inline={isRecording}
                  className={isRecording ? "w-full" : "h-11 w-11"}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
