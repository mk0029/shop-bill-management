"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Smartphone, Copy, Check, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  getFcmToken,
  isMessagingAvailable,
} from "@/notifications/lib/firebase";
import { registerFcmToken } from "@/lib/fcm";

export function FcmTokenButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasRegisteredToken, setHasRegisteredToken] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  // Check if user already has a registered token on component mount
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      checkExistingToken();
    }
  }, [isAuthenticated, user?.id]);

  const checkExistingToken = async () => {
    try {
      // Get current FCM token
      const currentToken = await getFcmToken();
      if (currentToken) {
        setToken(currentToken);
        setHasRegisteredToken(true);
      }
    } catch (error) {
      // Token not available, that's okay
      setHasRegisteredToken(false);
    }
  };

  const handleGetToken = async () => {
    if (!isAuthenticated || !user?.id) {
      toast.error("Please login first");
      return;
    }

    // If already has a token, just show it
    if (hasRegisteredToken && token) {
      toast.info("FCM token already registered!");
      return;
    }

    setIsLoading(true);
    try {
      // Check if FCM is supported
      const supported = await isMessagingAvailable();
      if (!supported) {
        toast.error(
          "Firebase Cloud Messaging is not supported in this browser",
        );
        return;
      }

      // Get FCM token
      const fcmToken = await getFcmToken();
      if (!fcmToken) {
        toast.error("Failed to get FCM token. Check browser permissions.");
        return;
      }

      // Register token with backend
      const result = await registerFcmToken({
        userId: user.id,
        token: fcmToken,
      });
      if (result.success) {
        setToken(fcmToken);
        setHasRegisteredToken(true);
        toast.success("FCM token registered successfully!");
      } else {
        toast.error(result.error || "Failed to register FCM token");
      }
    } catch (error) {
      console.error("FCM token error:", error);
      toast.error("Failed to get FCM token");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceRefresh = async () => {
    if (!isAuthenticated || !user?.id) {
      toast.error("Please login first");
      return;
    }

    setIsLoading(true);
    try {
      // Force get new token
      const fcmToken = await getFcmToken();
      if (!fcmToken) {
        toast.error("Failed to get FCM token. Check browser permissions.");
        return;
      }

      // Register token with backend
      const result = await registerFcmToken({
        userId: user.id,
        token: fcmToken,
      });
      if (result.success) {
        setToken(fcmToken);
        setHasRegisteredToken(true);
        toast.success("FCM token refreshed successfully!");
      } else {
        toast.error(result.error || "Failed to refresh FCM token");
      }
    } catch (error) {
      console.error("FCM token refresh error:", error);
      toast.error("Failed to refresh FCM token");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!token) return;

    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("FCM token copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy token");
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleGetToken}
        disabled={isLoading || !isAuthenticated}
        variant="outline"
        size="sm"
        className="w-full justify-start"
      >
        <Smartphone className="w-4 h-4 mr-2" />
        {isLoading
          ? "Getting Token..."
          : hasRegisteredToken
            ? "FCM Token Registered"
            : "Get FCM Token"}
      </Button>

      {hasRegisteredToken && (
        <Button
          onClick={handleForceRefresh}
          disabled={isLoading}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-2" />
          Refresh Token
        </Button>
      )}

      {token && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-green-400">
            <Check className="w-3 h-3" />
            <span>Token registered and active</span>
          </div>
          <div className="p-2 bg-gray-800 rounded text-xs font-mono break-all max-w-xs">
            {token.substring(0, 50)}...
          </div>
          <Button
            onClick={handleCopyToken}
            variant="ghost"
            size="sm"
            className="w-full justify-start"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Token
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
