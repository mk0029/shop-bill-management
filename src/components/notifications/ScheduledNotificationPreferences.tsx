"use client";

import React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { AppDateTimePicker } from "@/components/ui/app-date-time-picker";

type ScheduledPrefs = {
  dailyGreetingEnabled: boolean;
  festivalGreetingEnabled: boolean;
  adminGreetingsEnabled: boolean;
  customerGreetingsEnabled: boolean;
  pushEnabled: boolean;
  paused: boolean;
  notificationLanguage: string;
  notificationTimezone: string;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
};

const defaults: ScheduledPrefs = {
  dailyGreetingEnabled: true,
  festivalGreetingEnabled: true,
  adminGreetingsEnabled: true,
  customerGreetingsEnabled: true,
  pushEnabled: true,
  paused: false,
  notificationLanguage: "en",
  notificationTimezone: "Asia/Kolkata",
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "07:00",
  },
};

function PreferenceRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-gray-800 p-3">
      <div className="space-y-0.5">
        <div className="text-gray-200 font-medium">{title}</div>
        <div className="text-gray-400">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function ScheduledNotificationPreferences({ role }: { role?: string | null }) {
  const [prefs, setPrefs] = React.useState<ScheduledPrefs>(defaults);
  const [busy, setBusy] = React.useState(false);
  const isAdminRole = role === "admin" || role === "super_admin" || role === "technician";

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications/preferences", { credentials: "include" })
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return;
        setPrefs({
          ...defaults,
          ...json,
          quietHours: { ...defaults.quietHours, ...(json?.quietHours || {}) },
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (next: ScheduledPrefs) => {
    setPrefs(next);
    setBusy(true);
    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = await response.json();
      if (!response.ok || json?.success === false) throw new Error(json?.error || "Failed to save notification preferences");
      setPrefs({
        ...defaults,
        ...json,
        quietHours: { ...defaults.quietHours, ...(json?.quietHours || {}) },
      });
      toast.success("Notification preferences saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save notification preferences");
    } finally {
      setBusy(false);
    }
  };

  const update = (patch: Partial<ScheduledPrefs>) => {
    void save({ ...prefs, ...patch });
  };

  return (
    <div className={`space-y-3 text-sm text-gray-300 ${busy ? "opacity-75" : ""}`}>
      <PreferenceRow
        title="Daily greeting notifications"
        description="Send one Good Morning notification during the morning window."
        checked={prefs.dailyGreetingEnabled}
        onChange={(value) => update({ dailyGreetingEnabled: value })}
      />
      <PreferenceRow
        title="Festival greeting notifications"
        description="Replace the daily greeting with festival wishes on configured Hindu festival dates."
        checked={prefs.festivalGreetingEnabled}
        onChange={(value) => update({ festivalGreetingEnabled: value })}
      />
      {isAdminRole ? (
        <PreferenceRow
          title="Admin greetings"
          description="Allow scheduled greeting notifications for admin and technician accounts."
          checked={prefs.adminGreetingsEnabled}
          onChange={(value) => update({ adminGreetingsEnabled: value })}
        />
      ) : (
        <PreferenceRow
          title="Customer greetings"
          description="Allow scheduled greeting notifications for this customer account."
          checked={prefs.customerGreetingsEnabled}
          onChange={(value) => update({ customerGreetingsEnabled: value })}
        />
      )}
      <PreferenceRow
        title="Pause push notifications"
        description="Temporarily stop scheduled and push notification delivery for this account."
        checked={prefs.paused}
        onChange={(value) => update({ paused: value })}
      />
      <PreferenceRow
        title="Quiet hours"
        description="Do not send scheduled notifications inside the selected time window."
        checked={prefs.quietHours.enabled}
        onChange={(value) => update({ quietHours: { ...prefs.quietHours, enabled: value } })}
      />
      <div className="grid gap-3 rounded-md bg-gray-800 p-3 sm:grid-cols-3">
        <div className="space-y-1">
          <span className="text-gray-300">Quiet start</span>
          <AppDateTimePicker
            mode="time"
            value={prefs.quietHours.start}
            onChange={(v) => update({ quietHours: { ...prefs.quietHours, start: v } })}
            placeholder="Select time"
          />
        </div>
        <div className="space-y-1">
          <span className="text-gray-300">Quiet end</span>
          <AppDateTimePicker
            mode="time"
            value={prefs.quietHours.end}
            onChange={(v) => update({ quietHours: { ...prefs.quietHours, end: v } })}
            placeholder="Select time"
          />
        </div>
        <label className="space-y-1">
          <span className="text-gray-300">Timezone</span>
          <Input
            value={prefs.notificationTimezone}
            onChange={(event) => update({ notificationTimezone: event.target.value || "Asia/Kolkata" })}
            placeholder="Asia/Kolkata"
            className="border-gray-700 bg-gray-900 text-white"
          />
        </label>
      </div>
      <div className="grid gap-3 rounded-md bg-gray-800 p-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-gray-300">Notification language</span>
          <select
            value={prefs.notificationLanguage}
            onChange={(event) => update({ notificationLanguage: event.target.value })}
            className="h-10 w-full rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-white"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </label>
      </div>
    </div>
  );
}
