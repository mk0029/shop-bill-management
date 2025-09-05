"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { isStandalone } from "@/lib/pwa";
import { useOnline } from "@/hooks/use-online";

const KEY = "pwa_offline_warning_shown";

export default function OfflineWarning() {
  const online = useOnline();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isStandalone()) return; // only when installed
    if (online) return;
    const shown = localStorage.getItem(KEY) === "1";
    if (!shown) {
      setOpen(true);
      localStorage.setItem(KEY, "1");
    }
  }, [online]);

  if (!open) return null;
  return (
    <Modal isOpen={open} onClose={() => setOpen(false)} title="You are offline" size="sm">
      <div className="space-y-3 text-sm text-gray-300">
        <p>No internet connection detected. You can keep working in offline mode.</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Create bills as draft or choose auto-upload when back online.</li>
          <li>Inventory and other changes queued offline will sync automatically.</li>
        </ul>
        <p className="text-xs text-gray-400">This message is shown only once after installation.</p>
      </div>
    </Modal>
  );
}
