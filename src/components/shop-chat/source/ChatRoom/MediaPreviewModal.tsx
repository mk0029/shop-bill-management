import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  SendHorizonal,
  Trash2,
  FileText,
  Music2,
  Contact,
  Image as ImageIcon,
  Video,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface PendingFile {
  file: File;
  kind: "image" | "video" | "audio" | "document" | "contact";
  previewUrl?: string;
}

interface MediaPreviewModalProps {
  files: PendingFile[];
  onSend: (files: File[], kind: "image" | "video" | "audio" | "document" | "contact", caption: string) => void;
  onCancel: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(kind: string) {
  switch (kind) {
    case "image":
      return ImageIcon;
    case "video":
      return Video;
    case "audio":
      return Music2;
    case "contact":
      return Contact;
    default:
      return FileText;
  }
}

const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  files,
  onSend,
  onCancel,
}) => {
  const [caption, setCaption] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [localFiles, setLocalFiles] = useState<PendingFile[]>(files);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewUrlsRef = useRef<Map<File, string>>(new Map());

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, []);

  const getPreviewUrl = useCallback((pf: PendingFile) => {
    if (pf.previewUrl) return pf.previewUrl;
    const cached = previewUrlsRef.current.get(pf.file);
    if (cached) return cached;
    const url = URL.createObjectURL(pf.file);
    previewUrlsRef.current.set(pf.file, url);
    return url;
  }, []);

  const handleRemove = (index: number) => {
    const pf = localFiles[index];
    const url = previewUrlsRef.current.get(pf.file);
    if (url) {
      URL.revokeObjectURL(url);
      previewUrlsRef.current.delete(pf.file);
    }
    const next = localFiles.filter((_, i) => i !== index);
    setLocalFiles(next);
    if (activeIndex >= next.length) {
      setActiveIndex(Math.max(0, next.length - 1));
    }
  };

  const handleSend = () => {
    if (!localFiles.length) return;
    const allFiles = localFiles.map((pf) => pf.file);
    const primaryKind = localFiles[0].kind;
    onSend(allFiles, primaryKind, caption.trim());
  };

  const activeFile = localFiles[activeIndex];

  const renderPreview = (pf: PendingFile, index: number) => {
    const url = getPreviewUrl(pf);

    if (pf.kind === "image") {
      return (
        <img
          src={url}
          alt={pf.file.name}
          className="max-h-[50vh] w-full rounded-lg object-contain"
        />
      );
    }

    if (pf.kind === "video") {
      return (
        <video
          src={url}
          controls
          className="max-h-[50vh] w-full rounded-lg object-contain"
        />
      );
    }

    if (pf.kind === "audio") {
      return (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-white/[0.06] p-8">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/30">
            <Music2 size={28} className="text-emerald-300" />
          </div>
          <audio src={url} controls className="w-full max-w-xs" />
          <p className="max-w-[260px] truncate text-sm text-slate-300">{pf.file.name}</p>
        </div>
      );
    }

    const Icon = getFileIcon(pf.kind);
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-white/[0.06] p-8">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-violet-500/20 ring-1 ring-violet-400/30">
          <Icon size={28} className="text-violet-300" />
        </div>
        <div className="text-center">
          <p className="max-w-[260px] truncate text-sm font-medium text-slate-200">
            {pf.file.name}
          </p>
          <p className="mt-1 text-xs text-slate-400">{formatFileSize(pf.file.size)}</p>
        </div>
      </div>
    );
  };

  if (!localFiles.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="media-preview-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) onCancel();
        }}
      >
        <motion.div
          key="media-preview-modal"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative mx-2 mb-4 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl sm:mb-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-100">
              Preview ({localFiles.length} {localFiles.length === 1 ? "file" : "files"})
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Preview Area */}
          <div className="relative flex min-h-[200px] flex-1 items-center justify-center overflow-auto px-4 py-4">
            {activeFile && renderPreview(activeFile, activeIndex)}

            {/* Navigation arrows for multiple files */}
            {localFiles.length > 1 && (
              <>
                {activeIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveIndex((i) => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                {activeIndex < localFiles.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveIndex((i) => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Thumbnail strip for multiple files */}
          {localFiles.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-2">
              {localFiles.map((pf, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    i === activeIndex
                      ? "border-emerald-400 ring-1 ring-emerald-400/30"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  {pf.kind === "image" ? (
                    <img
                      src={getPreviewUrl(pf)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : pf.kind === "video" ? (
                    <div className="grid h-full w-full place-items-center bg-slate-800">
                      <Video size={16} className="text-slate-300" />
                    </div>
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-slate-800">
                      {React.createElement(getFileIcon(pf.kind), {
                        size: 16,
                        className: "text-slate-300",
                      })}
                    </div>
                  )}
                  {/* Remove button on thumbnail */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(i);
                    }}
                    className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110"
                  >
                    <X size={10} />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Caption + Send */}
          <div className="flex items-end gap-2 border-t border-white/10 px-4 py-3">
            <textarea
              ref={textareaRef}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              rows={1}
              className="no-scrollbar max-h-20 min-h-[36px] flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400/70 focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/20"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-emerald-400/35 bg-emerald-500/95 text-slate-50 shadow-sm transition-colors hover:bg-emerald-400"
              title="Send"
            >
              <SendHorizonal size={18} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MediaPreviewModal;
export type { PendingFile };
