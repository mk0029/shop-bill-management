"use client";

import { Button } from "@/components/ui/button";
import NotificationBroadcastModal from "./NotificationBroadcastModal";
import { useNotificationStore } from "@/store/notification-store";
import { useState } from "react";

export default function AdminTestPushPanel({
  composerOpen,
  setComposerOpen,
}: {
  composerOpen: boolean;
  setComposerOpen: (open: boolean) => void;
}) {
  // Only composer state is needed now
  const add = useNotificationStore((s) => s.add);
  const [presetAudience, setPresetAudience] = useState<
    "admins" | "all" | "users"
  >("admins");

  const addTestNotification = () => {
    add({
      type: "system",
      title: "Test notification",
      body: "This is a local test notification for the admin popover.",
      meta: {
        source: "local-test",
        route: { pathname: "/admin/dashboard" },
      },
    });
  };

  return (
    <div className="mb-6 p-2 sm:p-4 border border-gray-800 rounded-lg bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-sm sm:text-base">
            Send Notifications
          </h2>
          <p className="text-xs text-gray-400">Send notifications to users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={addTestNotification}>
            Test popup
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPresetAudience("admins");
              setComposerOpen(true);
            }}
          >
            Admins
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPresetAudience("all");
              setComposerOpen(true);
            }}
          >
            All users
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setPresetAudience("users");
              setComposerOpen(true);
            }}
          >
            Specific user
          </Button>
        </div>
      </div>

      <NotificationBroadcastModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        initialAudience={presetAudience}
      />
    </div>
  );
}
