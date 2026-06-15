"use client";

import { useEffect } from "react";
import { logClientError, normalizeUnknownError } from "@/lib/client-error-logger";
import { useAuthStore } from "@/store/auth-store";

export default function ClientErrorLogger() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userId =
      (user as { id?: string; _id?: string } | null | undefined)?.id ||
      (user as { id?: string; _id?: string } | null | undefined)?._id ||
      null;

    const handleError = (event: ErrorEvent) => {
      const normalized = normalizeUnknownError(event.error || event.message);
      void logClientError({
        source: "window.error",
        userId,
        message: normalized.message,
        stack: normalized.stack,
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const normalized = normalizeUnknownError(event.reason);
      void logClientError({
        source: "window.unhandledrejection",
        userId,
        message: normalized.message,
        stack: normalized.stack,
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [user]);

  return null;
}
