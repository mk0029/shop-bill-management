"use client";

import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/notification-store";

export default function TestNotificationButton() {
  const { user, isSignedIn } = useUser();
  const add = useNotificationStore((s) => s.add);
  const [loading, setLoading] = useState(false);

  const sendTest = useCallback(async () => {
    if (!isSignedIn || !user?.id) {
      toast.error("Sign in to send a test notification");
      return;
    }
    setLoading(true);
    try {
      const title = "Test notification";
      const body = `Hello ${user.firstName || user.username || "there"}! This is a test.`;

      // Fire push to this user's registered FCM tokens
      await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          userIds: [user.id],
          data: { test: "1" },
          sound: "default",
        }),
      });

      // Also add an in-app notification so the toast appears immediately
      add({
        type: "system",
        title,
        body,
        meta: { test: true },
      });
      toast.success("Test notification sent");
    } catch {
      toast.error("Failed to send test notification");
    } finally {
      setLoading(false);
    }
  }, [add, isSignedIn, user]);

  if (!isSignedIn) return null;

  return (
    <button
      type="button"
      onClick={sendTest}
      disabled={loading}
      className="fixed z-50 bottom-4 left-4 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm px-3 py-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 disabled:opacity-60"
      title="Send a test notification to your devices"
    >
      {loading ? "Sending..." : "Test Notification"}
    </button>
  );
}
