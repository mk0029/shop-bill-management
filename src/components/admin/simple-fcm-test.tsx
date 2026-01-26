"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bug } from "lucide-react";
import { toast } from "sonner";

export function SimpleFcmTest() {
  const [isLoading, setIsLoading] = useState(false);

  const testSimpleFCM = async () => {
    setIsLoading(true);
    try {
      // Send a very simple FCM notification with explicit structure
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🔔 Simple Test",
          body: "This is a simple test notification",
          audience: "all",
          data: {
            simple: "true",
            type: "test",
            timestamp: new Date().toISOString(),
          },
          // Explicit notification structure for FCM
          notification: {
            title: "🔔 Simple Test",
            body: "This is a simple test notification",
            icon: "/ic-notification.svg",
            click_action: "/",
          },
        }),
      });

      const result = await response.json();
      console.log("🔔 Simple FCM Test Result:", result);

      if (result.success && result.sent > 0) {
        toast.success(`✅ Simple test: ${result.sent} sent`);
      } else {
        toast.error(`❌ Simple test failed: ${result.failed || 0} failed`);
      }
    } catch (error) {
      console.error("❌ Simple test error:", error);
      toast.error("Simple test failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-red-900/20 border-red-600/30">
      <CardHeader>
        <CardTitle className="text-red-400 flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Simple FCM Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-red-200">
          <p>
            Test with explicit FCM notification structure to debug the issue.
          </p>
        </div>

        <Button
          onClick={testSimpleFCM}
          disabled={isLoading}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          <Send
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-pulse" : ""}`}
          />
          {isLoading ? "Testing Simple..." : "Send Simple Test"}
        </Button>

        <div className="text-xs text-gray-400">
          <p>• Check service worker console for 🔔 logs</p>
          <p>• Look for "SW: onBackgroundMessage received"</p>
          <p>• Look for "SW: showNotification called"</p>
          <p>• Should show proper notification content</p>
        </div>
      </CardContent>
    </Card>
  );
}
