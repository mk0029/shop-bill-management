"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { FileText, User, Clock, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotesCardProps {
  bill: any;
}

const ruledLineBg = `repeating-linear-gradient(
  transparent,
  transparent 27px,
  rgba(255,255,255,0.06) 27px,
  rgba(255,255,255,0.06) 28px
)`;

export const NotesCard = memo(function NotesCard({ bill }: NotesCardProps) {
  const notes = bill?.notes || bill?.internalNotes || "";
  const hasNotes = notes.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-700/20 shadow-lg shadow-black/20">
        {/* Paper background */}
        <div
          className={cn(
            "relative min-h-[160px]",
            "bg-gradient-to-br from-amber-50/[0.04] to-amber-100/[0.02]",
          )}
          style={{ backgroundImage: ruledLineBg }}
        >
          {/* Left margin red line */}
          <div className="absolute left-8 sm:left-10 top-0 bottom-0 w-px bg-red-400/20" />

          {/* Header */}
          <div className="relative flex items-center gap-2 px-5 sm:px-6 pt-5 pb-3">
            <FileText className="w-4 h-4 text-amber-300/60" />
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-300/50">
              Notes
            </span>
          </div>

          {/* Content */}
          <div className="relative px-5 sm:px-6 pb-5">
            {hasNotes ? (
              <div className="pl-6 sm:pl-7 space-y-4">
                {notes.split("\n").map((line: string, i: number) => (
                  <p
                    key={i}
                    className="text-sm text-amber-50/80 leading-[28px] whitespace-pre-wrap"
                    style={{ minHeight: "28px" }}
                  >
                    {line || "\u00A0"}
                  </p>
                ))}
              </div>
            ) : (
              <div className="pl-6 sm:pl-7">
                <p
                  className="text-sm text-amber-50/25 italic leading-[28px]"
                  style={{ minHeight: "28px" }}
                >
                  No notes added
                </p>
              </div>
            )}
          </div>

          {/* Meta footer */}
          {(bill?.createdBy || bill?.updatedAt || bill?.attachments?.length > 0) && (
            <div className="relative px-5 sm:px-6 pb-4 flex flex-wrap items-center gap-3 text-[11px] text-amber-300/30 border-t border-amber-700/10 pt-3 ml-12 mr-5 sm:mr-6">
              {bill.createdBy && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{bill.createdBy}</span>
                </div>
              )}
              {bill.updatedAt && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(bill.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {bill.attachments?.length > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  <span>{bill.attachments.length} attachment(s)</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
