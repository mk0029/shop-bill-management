"use client";
import { useEffect, useMemo, useState } from "react";
import { sanityClient } from "@/lib/sanity";
import { sanityApiService } from "@/lib/sanity-api-service";
import { Button } from "@/components/ui/button";
import { CheckCircle2, DoorOpen, Power } from "lucide-react";
import { formatDate } from "@/constants/defaults";

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

  // Fetch status when opening
  useEffect(() => {
    if (!open) return;
    let unsub: { unsubscribe: () => void } | undefined;
    (async () => {
      setLoading(true);
      const res = await sanityApiService.online.getOnlineStatus();
      if (res.success) setStatus(res.data);
      setLoading(false);
      // subscribe realtime
      unsub = sanityClient
        .listen('*[_type == "online" && _id == "onlineStatus"]', {}, { includeResult: true })
        .subscribe((ev: any) => {
          const doc = ev?.result as OnlineStatusDoc | undefined;
          if (doc) setStatus(doc);
        });
    })();
    return () => {
      if (unsub && typeof unsub.unsubscribe === "function") unsub.unsubscribe();
    };
  }, [open]);

  // Also fetch and subscribe once on mount so the button reflects current status
  useEffect(() => {
    let unsub: { unsubscribe: () => void } | undefined;
    (async () => {
      const res = await sanityApiService.online.getOnlineStatus();
      if (res.success) setStatus(res.data);
      unsub = sanityClient
        .listen('*[_type == "online" && _id == "onlineStatus"]', {}, { includeResult: true })
        .subscribe((ev: any) => {
          const doc = ev?.result as OnlineStatusDoc | undefined;
          if (doc) setStatus(doc);
        });
    })();
    return () => {
      if (unsub && typeof unsub.unsubscribe === "function") unsub.unsubscribe();
    };
  }, []);

  const state = useMemo(() => {
    const isOnline = !!status?.isOnline;
    const atShop = !!status?.atShop;
    const note: string = status?.note || "";
    const updatedAt: string | undefined = status?.updatedAt || status?._updatedAt;
    return { isOnline, atShop, note, updatedAt };
  }, [status]);

  const buttonConfig = useMemo(() => {
    if (loading) {
      return { label: "Checking...", className: "", icon: null as React.ReactNode };
    }
    if (state.isOnline) {
      if (state.atShop) {
        return {
          label: "Available",
          className: "bg-green-600 hover:bg-green-700 text-white",
          icon: <CheckCircle2 className="w-4 max-sm:hidden h-4 mr-2" />,
        };
      }
      return {
        label: "Available (Not at shop)",
        className: "bg-amber-500 hover:bg-amber-600 text-black",
        icon: <DoorOpen className="w-4 max-sm:hidden h-4 mr-2" />,
      };
    }
    return {
      label: "Offline",
      className: "bg-red-600 hover:bg-red-700 text-white",
      icon: <Power className="w-4 max-sm:hidden h-4 mr-2" />,
    };
  }, [loading, state.isOnline, state.atShop]);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className={buttonConfig.className+' '+'max-sm:text-xs'}
        aria-label={`Current status: ${buttonConfig.label}. Click to check details`}
        title={`Current status: ${buttonConfig.label}`}
      >
        {buttonConfig.icon}
        {buttonConfig.label}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          {/* Modal */}
          <div className="relative z-10 w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Store Status</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {loading ? (
              <div className="text-gray-300">Loading...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-base">
                  {state.isOnline ? (
                    state.atShop ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="text-green-400 font-medium">We are Available (at shop)</span>
                      </>
                    ) : (
                      <>
                        <DoorOpen className="w-5 h-5 text-yellow-500" />
                        <span className="text-yellow-400 font-medium">We are Available (not at shop)</span>
                      </>
                    )
                  ) : (
                    <>
                      <Power className="w-5 h-5 text-red-500" />
                      <span className="text-red-400 font-medium">We are Offline</span>
                    </>
                  )}
                </div>

                {state.note && (
                  <div className="text-sm text-gray-300">
                    Note: <span className="text-gray-200">{state.note}</span>
                  </div>
                )}
               {state.updatedAt && (
  <div className="text-xs text-white">
    Updated: {formatDate(new Date(state.updatedAt))}
  </div>
)}
              </div>
            )}
           
          </div>
        </div>
      )}
    </>
  );
}
