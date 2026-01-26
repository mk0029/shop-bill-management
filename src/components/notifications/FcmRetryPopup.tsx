"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { hasPendingToken, retryPendingFcmToken } from "@/lib/fcm";
import { toast } from "sonner";
import { X, RefreshCw } from "lucide-react";

/**
 * FcmRetryPopup: Shows only when notifications are enabled AND a pending token exists.
 * Allows user to retry registering the token to the backend.
 */
export default function FcmRetryPopup() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user?.id) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      setShow(false);
      return;
    }
    // Show popup only if there is a pending token
    if (hasPendingToken(user.id)) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [hydrated, isAuthenticated, user?.id]);

  const handleRetry = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const result = await retryPendingFcmToken(user.id);
      if (result.success) {
        toast.success("Notification setup completed!");
        setShow(false);
      } else {
        toast.error(`Failed to complete setup: ${result.error || "Unknown error"}`);
      }
    } catch (e) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="text-white font-medium text-sm">Finish notification setup</h4>
          <p className="text-gray-400 text-xs mt-1">
            Your device has a notification token ready. Tap Retry to save it to your account.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={handleRetry}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Retry
          </>
        )}
      </button>
    </div>
  );
}
