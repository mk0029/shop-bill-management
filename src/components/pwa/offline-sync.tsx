"use client";
import { useEffect } from "react";
import { flushQueue } from "@/lib/offline-queue";
import { useOnline } from "@/hooks/use-online";
import { toast } from "sonner";

export default function OfflineSync() {
  const online = useOnline();

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    (async () => {
      try {
        toast.message("Syncing offline items...", { description: "Uploading queued changes" });
        await flushQueue();
        if (!cancelled) toast.success("Sync complete");
      } catch (e) {
        if (!cancelled) toast.error("Sync failed. Will retry when online again.");
      }
    })();
    return () => { cancelled = true; };
  }, [online]);

  return null;
}
