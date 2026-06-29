"use client";

import React from "react";
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/store/settings-store";
import ScheduledNotificationPreferences from "@/components/notifications/ScheduledNotificationPreferences";
import { useAuthStore } from "@/store/auth-store";

export default function AdminNotificationsSection() {
  const showInAppNotifications = useSettingsStore((s) => s.showInAppNotifications);
  const showNotificationPopover = useSettingsStore((s) => s.showNotificationPopover);
  const playSoundOnNotification = useSettingsStore((s) => s.playSoundOnNotification);
  const pauseIncomingNotifications = useSettingsStore((s) => s.pauseIncomingNotifications);
  const setDefaults = useSettingsStore((s) => s.setDefaults);
  const role = useAuthStore((s) => s.role);
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="border-b border-white/5 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Bell className="h-4 w-4 text-emerald-300/90" /> Notifications
        </h2>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        <p className="text-xs text-slate-400">Control in-app notification behavior for admins. These preferences affect popovers and optional sound.</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-slate-100">Pause incoming notifications</div>
              <div className="text-xs text-slate-400">Temporarily mute all new in-app notifications and popovers.</div>
            </div>
            <Switch
              checked={!!pauseIncomingNotifications}
              onCheckedChange={(v) => setDefaults({ pauseIncomingNotifications: !!v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-slate-100">Show in-app notifications</div>
              <div className="text-xs text-slate-400">Display notifications inside the app by default.</div>
            </div>
            <Switch
              checked={!!showInAppNotifications}
              onCheckedChange={(v) => setDefaults({ showInAppNotifications: !!v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-slate-100">Show notification popover</div>
              <div className="text-xs text-slate-400">Show a dropdown popover when new notifications arrive.</div>
            </div>
            <Switch
              checked={!!showNotificationPopover}
              onCheckedChange={(v) => setDefaults({ showNotificationPopover: !!v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-slate-100">Play sound on notification</div>
              <div className="text-xs text-slate-400">Play a short tone for foreground notifications.</div>
            </div>
            <Switch
              checked={!!playSoundOnNotification}
              onCheckedChange={(v) => setDefaults({ playSoundOnNotification: !!v })}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
            <div>
              <div className="text-sm font-medium text-slate-100">Scheduled greetings</div>
              <div className="mt-0.5 text-xs text-slate-400">Daily and festival greetings keep the FCM channel active without spamming users.</div>
            </div>
            <ScheduledNotificationPreferences role={role} />
          </div>
        </div>
      </div>
    </section>
  );
}
