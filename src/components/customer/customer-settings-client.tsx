"use client";

import NotificationSoundToggle from "@/components/notifications/notification-sound-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ensureFcmToken,
  registerFcmToken,
  setDeviceNotificationsPaused,
  getDeviceNotificationsPaused,
} from "@/lib/fcm";
import { toast } from "sonner";
import React from "react";
import { FcmTokenButton } from "../fcm/fcm-token-button";
import { NotificationDebug } from "../fcm/notification-debug";
import { NotificationReset } from "../fcm/notification-reset";
import { initForegroundNotifications } from "@/notifications/init-foreground";
import { CustomerAccountDebug } from "../customer/customer-account-debug";

export default function CustomerSettingsClient({
  userId,
}: {
  userId: string | null;
}) {
  const [perm, setPerm] = React.useState<
    NotificationPermission | "unsupported"
  >("default");
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [paused, setPaused] = React.useState<boolean>(false);

  React.useEffect(() => {
    try {
      if (typeof Notification === "undefined") setPerm("unsupported");
      else setPerm(Notification.permission);
    } catch {
      setPerm("unsupported");
    }
    try {
      setPaused(getDeviceNotificationsPaused());
    } catch {}

    // Initialize foreground notifications
    initForegroundNotifications();
  }, []);

  const onEnableNotifications = async () => {
    setBusy(true);
    setStatus("");
    try {
      if (typeof Notification === "undefined") {
        setStatus("Notifications are not supported on this device/browser.");
        return;
      }
      if (Notification.permission !== "granted") {
        try {
          await Notification.requestPermission();
        } catch {}
      }
      setPerm(Notification.permission);
      if (Notification.permission === "granted") {
        const ensured = await ensureFcmToken({ userId });
        if (
          ensured &&
          "success" in ensured &&
          ensured.success &&
          "created" in ensured &&
          ensured.created
        ) {
          toast.success("Your Notifications are enabled now");
        }
        if (userId) {
          try {
            await registerFcmToken({ userId });
          } catch {}
          await setDeviceNotificationsPaused(false);
          setPaused(false);
          setStatus(
            "Notifications enabled for this device and token registered.",
          );
        } else {
          await setDeviceNotificationsPaused(false);
          setPaused(false);
          setStatus(
            "Notifications enabled for this device. Please log in to register your token.",
          );
        }
      } else if (Notification.permission === "denied") {
        setStatus("Notifications are blocked in your browser settings.");
      } else {
        setStatus("Permission request dismissed.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onDisableNotifications = async () => {
    setBusy(true);
    setStatus("");
    try {
      await setDeviceNotificationsPaused(true);
      setPaused(true);
      setStatus("Notifications paused on this device.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
        Settings
      </h1>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-300">
          <p className="text-gray-400">
            Control push notifications and foreground sound.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-md bg-gray-800 p-3">
            <div className="space-y-0.5">
              <div className="text-gray-200 font-medium">Permission</div>
              <div className="text-gray-400">
                Your current browser permission status
              </div>
            </div>
            <Badge
              className={
                perm === "granted"
                  ? "bg-emerald-600 border-transparent"
                  : perm === "denied"
                    ? "bg-rose-600 border-transparent"
                    : perm === "unsupported"
                      ? "bg-gray-600 border-transparent"
                      : "bg-amber-600 border-transparent"
              }
            >
              {perm}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between gap-3 rounded-md bg-gray-800 p-3">
              <div className="space-y-0.5">
                <div className="text-gray-200 font-medium">Notifications</div>
                <div className="text-gray-400">
                  Enable OS push and in-app delivery
                </div>
              </div>
              <Switch
                checked={perm === "granted" && !paused}
                disabled={busy}
                onCheckedChange={(v) =>
                  v ? onEnableNotifications() : onDisableNotifications()
                }
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md bg-gray-800 p-3">
              <div className="flex items-center gap-2">
                <NotificationSoundToggle />
              </div>
            </div>
          </div>

          {status && (
            <div className="rounded-md border border-gray-700 bg-gray-800/60 p-3 text-sm text-gray-200">
              {status}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
