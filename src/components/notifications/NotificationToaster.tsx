"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  useNotificationStore,
  AppNotification,
} from "@/store/notification-store";
import { buildNotificationHref } from "@/store/notification-store";
import { buildEventHref } from "@/lib/event-navigation";
import { getActiveChatId, markNotificationHandled } from "@/lib/notifications/dedupe";
import { useRouter } from "next/navigation";
import { Bell, MessageCircle, X } from "lucide-react";

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

      const meta = latest.meta || {};
      if (
        meta.silent === true ||
        meta.source === "server-bootstrap" ||
        meta.source === "server-sync"
      ) {
        markToasted(latest.id);
        return;
      }

      const eventType = String(meta.eventType || meta.type || latest.type || "");
      const roomId = String(meta.roomId || "");
      const isActiveChatNotification =
        (latest.type === "chat" || eventType === "shop_chat" || eventType.startsWith("chat.")) &&
        roomId &&
        getActiveChatId() === roomId;
      if (isActiveChatNotification) {
        markNotificationHandled(latest.id);
        markNotificationHandled(meta.messageId);
        markToasted(latest.id);
        return;
      }

      const description = latest.body || "You have a new notification";
      const href = buildNotificationHref(latest);
      const eventHref = buildEventHref(latest);
      const finalHref = eventHref || href;

      const billId =
        latest.meta &&
        typeof (latest.meta as Record<string, unknown>).billId === "string"
          ? ((latest.meta as Record<string, unknown>).billId as string)
          : undefined;

      const openHref =
        finalHref || (billId ? `/admin/billing?open=${billId}` : "");

      toast.custom(
        (toastId) => (
          <div className="pointer-events-auto w-[min(88vw,23rem)] overflow-hidden rounded-[1.15rem] border border-slate-700/80 bg-slate-900/95 text-slate-100 shadow-2xl shadow-black/35 backdrop-blur sm:w-[min(92vw,24rem)] sm:rounded-xl">
            <div className="flex items-start gap-2.5 p-3 sm:gap-3 sm:p-4">
              <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-500/15 text-orange-300 sm:h-9 sm:w-9">
                {latest.type === "chat" ? (
                  <MessageCircle className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-[13px] font-semibold leading-5 sm:text-sm">
                  {latest.title}
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-300 sm:text-sm">
                  {description}
                </div>
              </div>
              {openHref && (
                <button
                  type="button"
                  onClick={() => {
                    toast.dismiss(toastId);
                    router.push(openHref);
                  }}
                  className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-orange-200 sm:px-3 sm:text-sm"
                >
                  Open
                </button>
              )}
              <button
                type="button"
                onClick={() => toast.dismiss(toastId)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-1 w-full overflow-hidden bg-slate-800">
              <div className="h-full w-full origin-left animate-[notification-shrink_5s_linear_forwards] bg-orange-400" />
            </div>
          </div>
        ),
        { duration: 5000 },
      );

      // Mark as toasted so we don't show this again on next renders/reloads
      if (latest.id) markToasted(latest.id);

      // subtle sound
      if (typeof window !== "undefined") playChime();
    }
  }, [items, router, isToasted, markToasted]);
  return null;
}
