"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  useNotificationStore,
  AppNotification,
} from "@/store/notification-store";
import { buildNotificationHref } from "@/store/notification-store";
import { buildEventHref } from "@/lib/event-navigation";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/store/chat-store";

function playChime() {
  try {
    const w = window as unknown as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = window.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.45);
  } catch {
    // ignore
  }
}

export default function NotificationToaster() {
  const items = useNotificationStore((s) => s.items);
  const markToasted = useNotificationStore((s) => s.markToasted);
  const isToasted = useNotificationStore((s) => s.isToasted);
  const lastIdRef = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!items.length) return;
    const latest: AppNotification = items[0];
    if (latest?.id && lastIdRef.current !== latest.id) {
      // Prevent repeated toasts across reloads: check persisted map
      if (isToasted(latest.id)) {
        lastIdRef.current = latest.id; // keep ref synced to avoid loops
        return;
      }
      lastIdRef.current = latest.id;

      // Suppress: if this notification targets the SAME open chat room, don't toast
      try {
        const hrefMaybe = buildNotificationHref(latest);
        const eventHrefMaybe = buildEventHref(latest);
        const finalHrefMaybe = eventHrefMaybe || hrefMaybe;
        const loc = typeof window !== "undefined" ? window.location : null;
        const activeRoomId = (() => {
          try {
            return useChatStore.getState().activeRoomId;
          } catch {
            return null;
          }
        })();
        if (finalHrefMaybe && loc) {
          const t = new URL(finalHrefMaybe, loc.origin);
          const here = new URL(loc.href);
          const tRoom = t.searchParams.get("roomId");
          const hereRoom = here.searchParams.get("roomId");
          const isChatPath =
            t.pathname.startsWith("/admin/chats") ||
            t.pathname.startsWith("/customer/chat");
          const samePath = t.pathname === here.pathname;
          if (isChatPath) {
            if (
              (samePath && tRoom && hereRoom && tRoom === hereRoom) ||
              (activeRoomId &&
                tRoom &&
                activeRoomId === tRoom &&
                here.pathname.startsWith("/admin/chats"))
            ) {
              return; // suppress toast for same chat room
            }
          }
        }
      } catch {}

      const description = latest.body || "You have a new notification";
      const href = buildNotificationHref(latest);
      const eventHref = buildEventHref(latest);
      const finalHref = eventHref || href;

      const billId =
        latest.meta &&
        typeof (latest.meta as Record<string, unknown>).billId === "string"
          ? ((latest.meta as Record<string, unknown>).billId as string)
          : undefined;

      toast(latest.title, {
        description,
        duration: 6000,
        action: finalHref
          ? { label: "View", onClick: () => router.push(finalHref) }
          : billId
            ? {
                label: "View bill",
                onClick: () => router.push(`/admin/billing?open=${billId}`),
              }
            : undefined,
      });

      // Mark as toasted so we don't show this again on next renders/reloads
      if (latest.id) markToasted(latest.id);

      // subtle sound
      if (typeof window !== "undefined") playChime();
    }
  }, [items, router, isToasted, markToasted]);
  return null;
}
