"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function FcmTestSend() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const testFCMSend = async () => {
    setIsLoading(true);
    try {
      // Test sending to all customers
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🧪 FCM Test Notification",
          body: "This is a test to verify FCM is working correctly",
          audience: "all",
          data: {
            test: "true",
            timestamp: new Date().toISOString(),
            type: "fcm-test",
          },
        }),
      });

      const result = await response.json();
      console.log("🧪 FCM Test Result:", result);
      setTestResult(result);

      if (result.success && result.sent > 0) {
        toast.success(
          `✅ FCM Test: ${result.sent} sent, ${result.failed || 0} failed`,
        );
      } else if (result.partial && result.sent > 0) {
        toast.warning(
          `⚠️ FCM Test: ${result.sent} sent, ${result.failed} failed`,
        );
      } else {
        toast.error(`❌ FCM Test: ${result.failed || 0} failed, 0 sent`);
      }
    } catch (error) {
      console.error("❌ FCM Test Error:", error);
      toast.error("FCM test failed");
    } finally {
      setIsLoading(false);
    }
  };

  const testSpecificUser = async () => {
    // Test sending to a specific user (you can change this ID)
    const testUserId = "083750cf-3dba-4d0b-9f15-fb814e10c57c"; // Mohit Kumar from your debug

    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🎯 Targeted FCM Test",
          body: `Targeted test for user ${testUserId}`,
          userIds: [testUserId],
          data: {
            test: "true",
            targeted: "true",
            userId: testUserId,
          },
        }),
      });

      const result = await response.json();
      console.log("🎯 Targeted FCM Test Result:", result);

      if (result.success && result.sent > 0) {
        toast.success(`✅ Targeted test: ${result.sent} sent`);
      } else {
        toast.error(`❌ Targeted test failed: ${result.failed || 0} failed`);
      }
    } catch (error) {
      console.error("❌ Targeted test error:", error);
      toast.error("Targeted test failed");
    }
  };

  return (
    <Card className="bg-purple-900/20 border-purple-600/30">
      <CardHeader>
        <CardTitle className="text-purple-400 flex items-center gap-2">
          <Send className="w-5 h-5" />
          FCM Test Send
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-purple-200">
          <p>
            Test FCM notifications to verify the system is working correctly.
          </p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={testFCMSend}
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Send
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-pulse" : ""}`}
            />
            {isLoading ? "Testing FCM..." : "Test Send to All"}
          </Button>

          <Button
            onClick={testSpecificUser}
            variant="outline"
            className="w-full border-purple-600 text-purple-400 hover:bg-purple-600/20"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Test Targeted User
          </Button>
        </div>

        {testResult && (
          <div className="space-y-2 text-xs">
            <div className="text-purple-200 font-medium">Test Results:</div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                ) : testResult.partial ? (
                  <AlertCircle className="w-3 h-3 text-yellow-400" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-400" />
                )}
                <span>
                  Overall:{" "}
                  {testResult.success
                    ? "Success"
                    : testResult.partial
                      ? "Partial"
                      : "Failed"}
                </span>
              </div>
              <div>Sent: {testResult.sent || 0}</div>
              <div>Failed: {testResult.failed || 0}</div>
              {testResult.errors && (
                <div className="mt-2 text-red-400">
                  Errors: {testResult.errors.length}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-400">
          <p>• Test to all customers first</p>
          <p>• Then test targeted user</p>
          <p>• Check customer console for 🔔 logs</p>
        </div>
      </CardContent>
    </Card>
  );
}
