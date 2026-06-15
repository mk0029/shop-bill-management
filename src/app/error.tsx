"use client";

import { useEffect } from "react";
import { logClientError, normalizeUnknownError } from "@/lib/client-error-logger";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const normalized = normalizeUnknownError(error);
    void logClientError({
      source: "next.route-error",
      message: normalized.message,
      stack: normalized.stack,
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <div className="max-w-md rounded-lg border border-gray-800 bg-gray-900 p-6 text-center shadow-xl">
        <h1 className="text-xl font-semibold">Something did not load correctly</h1>
        <p className="mt-3 text-sm text-gray-300">
          We logged the issue for review. Please retry, or continue after refreshing the page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
