"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  getFcmToken,
  isMessagingAvailable,
} from "@/notifications/lib/firebase";
import { useAuthStore } from "@/store/auth-store";

export default function TokenGeneratorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { user } = useAuthStore();

  const generateToken = async () => {
    if (!user) {
      toast.error("Please login first");
      return;
    }

    setIsLoading(true);
    try {
      // Check if messaging is available
      const available = await isMessagingAvailable();
      if (!available) {
        toast.error("Firebase messaging is not supported in this browser");
        return;
      }

      // Request notification permission
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notification permission denied");
          return;
        }
      }

      // Generate FCM token
      const fcmToken = await getFcmToken();
      if (!fcmToken) {
        toast.error("Failed to generate FCM token");
        return;
      }

      setToken(fcmToken);

      // Save token to user profile
      const response = await fetch("/api/save-fcm-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || user?._id || "",
        },
        body: JSON.stringify({ token: fcmToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save token");
      }

      toast.success("FCM token generated and saved successfully!");
    } catch (error) {
      console.error("Token generation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate token",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testToken = async () => {
    if (!token) {
      toast.error("No token to test");
      return;
    }

    try {
      const response = await fetch("/api/test-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (result.status === 200) {
        toast.success("Token is valid and working!");
      } else {
        toast.error(
          `Token test failed: ${result.response?.error?.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Token test error:", error);
      toast.error("Failed to test token");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">FCM Token Generator</h1>
        <p className="text-muted-foreground">
          Generate a fresh FCM token for testing notifications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate New Token</CardTitle>
          <CardDescription>
            Create a fresh FCM token and save it to your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={generateToken}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Generating..." : "Generate FCM Token"}
          </Button>

          {token && (
            <div className="space-y-2">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-xs font-mono break-all">{token}</p>
              </div>
              <Button onClick={testToken} variant="outline" className="w-full">
                Test Token
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Make sure you're logged in before generating a token</p>
          <p>• Allow browser notifications when prompted</p>
          <p>• The token will be automatically saved to your profile</p>
          <p>• Use the test button to verify the token works</p>
          <p>
            • After generating, try sending notifications from the test page
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
