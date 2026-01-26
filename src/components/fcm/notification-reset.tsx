"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function NotificationReset() {
  const resetNotifications = async () => {
    try {
      // 1. Unregister service workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Clear notification permission
      if ("permissions" in navigator) {
        // Try to clear permission (may not work in all browsers)
        const permission = await navigator.permissions.query({
          name: "notifications",
        });
        // Note: Most browsers don't allow programmatic permission reset
      }

      // 3. Clear localStorage
      localStorage.removeItem("device-notifications-paused");
      localStorage.removeItem("fcm-token");

      // 4. Reload page
      toast.success("Notification settings reset! Reloading page...");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast.error("Failed to reset notifications");
      console.error("Reset error:", error);
    }
  };

  return (
    <Card className="bg-yellow-900/20 border-yellow-600/30">
      <CardHeader>
        <CardTitle className="text-yellow-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Notification Reset
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-yellow-200 text-sm">
          If notifications aren't working despite showing "granted", try
          resetting:
        </p>

        <div className="space-y-2 text-xs text-yellow-300">
          <p>• Unregisters all service workers</p>
          <p>• Clears local notification settings</p>
          <p>• Reloads the page</p>
          <p>• You'll need to re-grant permission</p>
        </div>

        <Button
          onClick={resetNotifications}
          variant="outline"
          className="w-full border-yellow-600 text-yellow-400 hover:bg-yellow-600/20"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset Notifications
        </Button>

        <div className="text-xs text-gray-400">
          <strong>Manual steps if reset doesn't work:</strong>
          <br />
          1. Clear browser cache & cookies
          <br />
          2. Restart browser
          <br />
          3. Check OS notification settings
          <br />
          4. Try a different browser
        </div>
      </CardContent>
    </Card>
  );
}
