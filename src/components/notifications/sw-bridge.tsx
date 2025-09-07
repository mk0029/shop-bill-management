"use client";

import { useEffect } from "react";
import { useNotificationStore, type AppNotification } from "@/store/notification-store";

// Listens to the Service Worker BroadcastChannel and forwards
// incoming notifications into the in-app notification store.
export default function SWNotificationBridge() {
  const add = useNotificationStore((s) => s.add);

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("app-notifications");
      bc.onmessage = (ev: MessageEvent) => {
        try {
          const msg = ev?.data;
          if (!msg || typeof msg !== "object") return;
          if (msg.type === "notification:received" && msg.payload) {
            const p = msg.payload as AppNotification;
            // Forward to local store; id/createdAt will be kept or auto-filled
            add({
              type: p.type,
              title: p.title,
              body: p.body,
              meta: p.meta,
              id: p.id,
              createdAt: p.createdAt,
            });
          }
        } catch {}
      };
    } catch {
      // BroadcastChannel not supported; nothing to do.
    }
    return () => {
      try {
        if (bc) bc.close();
      } catch {}
    };
  }, [add]);

  return null;
}
