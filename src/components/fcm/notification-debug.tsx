"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function NotificationDebug() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [swRegistered, setSwRegistered] = useState(false);
  const [fcmSupported, setFcmSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    // Check notification permission
    setPermission(Notification.permission);

    // Check service worker
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration(
        "/firebase-messaging-sw.js",
      );
      setSwRegistered(!!reg);
    }

    // Check FCM support
    try {
      const { isMessagingAvailable } = await import(
        "@/notifications/lib/firebase"
      );
      const supported = await isMessagingAvailable();
      setFcmSupported(supported);
    } catch {
      setFcmSupported(false);
    }
  };

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast.success("Notification permission granted!");
      } else {
        toast.error(`Permission denied: ${result}`);
      }
    } catch (error) {
      toast.error("Failed to request permission");
    }
  };

  const getFCMToken = async () => {
    try {
      const { getFcmToken } = await import("@/notifications/lib/firebase");
      const fcmToken = await getFcmToken();
      setToken(fcmToken);
      if (fcmToken) {
        toast.success("FCM token retrieved!");
      } else {
        toast.error("Failed to get FCM token");
      }
    } catch (error) {
      toast.error("Error getting FCM token");
    }
  };

  const testNotification = async () => {
    if (permission !== "granted") {
      toast.error("Notification permission not granted");
      return;
    }

    toast.info("Use the server test send so the notification is stored, deduped, and dispatched through FCM.");
  };

  useEffect(() => {
    checkStatus();

    // Listen for permission changes
    const handlePermissionChange = () => {
      setPermission(Notification.permission);
    };

    navigator.permissions
      ?.query({ name: "notifications" })
      ?.then((permissionStatus) => {
        permissionStatus.addEventListener("change", handlePermissionChange);
      });

    return () => {
      navigator.permissions
        ?.query({ name: "notifications" })
        ?.then((permissionStatus) => {
          permissionStatus.removeEventListener(
            "change",
            handlePermissionChange,
          );
        });
    };
  }, []);

  const refreshStatus = async () => {
    setIsRefreshing(true);
    await checkStatus();
    await getFCMToken();
    setIsRefreshing(false);
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Debug
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="ml-auto"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Permission:</span>
          <Badge
            className={
              permission === "granted"
                ? "bg-green-600"
                : permission === "denied"
                  ? "bg-red-600"
                  : "bg-yellow-600"
            }
          >
            {permission === "granted" && <Check className="w-3 h-3 mr-1" />}
            {permission === "denied" && <X className="w-3 h-3 mr-1" />}
            {permission === "default" && <BellOff className="w-3 h-3 mr-1" />}
            {permission}
          </Badge>
        </div>

        {/* Service Worker Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Service Worker:</span>
          <Badge className={swRegistered ? "bg-green-600" : "bg-red-600"}>
            {swRegistered ? "Registered" : "Not Registered"}
          </Badge>
        </div>

        {/* FCM Support */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300">FCM Support:</span>
          <Badge className={fcmSupported ? "bg-green-600" : "bg-red-600"}>
            {fcmSupported ? "Supported" : "Not Supported"}
          </Badge>
        </div>

        {/* FCM Token */}
        {token && (
          <div className="space-y-2">
            <span className="text-gray-300">FCM Token:</span>
            <div className="p-2 bg-gray-800 rounded text-xs font-mono break-all">
              {token.substring(0, 100)}...
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {permission !== "granted" && (
            <Button onClick={requestPermission} className="w-full">
              Request Permission
            </Button>
          )}

          <Button onClick={getFCMToken} variant="outline" className="w-full">
            Get FCM Token
          </Button>

          <Button
            onClick={testNotification}
            variant="outline"
            className="w-full"
          >
            Test Local Notification
          </Button>
        </div>

        {/* Troubleshooting Tips */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• If permission is "denied", enable in browser settings</p>
          <p>• Check if notifications are enabled in OS settings</p>
          <p>• Make sure browser is not in "Do Not Disturb" mode</p>
          <p>• Try refreshing the page and re-granting permission</p>
        </div>
      </CardContent>
    </Card>
  );
}
