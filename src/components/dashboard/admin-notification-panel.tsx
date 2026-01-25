"use client";

import { useState } from "react";
import AdminTestPushPanel from "@/components/notifications/AdminTestPushPanel";

export default function AdminNotificationPanel() {
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <AdminTestPushPanel
      composerOpen={composerOpen}
      setComposerOpen={setComposerOpen}
    />
  );
}
