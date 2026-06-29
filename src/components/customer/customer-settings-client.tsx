"use client";

import NotificationSoundToggle from "@/components/notifications/notification-sound-toggle";
import { Badge } from "@/components/ui/badge";
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
import ScheduledNotificationPreferences from "@/components/notifications/ScheduledNotificationPreferences";

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
    <div className="space-y-4">
      {/* Notifications card */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="border-b border-white/5 px-4 py-3 sm:px-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Notifications
          </h2>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <p className="text-xs text-slate-400">
            Control push notifications and foreground sound.
          </p>

          {/* Permission row */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-slate-100">Permission</div>
              <div className="text-xs text-slate-400">
                Your current browser permission status
              </div>
            </div>
            <Badge
              className={
                perm === "granted"
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.10)]"
                  : perm === "denied"
                    ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                    : perm === "unsupported"
                      ? "border-white/10 bg-white/[0.04] text-slate-400"
                      : "border-amber-400/30 bg-amber-500/10 text-amber-200"
              }
            >
              {perm}
            </Badge>
          </div>

          {/* Toggle and sound */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-slate-100">Notifications</div>
                <div className="text-xs text-slate-400">
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

            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
              <div className="flex items-center gap-2">
                <NotificationSoundToggle />
              </div>
            </div>
          </div>

          {status && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 text-sm text-slate-200 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                {status}
              </div>
            </div>
          )}

          {/* Scheduled greetings */}
          <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
            <div>
              <div className="text-sm font-medium text-slate-100">
                Scheduled greetings
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                Daily and festival greetings keep notifications healthy and useful.
              </div>
            </div>
            <ScheduledNotificationPreferences role="customer" />
          </div>
        </div>
      </section>
    </div>
  );
}
