"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function NotesSection({
  notes,
  onNotesChange,
  disabled = false,
  placeholder = "Add any special instructions or notes...",
}: NotesSectionProps) {
  return (
    <div>
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
        Notes
      </h3>
      <Textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className="resize-none"
      />
    </div>
  );
}
