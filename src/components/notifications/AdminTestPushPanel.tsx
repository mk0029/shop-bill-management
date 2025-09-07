"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import NotificationBroadcastModal from "./NotificationBroadcastModal";

export default function AdminTestPushPanel() {
  // Only composer state is needed now
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="mb-6 p-4 border border-gray-800 rounded-lg bg-gray-900">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-white font-semibold">Test Push Notifications</h2>
          <p className="text-xs text-gray-400">
            Compose a custom push notification for admins, all users, or selected users.
          </p>
        </div>
        <Button size="sm" onClick={() => setComposerOpen(true)}>
          Compose notification
        </Button>
      </div>

      <NotificationBroadcastModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
      />
    </div>
  );
}