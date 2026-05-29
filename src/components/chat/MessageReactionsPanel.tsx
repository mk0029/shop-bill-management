"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const QUICK_REACTION_OPTIONS = ["❤️", "😂", "👍", "😮", "😢", "😡"];
const EXTENDED_REACTION_OPTIONS = [
  "😀", "😃", "😄", "😁", "😆", "🤣", "🙂", "😉", "😊", "😍", "😘", "🤔",
  "😐", "😑", "🙄", "😴", "😷", "🤒", "🤕", "🤯", "😎", "🥳", "😕", "😟",
  "🙁", "😮", "😯", "😲", "😭", "😤", "😡", "👋", "🙏", "👏", "💪", "❤️",
  "💔", "✨", "🔥", "✅", "❌", "⚠️", "🎉", "🎊", "🎁", "🏆",
];

type Props = {
  open: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
};

export default function MessageReactionsPanel({ open, onClose, onReact }: Props) {
  const [query, setQuery] = useState("");
  const all = useMemo(
    () => Array.from(new Set([...QUICK_REACTION_OPTIONS, ...EXTENDED_REACTION_OPTIONS])),
    [],
  );
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return all;
    return all.filter((emoji) => emoji.includes(q));
  }, [all, query]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-[280px] rounded-2xl border border-slate-700/70 bg-slate-900/95 p-2 shadow-2xl backdrop-blur"
          >
            <div className="mb-2 flex items-center gap-1">
              {QUICK_REACTION_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded-lg px-2 py-1 text-lg hover:bg-slate-800"
                  onClick={() => {
                    onReact(emoji);
                    onClose();
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find emoji..."
              className="mb-2 h-8 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 text-xs text-slate-100 outline-none"
            />
            <div className="max-h-44 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1">
                {filtered.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="rounded-lg px-1 py-1 text-lg hover:bg-slate-800"
                    onClick={() => {
                      onReact(emoji);
                      onClose();
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

