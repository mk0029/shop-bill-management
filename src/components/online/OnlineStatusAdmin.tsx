"use client";
import { useEffect, useMemo, useState } from "react";
import { sanityClient } from "@/lib/sanity";
import { sanityApiService, onlineApiService as directOnlineApiService } from "@/lib/sanity-api-service";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Slider steps:
// 0 -> Offline (isOnline=false, atShop=false)
// 1 -> Not at shop (isOnline=true, atShop=false)
// 2 -> Online (isOnline=true, atShop=true)

interface OnlineStatusDoc {
  _id: string;
  _type: "online";
  isOnline?: boolean;
  atShop?: boolean;
  updatedAt?: string;
  _updatedAt?: string;
  note?: string;
}

function mapStepToState(step: number) {
  if (step <= 0) return { isOnline: false, atShop: false };
  if (step === 1) return { isOnline: true, atShop: false };
  return { isOnline: true, atShop: true };
}

function mapStateToStep({ isOnline, atShop }: { isOnline?: boolean; atShop?: boolean }) {
  if (!isOnline) return 0;
  if (isOnline && !atShop) return 1;
  return 2;
}

export default function OnlineStatusAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [note, setNote] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [typingNote, setTypingNote] = useState(false);

  // Fetch once and ensure singleton exists
  useEffect(() => {
    (async () => {
      setLoading(true);
      const onlineSvc = (sanityApiService as any)?.online || directOnlineApiService;
      const init = await onlineSvc.createOrInitOnlineStatus();
      if (init.success && init.data) {
        const s = init.data as OnlineStatusDoc;
        setStep(mapStateToStep({ isOnline: s.isOnline, atShop: s.atShop }));
        setNote(s.note || "");
        setUpdatedAt(s.updatedAt || s._updatedAt || null);
      }
      setLoading(false);
    })();
  }, []);

  // Listen realtime
  useEffect(() => {
    const sub = sanityClient
      .listen('*[_type == "online" && _id == "onlineStatus"]', {}, { includeResult: true })
      .subscribe((update: unknown) => {
        const doc = (update as any)?.result as OnlineStatusDoc | undefined;
        if (!doc) return;
        setStep(mapStateToStep({ isOnline: doc.isOnline, atShop: doc.atShop }));
        setNote(doc.note || "");
        setUpdatedAt(doc.updatedAt || doc._updatedAt || null);
      });
    return () => sub.unsubscribe();
  }, []);

  const statusText = useMemo(() => {
    if (step === 2) return "We are Available";
    if (step === 1) return "Available (Not at shop)";
    return "We are Offline";
  }, [step]);

  // Auto update when slider changes
  const updateStatus = async (newStep: number, currentNote = note) => {
    setSaving(true);
    const mapped = mapStepToState(newStep);
    const onlineSvc = (sanityApiService as any)?.online || directOnlineApiService;
    const res = await onlineSvc.updateOnlineStatus({
      ...mapped,
      note: currentNote || "",
      updatedAt: new Date().toISOString(),
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Failed to update status");
    }
  };

  const onStepChange = async (value: number) => {
    setStep(value);
    await updateStatus(value);
  };

  // Debounced note autosave
  useEffect(() => {
    if (!typingNote) return;
    const t = setTimeout(async () => {
      setTypingNote(false);
      await updateStatus(step, note);
    }, 600);
    return () => clearTimeout(t);
  }, [note]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Availability</h2>
        <p className="text-sm text-gray-400">Realtime availability customers can check.</p>
      </div>

      <div className="rounded-lg border border-gray-800 p-4 bg-gray-900 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">{statusText}</span>
          {updatedAt && (
            <span className="text-xs text-gray-400">Updated: {new Date(updatedAt).toLocaleString()}</span>
          )}
        </div>

        {/* 3-step slider */}
        <div className="px-1 py-4">
          <div className="relative">
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={step}
              onChange={(e) => onStepChange(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2 items-center">
              <span>Offline</span>
              <div className="flex items-center gap-2">
                <Button
                  variant={step >= 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => onStepChange(1)}
                >
                  Available
                </Button>
                <Button
                  variant={step === 2 ? "default" : "outline"}
                  size="sm"
                  onClick={() => onStepChange(2)}
                >
                  At shop
                </Button>
              </div>
              <span>Available</span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setTypingNote(true);
            }}
            placeholder="Lunch break / Closed today"
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {saving && (
          <div className="flex justify-end text-xs text-gray-400">Updating...</div>
        )}
      </div>
    </div>
  );
}
