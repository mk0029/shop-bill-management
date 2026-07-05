"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { FileText, User, Clock, Paperclip } from "lucide-react";

interface NotesCardProps {
  bill: any;
}

const ROW_HEIGHT = 38;

// Roman numerals (falls back to numbers after 20)
const ROMAN = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
  "XVII",
  "XVIII",
  "XIX",
  "XX",
];

export const NotesCard = memo(function NotesCard({ bill }: NotesCardProps) {
  const notes = bill?.notes || bill?.internalNotes || "";

  const lines =
    notes.trim().length > 0
      ? notes.split("\n")
      : ["No notes have been added yet."];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <div className="overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-950 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-white/20 px-6 py-5">
          <FileText className="h-4 w-4 text-amber-400" />

          <span className="text-sm font-bold uppercase tracking-[0.25em] text-amber-300">
            Notes
          </span>
        </div>

        {/* Notebook */}
        <div className="relative">
          {/* Red Margin */}
          <div className="absolute left-5 translate-x-full top-0 bottom-0 w-[2px] rounded-full bg-white/20 shadow-[0_0_8px_rgba(248,113,113,.25)]" />

          {lines.map((line: string, index: number) => (
            <div
              key={index}
              className="flex border-b border-white/20 last:border-b-0 "
              style={{
                minHeight: ROW_HEIGHT,
              }}
            >
              {/* Numbers */}
              <div
                className="
                  flex
                  w-[58px]
                  shrink-0
                  items-center
                  justify-center
                  text-[11px]
                  font-semibold
                  tracking-wider
                  text-white/35
                  select-none
                  pl-2
                "
              >
                {ROMAN[index] ?? index + 1}
              </div>

              {/* Text */}
              <div className="flex flex-1 items-center px-5 py-2">
                <p
                  className="
                    w-full
                    whitespace-pre-wrap
                    break-words
                    text-[15px]
                    leading-7
                    text-white
                  "
                >
                  {line || "\u00A0"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {(bill?.createdBy ||
          bill?.updatedAt ||
          bill?.attachments?.length > 0) && (
          <div className="flex flex-wrap items-center gap-5 border-t border-white/5 px-6 py-4 text-xs text-white/45">
            {bill.createdBy && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {bill.createdBy}
              </div>
            )}

            {bill.updatedAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {new Date(bill.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}

            {bill.attachments?.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                {bill.attachments.length} attachment(s)
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});
