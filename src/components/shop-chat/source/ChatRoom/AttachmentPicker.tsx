import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Paperclip,
  Image as ImageIcon,
  FileText,
  Music2,
  Contact,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface AttachmentPickerProps {
  onFilesSelected: (
    files: File[],
    kind: "image" | "video" | "audio" | "document" | "contact"
  ) => void;
  className?: string;
}

type AttachmentKind = "image" | "video" | "audio" | "document" | "contact";
type PickerMode = AttachmentKind | "media";

const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  onFilesSelected,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pickerModeRef = useRef<PickerMode>("media");
  const attachBtnRef = useRef<HTMLButtonElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      const menu = attachMenuRef.current;
      const btn = attachBtnRef.current;
      if (menu && menu.contains(t)) return;
      if (btn && btn.contains(t as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  // Close on global close signal
  useEffect(() => {
    const onGlobalClose = () => setIsOpen(false);
    document.addEventListener(
      "smartpopup:close-all" as any,
      onGlobalClose as any
    );
    return () =>
      document.removeEventListener(
        "smartpopup:close-all" as any,
        onGlobalClose as any
      );
  }, []);

  const menuItems = useMemo(
    () => [
      {
        mode: "media" as const,
        icon: ImageIcon,
        label: "Photos & Videos",
        hint: "JPG, PNG, MP4, MOV",
        color: "text-sky-300",
        glow: "from-sky-500/25 to-cyan-500/5",
        accept:
          "image/*,video/*,.mp4,.mov,.m4v,.avi,.mkv,.webm,.3gp,.mpeg,.mpg,.wmv,.flv,.ts,.m2ts,.mts,.ogv,.vob,.rm,.rmvb",
      },
      {
        mode: "document" as const,
        icon: FileText,
        label: "Document",
        hint: "PDF, DOCX, ZIP",
        color: "text-violet-300",
        glow: "from-violet-500/25 to-fuchsia-500/5",
        accept:
          "application/*,text/*,.pdf,.txt,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z,.json,.md",
      },
      {
        mode: "audio" as const,
        icon: Music2,
        label: "Audio",
        hint: "MP3, M4A, WAV",
        color: "text-emerald-300",
        glow: "from-emerald-500/25 to-green-500/5",
        accept:
          "audio/*,.mp3,.mpeg,.mpga,.m4a,.aac,.wav,.ogg,.oga,.flac,.opus,.weba,.wma,.amr,.aiff,.aif,.mka",
      },
      {
        mode: "contact" as const,
        icon: Contact,
        label: "Contact",
        hint: "VCF / vCard",
        color: "text-amber-300",
        glow: "from-amber-500/25 to-orange-500/5",
        accept: ".vcf,.vcard,text/vcard",
      },
    ],
    []
  );

  const escapeVcf = (value: string) =>
    String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");

  const openDeviceContactPicker = async () => {
    const anyNav = navigator as any;
    if (!anyNav?.contacts?.select) return false;
    try {
      const contacts = await anyNav.contacts.select(
        ["name", "tel", "email"],
        { multiple: true }
      );
      if (!Array.isArray(contacts) || !contacts.length) return true;
      for (const c of contacts) {
        const name = String(c?.name?.[0] || "Contact").trim() || "Contact";
        const tel = String(c?.tel?.[0] || "").trim();
        const email = String(c?.email?.[0] || "").trim();
        const lines = [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${escapeVcf(name)}`,
          tel ? `TEL;TYPE=CELL:${escapeVcf(tel)}` : "",
          email ? `EMAIL;TYPE=INTERNET:${escapeVcf(email)}` : "",
          "END:VCARD",
        ].filter(Boolean);
        const blob = new Blob([lines.join("\n")], { type: "text/vcard" });
        const file = new File([blob], `${name.replace(/\s+/g, "_")}.vcf`, {
          type: "text/vcard",
        });
        onFilesSelected([file], "contact");
      }
      return true;
    } catch {
      return true;
    }
  };

  const openPickerFor = async (mode: PickerMode, accept: string) => {
    pickerModeRef.current = mode;
    if (mode === "contact") {
      const usedDeviceContacts = await openDeviceContactPicker();
      if (usedDeviceContacts) {
        setIsOpen(false);
        return;
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.accept = accept;
      fileInputRef.current.multiple = true;
      fileInputRef.current.click();
    }
    setIsOpen(false);
  };

  const inferKind = (file: File): AttachmentKind => {
    const pickerMode = pickerModeRef.current;
    const mimeType = String(file.type || "").toLowerCase();
    const fileName = String(file.name || "").toLowerCase();

    if (pickerMode === "audio") return "audio";
    if (pickerMode === "document") return "document";
    if (pickerMode === "contact") return "contact";

    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.includes("vcard") || /\.(vcf|vcard)$/i.test(fileName)) {
      return "contact";
    }
    if (pickerMode === "media") {
      if (
        /\.(mp4|mov|m4v|avi|mkv|webm|3gp|mpeg|mpg|wmv|flv|ts|m2ts|mts|ogv|vob|rm|rmvb)$/i.test(
          fileName
        )
      ) {
        return "video";
      }
      return "image";
    }
    return "document";
  };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const kind = inferKind(files[0]);
    onFilesSelected(files, kind);
  };

  return (
    <div className="relative">
      <button
        type="button"
        ref={attachBtnRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative grid h-11 w-11 place-items-center rounded-full border border-slate-700/80 bg-slate-800/70 text-slate-300 transition-all duration-200 hover:scale-[1.03] hover:border-emerald-400/60 hover:bg-slate-700/80 hover:text-emerald-200 active:scale-95 ${className}`}
        title="Attach file">
        <Paperclip size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={attachMenuRef}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={
              isMobile
                ? "fixed inset-x-3 z-[70] w-auto overflow-hidden rounded-2xl border border-slate-600/70 bg-slate-900/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl"
                : "absolute bottom-full left-0 z-50 mb-3 w-[240px] overflow-hidden rounded-2xl border border-slate-600/70 bg-slate-900/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl"
            }
            style={
              isMobile
                ? { bottom: "max(0.75rem, env(safe-area-inset-bottom))" }
                : undefined
            }>
            {menuItems.map(({ mode, icon: Icon, label, hint, color, glow, accept }, index) => (
              <motion.button
                key={mode}
                type="button"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03, duration: 0.15 }}
                onClick={() => {
                  void openPickerFor(mode, accept);
                }}
                className={`group relative mb-1 flex w-full items-center gap-3 overflow-hidden rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-200 hover:border-slate-500/70 hover:bg-slate-800/80 last:mb-0`}>
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${glow}`}
                />
                <span className="relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/90 ring-1 ring-slate-600/50">
                  <Icon size={16} className={color} />
                </span>
                <span className="relative z-10 min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-100">{label}</span>
                  <span className="block truncate text-xs text-slate-400">{hint}</span>
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileChange}
        className="hidden"
        multiple
      />
    </div>
  );
};

export default AttachmentPicker;
