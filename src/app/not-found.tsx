"use client";

import EmptyState from "@/components/ui/empty-state";
import AppBackground from "@/components/ui/AppBackground";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-8">
      <AppBackground variant="admin" />
      <div className="relative z-10 w-full max-w-3xl">
        <h1 className="sr-only">404 - Page Not Found | Jambh Electricals</h1>
        <EmptyState
          icon={SearchX}
          eyebrow="404 / Missing route"
          title="This page is not on the board"
          description="The link may be old, moved, or typed incorrectly. Head back to the main app and continue from a valid screen."
          actions={[
            { label: "Go home", href: "/" },
            {
              label: "Go back",
              variant: "secondary",
              onClick: () => window.history.back(),
            },
          ]}
        />
      </div>
    </div>
  );
}
