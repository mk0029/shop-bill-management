import React from "react";

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function NotesSection({ notes, onNotesChange }: NotesSectionProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Notes
      </label>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 resize-none"
        rows={3}
        placeholder="Add any notes about the service..."
      />
    </div>
  );
}

export default NotesSection;
