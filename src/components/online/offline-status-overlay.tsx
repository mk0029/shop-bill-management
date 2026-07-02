"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useShopStatus } from "@/hooks/use-shop-status";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

export default function OfflineStatusOverlay() {
  const { status, setStatus, isLoading, error } = useShopStatus();
  const [isUpdating, setIsUpdating] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const { user } = useAuthStore();
  const isAdmin = (user as any)?.role === "admin";

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleChange = async (value: "offline" | "online" | "at_shop") => {
    try {
      setIsUpdating(true);
      await setStatus(value);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const show = isAdmin && !isLoading && !isUpdating && status === "offline" && !skipped;

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative z-[71] w-full max-w-sm mx-auto rounded-[22px] border border-white/[0.12] bg-white/[0.08] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.05)_inset,0_1px_0_rgba(255,255,255,0.1)_inset] backdrop-blur-2xl text-center">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[50px] bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-t-[22px]" />
        <div className="mb-3">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
            <WifiOff className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold">You are Offline</h3>
          <p className="text-sm text-gray-400 mt-1">Switch your status to continue.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Button
            variant="default"
            onClick={() => handleChange("online")}
            className="w-full"
          >
            Available
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleChange("at_shop")}
            className="w-full"
          >
            At Shop
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => setSkipped(true)}
          className="w-full mt-3 text-gray-300"
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
