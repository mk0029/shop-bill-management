"use client";

import { useState } from "react";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Clock } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entryId: string;
  currentCreatedAt: string;
  customerName: string;
  amount: number;
  onSaved?: () => void;
}

export function CashbookTimestampEditModal({
  isOpen,
  onClose,
  entryId,
  currentCreatedAt,
  customerName,
  amount,
  onSaved,
}: Props) {
  const initialDate = currentCreatedAt
    ? new Date(currentCreatedAt).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  const [datetime, setDatetime] = useState(initialDate);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!datetime) return;
    setSaving(true);
    try {
      const utc = new Date(datetime).toISOString();
      const res = await fetch(
        `/api/super/cashbook/${encodeURIComponent(entryId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ createdAt: utc }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || "Update failed");
      }
      toast.success("Timestamp updated silently");
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update timestamp");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseGlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Cash Book Timestamp"
      size="sm"
      zIndex={400}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <Clock className="w-5 h-5 text-purple-400 shrink-0" />
          <div className="text-sm text-white/80">
            <span className="text-white/50">Entry: </span>
            {customerName} — ₹{amount.toLocaleString()}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
            Date & Time
          </label>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          <p className="text-[11px] text-white/30 mt-1.5">
            Sets the createdAt timestamp. Entry will appear under this date in
            cash book groups.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            onClick={onClose}
            disabled={saving}
            variant="outline"
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !datetime}
            className="text-xs bg-purple-600 hover:bg-purple-500"
          >
            {saving ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Update Timestamp"
            )}
          </Button>
        </div>
      </div>
    </BaseGlassModal>
  );
}
