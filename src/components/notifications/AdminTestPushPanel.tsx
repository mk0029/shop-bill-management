"use client";

import { Button } from "@/components/ui/button";
import NotificationBroadcastModal from "./NotificationBroadcastModal";

export default function AdminTestPushPanel({composerOpen, setComposerOpen}: {composerOpen: boolean, setComposerOpen: (open: boolean) => void}) {
  // Only composer state is needed now

  return (
    <div className="mb-6 p-4 border border-gray-800 rounded-lg bg-gray-900">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-white font-semibold">Send Notifications</h2>
          <p className="text-xs text-gray-400">
          Send notifications to users
          </p>
        </div>
        <Button size="sm" onClick={() => setComposerOpen(true)}>
        Send
        </Button>
      </div>

      <NotificationBroadcastModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
      />
    </div>
  );
}