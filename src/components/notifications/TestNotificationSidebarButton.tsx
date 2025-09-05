"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/notification-store";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export default function TestNotificationSidebarButton({ className = "" }: { className?: string }) {
  const { user, isAuthenticated } = useAuthStore();
  const add = useNotificationStore((s) => s.add);
  const [loading, setLoading] = useState(false);

  const sendTest = useCallback(async () => {
    const uid = (user as any)?.id || (user as any)?._id;
    if (!isAuthenticated || !uid) {
      toast.error("Sign in to send a test notification");
      return;
    }
    setLoading(true);
    try {
      const title = "Test notification";
      const body = `Hello ${(user as any)?.name || (user as any)?.email || "there"}! This is a test.`;

      await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          userIds: [uid],
          data: { test: "1" },
          sound: "default",
        }),
      });

      add({ type: "system", title, body, meta: { test: true } });
      toast.success("Test notification sent");
    } catch {
      toast.error("Failed to send test notification");
    } finally {
      setLoading(false);
    }
  }, [add, isAuthenticated, user]);

  return (
    <Button
      onClick={sendTest}
      disabled={loading}
      className={`w-full ${className}`}
      variant="default"
      title={isAuthenticated ? "Send a test notification to your devices" : "Sign in to enable test notifications (clicking will prompt)"}
    >
      <Bell className="w-4 h-4 mr-2" />
      {loading ? "Sending..." : "Test Notifications"}
    </Button>
  );
}
