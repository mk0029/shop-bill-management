"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, DoorOpen, MapPin, Power, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/constants/defaults";
import { sanityClient } from "@/lib/sanity";
import { sanityApiService } from "@/lib/sanity-api-service";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import {
  defaultShopStatusMessages,
  type ShopStatusKey,
  type ShopStatusMessages,
} from "@/lib/shop-status-message-defaults";

interface OnlineStatusDoc {
  _id: string;
  _type: "online";
  isOnline?: boolean;
  atShop?: boolean;
  updatedAt?: string;
  _updatedAt?: string;
  note?: string;
}

export default function OnlineStatusCustomerButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<OnlineStatusDoc | null>(null);
  const [messages, setMessages] = useState<ShopStatusMessages>(defaultShopStatusMessages);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let unsub: { unsubscribe: () => void } | undefined;
    let active = true;

    async function load() {
      const res = await sanityApiService.online.getOnlineStatus();
      if (active && res.success) setStatus(res.data);
      unsub = sanityClient
        .listen('*[_type == "online" && _id == "onlineStatus"]', {}, { includeResult: true })
        .subscribe((ev: any) => {
          const doc = ev?.result as OnlineStatusDoc | undefined;
          if (doc) setStatus(doc);
        });
    }

    void load();
    return () => {
      active = false;
      unsub?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;

    async function refresh() {
      setLoading(true);
      try {
        const [statusRes, messagesRes] = await Promise.all([
          sanityApiService.online.getOnlineStatus(),
          fetch("/api/shop-status-messages", { cache: "no-store" }),
        ]);
        if (active && statusRes.success) setStatus(statusRes.data);
        const json = await messagesRes.json().catch(() => ({}));
        if (active && messagesRes.ok && json?.success && json.data) {
          setMessages(json.data);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void refresh();
    return () => {
      active = false;
    };
  }, [open]);

  const state = useMemo(() => {
    const isOnline = !!status?.isOnline;
    const atShop = !!status?.atShop;
    const note = status?.note || "";
    const updatedAt = status?.updatedAt || status?._updatedAt;
    return { isOnline, atShop, note, updatedAt };
  }, [status]);

  const statusKey: ShopStatusKey = state.isOnline ? (state.atShop ? "at_shop" : "online") : "offline";
  const statusMessage = messages[statusKey] || defaultShopStatusMessages[statusKey];

  const statusConfig = useMemo(() => {
    if (statusKey === "at_shop") {
      return {
        label: "At Shop",
        eyebrow: "Open for visits",
        icon: <MapPin className="h-5 w-5" />,
        buttonClass: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
        dotClass: "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.7)]",
        panelClass: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
      };
    }
    if (statusKey === "online") {
      return {
        label: "Available",
        eyebrow: "Online support",
        icon: <DoorOpen className="h-5 w-5" />,
        buttonClass: "border-amber-400/35 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
        dotClass: "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.65)]",
        panelClass: "border-amber-400/25 bg-amber-500/10 text-amber-100",
      };
    }
    return {
      label: "Offline",
      eyebrow: "Currently unavailable",
      icon: <Power className="h-5 w-5" />,
      buttonClass: "border-rose-400/35 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
      dotClass: "bg-rose-300 shadow-[0_0_14px_rgba(253,164,175,0.65)]",
      panelClass: "border-rose-400/25 bg-rose-500/10 text-rose-100",
    };
  }, [statusKey]);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className={`${statusConfig.buttonClass} h-10 gap-2 rounded-full border px-3 text-xs font-semibold shadow-sm backdrop-blur transition sm:px-4 sm:text-sm`}
        aria-label={`Current shop status: ${statusConfig.label}. Click to check details`}
        title={`Current shop status: ${statusConfig.label}`}
      >
        <span className={`h-2 w-2 rounded-full ${statusConfig.dotClass}`} />
        <span className="max-w-[9rem] truncate">{loading ? "Checking..." : statusConfig.label}</span>
      </Button>

      <BaseGlassModal isOpen={!!(mounted && open)} onClose={() => setOpen(false)} showCloseButton={false} mobileType="modal" size="md" zIndex={220}>
        {/* Ambient glass highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[60px] bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

        <div className="flex items-start justify-between gap-3 p-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">Store Status</div>
            <h3 className="mt-1 text-xl font-semibold text-white/90">{statusConfig.label}</h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] transition-all text-white/40 hover:text-white/80"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5">
          {loading ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-white/60">
              Checking the latest store status...
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 ${statusConfig.panelClass}`}>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
                    {statusConfig.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] opacity-75">
                      {statusConfig.eyebrow}
                    </div>
                    <div className="mt-1 text-base font-semibold">{statusMessage.title}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/70">{statusMessage.body}</p>
              </div>

              {state.note && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-white/60">
                  <span className="font-medium text-white/80">Note: </span>
                  {state.note}
                </div>
              )}

              {state.updatedAt && (
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Clock3 className="h-3.5 w-3.5" />
                  Updated {formatDate(new Date(state.updatedAt))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="bg-blue-600/80 text-white hover:bg-blue-500/90 backdrop-blur-xl border border-blue-400/20"
                >
                  Got it
                </Button>
              </div>
            </div>
          )}
        </div>
      </BaseGlassModal>
    </>
  );
}
