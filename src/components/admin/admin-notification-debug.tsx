"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Target } from "lucide-react";
import { toast } from "sonner";
import { trackFcm } from "@/lib/notification-tracker";

export function AdminNotificationDebug() {
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const debugNotificationSending = async () => {
    setIsLoading(true);
    const startMs = Date.now();
    try {
      // Get all user tokens for debugging
      const response = await fetch("/api/notifications/cleanup-tokens");
      const data = await response.json();

      setDebugInfo(data);

      // Test sending to your specific customer token
      const testResponse = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🔍 Debug Test",
          body: "This is a debug notification to test FCM delivery",
          audience: "all", // Try sending to all first
          data: { debug: "true", timestamp: Date.now().toString() },
        }),
      });

      const result = await testResponse.json();
      trackFcm({ eventType: "fcm-debug-all", ok: result.success, durationMs: Date.now() - startMs, target: "all", meta: { sent: result.sent, failed: result.failed } });

      if (result.success) {
        toast.success(
          `Debug sent: ${result.sent} delivered, ${result.failed} failed`,
        );
      } else {
        toast.error(`Debug failed: ${result.failed} failed`);
      }
    } catch (error) {
      console.error("❌ Debug error:", error);
      toast.error("Debug failed");
    } finally {
      setIsLoading(false);
    }
  };

  const sendToSpecificUser = async () => {
    if (!debugInfo?.users?.length) {
      toast.error("No users found. Run debug first.");
      return;
    }

    // Find your customer user (you might need to identify by name or ID)
    const customerUser = debugInfo.users.find(
      (u: any) => u.name?.includes("customer") || u._id?.includes("customer"),
    );

    if (!customerUser) {
      toast.error("Customer user not found");
      return;
    }

    const startMs = Date.now();
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🎯 Targeted Test",
          body: `Targeted to ${customerUser.name || customerUser._id}`,
          userIds: [customerUser._id],
          data: { targeted: "true", userId: customerUser._id },
        }),
      });

      const result = await response.json();
      trackFcm({ eventType: "fcm-debug-targeted", ok: result.success, durationMs: Date.now() - startMs, target: customerUser._id?.slice(0, 8) + "...", meta: { sent: result.sent, failed: result.failed, userId: customerUser._id } });

      if (result.success) {
        toast.success(`Targeted sent: ${result.sent} delivered`);
      } else {
        toast.error(`Targeted failed: ${result.failed} failed`);

      }
    } catch (error) {
      console.error("❌ Targeted error:", error);
      toast.error("Targeted failed");
    }
  };

  return (
    <Card className="bg-blue-900/20 border-blue-600/30">
      <CardHeader>
        <CardTitle className="text-blue-400 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Admin Notification Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-blue-200 text-sm">
          Debug FCM notification sending and token targeting.
        </p>

        <div className="space-y-2">
          <Button
            onClick={debugNotificationSending}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {isLoading ? "Debugging..." : "Debug Send to All"}
          </Button>

          {debugInfo && (
            <Button
              onClick={sendToSpecificUser}
              variant="outline"
              className="w-full border-blue-600 text-blue-400 hover:bg-blue-600/20"
            >
              <Users className="w-4 h-4 mr-2" />
              Send to Customer
            </Button>
          )}
        </div>

        {debugInfo && (
          <div className="space-y-2 text-xs">
            <div className="text-blue-200 font-medium">Debug Info:</div>
            <div className="bg-gray-800 p-2 rounded">
              <div>Total Users: {debugInfo.stats?.totalUsers || 0}</div>
              <div>Total Tokens: {debugInfo.stats?.totalTokens || 0}</div>
              <div>
                Users with Tokens: {debugInfo.stats?.usersWithTokens || 0}
              </div>
            </div>

            {debugInfo.users?.length > 0 && (
              <div className="bg-gray-800 p-2 rounded max-h-32 overflow-y-auto">
                <div className="font-medium mb-1">Users:</div>
                {debugInfo.users.map((user: any, i: number) => (
                  <div key={i} className="text-gray-300">
                    {user.name || user._id} ({user.tokenCount} tokens)
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-400">
          <p>• Check admin console for detailed logs</p>
          <p>• Look for 🔍 Debug logs</p>
          <p>• Verify customer has registered tokens</p>
        </div>
      </CardContent>
    </Card>
  );
}
