"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/store/settings-store";

export default function AdminNotificationsSection() {
  const showInAppNotifications = useSettingsStore((s) => s.showInAppNotifications);
  const showNotificationPopover = useSettingsStore((s) => s.showNotificationPopover);
  const playSoundOnNotification = useSettingsStore((s) => s.playSoundOnNotification);
  const setDefaults = useSettingsStore((s) => s.setDefaults);
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Bell className="h-5 w-5" /> Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-300">
        <p>Control in-app notification behavior for admins. These preferences affect popovers and optional sound.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-md bg-gray-800 p-3">
            <div className="space-y-0.5">
              <div className="text-gray-200 font-medium">Show in-app notifications</div>
              <div className="text-gray-400">Display notifications inside the app by default.</div>
            </div>
            <Switch
              checked={!!showInAppNotifications}
              onCheckedChange={(v) => setDefaults({ showInAppNotifications: !!v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md bg-gray-800 p-3">
            <div className="space-y-0.5">
              <div className="text-gray-200 font-medium">Show notification popover</div>
              <div className="text-gray-400">Show a dropdown popover when new notifications arrive.</div>
            </div>
            <Switch
              checked={!!showNotificationPopover}
              onCheckedChange={(v) => setDefaults({ showNotificationPopover: !!v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md bg-gray-800 p-3">
            <div className="space-y-0.5">
              <div className="text-gray-200 font-medium">Play sound on notification</div>
              <div className="text-gray-400">Play a short tone for foreground notifications.</div>
            </div>
            <Switch
              checked={!!playSoundOnNotification}
              onCheckedChange={(v) => setDefaults({ playSoundOnNotification: !!v })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
