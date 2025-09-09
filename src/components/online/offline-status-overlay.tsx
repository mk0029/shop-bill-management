"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useShopStatus } from "@/hooks/use-shop-status";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function OfflineStatusOverlay() {
  const { status, setStatus, isLoading, error } = useShopStatus();
  const [isUpdating, setIsUpdating] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleChange = async (value: "offline" | "online" | "at_shop") => {
    try {
      setIsUpdating(true);
      await setStatus(value);
    } catch (e) {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const show = !isLoading && !isUpdating && status === "offline" && !skipped;

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-[71] w-full max-w-sm mx-auto rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-xl text-center">
        <div className="mb-3">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
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
