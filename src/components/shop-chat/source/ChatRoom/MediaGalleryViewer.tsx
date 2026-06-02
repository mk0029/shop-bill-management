import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Portal from "@/lib/ui/Portal";

type GalleryItem = {
  id: string;
  src: string;
  senderName: string;
  timestamp: string;
};

interface MediaGalleryViewerProps {
  open: boolean;
  items: GalleryItem[];
  activeId?: string | null;
  onClose: () => void;
}

const MediaGalleryViewer: React.FC<MediaGalleryViewerProps> = ({
  open,
  items,
  activeId,
  onClose,
}) => {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);

  useEffect(() => {
    if (!open) return;
    if (!items.length) return;
    if (!activeId) {
      setIndex(0);
      setZoom(1);
      return;
    }
    const nextIndex = items.findIndex(
      (item) => String(item.id) === String(activeId),
    );
    setIndex(nextIndex >= 0 ? nextIndex : 0);
    setZoom(1);
  }, [activeId, items, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setSlideDir(1);
        setIndex((value) => Math.min(items.length - 1, value + 1));
      }
      if (event.key === "ArrowLeft") {
        setSlideDir(-1);
        setIndex((value) => Math.max(0, value - 1));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [items.length, onClose, open]);

  const current = useMemo(() => items[index], [index, items]);
  const canPrev = index > 0;
  const canNext = index < items.length - 1;
  const formattedTime = current
    ? new Date(current.timestamp).toLocaleString([], {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const handleDownload = () => {
    if (!current?.src) return;
    const anchor = document.createElement("a");
    anchor.href = current.src;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.download = "";
    anchor.click();
  };

  return (
    <AnimatePresence>
      {open && current ? (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-[2000] bg-black"
            onClick={onClose}
          >
            <div
              className="flex h-full w-full flex-col"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-3 md:px-6">
                <div className="pointer-events-auto rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <div className="max-w-[46vw] truncate text-sm font-semibold text-slate-100 md:text-base">
                    {current.senderName}
                  </div>
                  <div className="max-w-[46vw] truncate text-xs text-slate-300/80 md:text-sm">
                    {formattedTime}
                  </div>
                </div>
                <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/10 p-2 backdrop-blur-sm">
                  <button
                    type="button"
                    className="grid size-8 md:h-11 md:w-11 place-items-center rounded-full text-slate-200 transition hover:bg-white/10 hover:text-white"
                    title="Search"
                  >
                    <Search size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setZoom((value) => Math.max(1, value - 0.15))
                    }
                    className="grid size-8 md:h-11 md:w-11 place-items-center rounded-full text-slate-200 transition hover:bg-white/10 hover:text-white"
                    title="Zoom out"
                  >
                    <ZoomOut size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setZoom((value) => Math.min(3, value + 0.15))
                    }
                    className="grid size-8 md:h-11 md:w-11 place-items-center rounded-full text-slate-200 transition hover:bg-white/10 hover:text-white"
                    title="Zoom in"
                  >
                    <ZoomIn size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="grid size-8 md:h-11 md:w-11 place-items-center rounded-full text-slate-200 transition hover:bg-white/10 hover:text-white"
                    title="Download"
                  >
                    <Download size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid size-8 md:h-11 md:w-11 place-items-center rounded-full text-slate-200 transition hover:bg-white/10 hover:text-white"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="relative flex min-h-0 flex-1 items-center justify-center px-0 py-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!canPrev) return;
                    setSlideDir(-1);
                    setIndex((value) => Math.max(0, value - 1));
                  }}
                  disabled={!canPrev}
                  className="absolute left-3 z-10 grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white transition hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-35 md:left-8"
                  title="Previous"
                >
                  <ChevronLeft size={24} />
                </button>

                <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black px-2 py-2 md:px-4 md:py-3">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={current.id}
                      initial={{ opacity: 0, x: slideDir > 0 ? 34 : -34 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: slideDir > 0 ? -26 : 26 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                      <img
                        src={current.src}
                        alt="media"
                        className="max-h-[76dvh] max-w-[94vw] object-contain md:max-h-[84dvh] md:max-w-[92vw]"
                        style={{ transform: `scale(${zoom})` }}
                        draggable={false}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!canNext) return;
                    setSlideDir(1);
                    setIndex((value) => Math.min(items.length - 1, value + 1));
                  }}
                  disabled={!canNext}
                  className="absolute right-3 z-10 grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white transition hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-35 md:right-8"
                  title="Next"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <div className="bg-black/85 px-2 py-2.5">
                <div className="no-scrollbar flex gap-2 overflow-x-auto px-1">
                  {items.map((item, thumbIndex) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSlideDir(thumbIndex >= index ? 1 : -1);
                        setIndex(thumbIndex);
                        setZoom(1);
                      }}
                      className={`relative h-14 w-14 flex-none overflow-hidden rounded-md border transition ${
                        thumbIndex === index
                          ? "border-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]"
                          : "border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <img
                        src={item.src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </Portal>
      ) : null}
    </AnimatePresence>
  );
};

export default MediaGalleryViewer;
